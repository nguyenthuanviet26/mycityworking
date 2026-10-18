// Application: read-only preparation data. Uses the same domain rules as Round.
(function (MCW) {
  "use strict";
  MCW.buildRoundBriefing = function (level, map) {
    var start = 0;
    var phases = level.phases.map(function (p, index) {
      var value = { index: index, name: p.name, startS: start, endS: start + p.durationS, durationS: p.durationS, maxActive: p.maxActive };
      start = value.endS;
      return value;
    });
    var kindIds = [];
    level.schedule.forEach(function (e) { if (kindIds.indexOf(e.kind) < 0) kindIds.push(e.kind); });
    var kinds = kindIds.map(function (id) {
      var k = MCW.incidentKinds[id];
      return { id: id, label: k.label, baseRepairS: k.repairS, warningS: k.warnS * (level.warnScale || 1) };
    });
    var crews = MCW.levelCrews(level).map(function (c) {
      var job = MCW.jobs[c.job];
      return { id: c.id, jobId: c.job, jobName: job.name, leader: c.leader, portrait: c.portrait,
        depot: { col: c.depot[0], row: c.depot[1] }, speedTilesPerS: c.speed || job.speed,
        advantage: Object.assign({}, job.advantage),
        matches: kindIds.map(function (id) {
          var match = MCW.matchLevel(c.job, id);
          return { kindId: id, match: match, repairS: match === "none" ? null : MCW.repairSeconds(job, MCW.incidentKinds[id], match) };
        }) };
    });
    var problems = level.schedule.map(function (e, index) {
      var target;
      if (e.tile) target = { tile: { col: e.tile[0], row: e.tile[1] } };
      else {
        var object = map.getObject(e.object);
        target = { objectId: e.object, objectType: object.type, anchor: { col: object.anchor.col, row: object.anchor.row } };
      }
      var phase = 0;
      while (phase < phases.length - 1 && e.at >= phases[phase].endS) phase++;
      return { id: "inc-" + index, sequence: index + 1, kindId: e.kind, target: target, plannedAtS: e.at,
        phaseIndex: phase, warningS: MCW.incidentKinds[e.kind].warnS * (level.warnScale || 1), tutorial: !!e.tutorial,
        compatibleCrews: crews.filter(function (c) { return MCW.matchLevel(c.jobId, e.kind) !== "none"; }).map(function (c) {
          return { crewId: c.id, match: MCW.matchLevel(c.jobId, e.kind) };
        }) };
    });
    return { levelId: level.id, name: level.name, durationS: start, target: level.target, totalIncidents: problems.length,
      phases: phases, kinds: kinds, crews: crews, problems: problems };
  };
})(window.MCW);
