
describe("round briefing", function () {
  function fixture() {
    var map = MCW.parseMap({ terrain: Array(8).fill("rrrrrrrrrrrr").join("\n"), objects: [{type: "clinic_a", at: [1,1], id: "clinic"}, {type:"lightpole_a",at:[9,1],id:"light"}, {type:"water_a",at:[5,1],id:"pump"}] }).map;
    return {map: map, level: {
      id: "t", name: "Test", target: 2, warnScale: 0.7,
      crews: [{id:"road", job:"road", leader:"Minh", portrait:"char_a", depot:[0,0], speed:5}, {id:"electric", job:"electric", leader:"Linh", portrait:"char_c", depot:[1,0]}, {id:"drainage", job:"drainage", leader:"Tuan", portrait:"char_a", depot:[2,0]}, {id:"builders",job:"builders",leader:"Hoa",portrait:"char_b",depot:[3,0]}],
      phases: [{name:"Drizzle",durationS:10,maxActive:3,rain:.4},{name:"Downpour",durationS:10,maxActive:4,rain:.7},{name:"Peak",durationS:10,maxActive:6,rain:1}],
      schedule: [{at:1,kind:"road",tile:[2,2],tutorial:true},{at:10,kind:"building",object:"clinic"},{at:10,kind:"road",tile:[2,2]},{at:20,kind:"streetlight",object:"light"},{at:21,kind:"pump",object:"pump"}]
    }};
  }
  it("copies all roster and occurrence records with effective values", function () {
    var f=fixture(), before=JSON.stringify(f.level), b=MCW.buildRoundBriefing(f.level,f.map);
    assertEqual(b.totalIncidents,5); assertEqual(b.durationS,30); assertEqual(b.target,2);
    assertEqual(b.crews.map(function(c){return c.id;}),["road","electric","drainage","builders"]);
    assertEqual(b.crews[0].speedTilesPerS,5); assertEqual(b.crews[1].speedTilesPerS,3.5);
    assertEqual(b.kinds.map(function(k){return k.id;}),["road","building","streetlight","pump"]);
    assertEqual(b.problems.map(function(p){return p.id;}),["inc-0","inc-1","inc-2","inc-3","inc-4"]);
    assertEqual(b.problems.map(function(p){return p.phaseIndex;}),[0,1,1,2,2]);
    assertEqual(b.problems[0].tutorial,true); assertEqual(b.problems[2].target,b.problems[0].target);
    assertClose(b.problems[0].warningS,17.5); assertEqual(b.problems[1].target.objectId,"clinic");
    assertEqual(JSON.stringify(f.level),before); assertEqual(f.map.getTile(2,2).variant,"normal");
    b.crews[0].depot.col=9; b.crews[0].advantage.text="changed"; b.problems[0].target.tile.col=9;
    assertEqual(f.level.crews[0].depot,[0,0]); assertEqual(f.level.schedule[0].tile,[2,2]); assertTrue(MCW.jobs.road.advantage.text!=="changed");
  });
  it("uses domain repair rules and explicit incompatibility", function () {
    var f=fixture(), b=MCW.buildRoundBriefing(f.level,f.map);
    function match(c,k){return b.crews[c].matches.filter(function(m){return m.kindId===k;})[0];}
    assertEqual(match(0,"pump").repairS,null); assertEqual(match(0,"pump").match,"none");
    assertClose(match(1,"streetlight").repairS,1.8); assertClose(match(2,"pump").repairS,4.9);
    assertEqual(match(2,"road").repairS,8); assertEqual(b.problems[1].compatibleCrews,[{crewId:"electric",match:"help"},{crewId:"builders",match:"best"}]);
    assertClose(b.kinds[3].warningS,23.8);
  });
  it("supports a legacy level without leaking source references", function () {
    var f=fixture(); delete f.level.crews; f.level.depot=[0,0]; f.level.crew={speed:9};
    var b=MCW.buildRoundBriefing(f.level,f.map); assertEqual(b.crews.length,1); assertEqual(b.crews[0].jobId,"general"); assertEqual(b.crews[0].speedTilesPerS,9);
    assertTrue(b.crews[0].matches.every(function(m){return m.match==="best";}));
  });
});
