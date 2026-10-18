// Domain: is a level definition playable on its map? (feature 005 contracts/level-definition.md,
// feature 006 contracts/level-and-jobs.md). Returns plain-English problems; an empty list means
// the level can be started.
(function (MCW) {
  "use strict";

  var MAX_CREWS = 6;
  var PORTRAITS = ["char_a", "char_b", "char_c"];

  function isTile(v) {
    return Array.isArray(v) && v.length === 2;
  }

  // The level's crews; a feature-005 level (depot + crew.speed) becomes one "general" crew.
  function levelCrews(level) {
    if (level.crews) return level.crews;
    if (!level.depot) return [];
    return [{ id: "crew", job: "general", leader: "", portrait: "char_a", depot: level.depot, speed: level.crew && level.crew.speed }];
  }

  // The footprint {col,row,w,h} an entry targets, or a problem string.
  function footprintOf(entry, kind, map) {
    if (entry.tile) {
      var c = entry.tile[0], r = entry.tile[1];
      if (!map.inBounds(c, r)) return "is outside the map";
      var t = map.terrain[map.index(c, r)];
      if (t !== "road" && t !== "bridge") return "is not on a road or bridge tile";
      return { col: c, row: r, w: 1, h: 1 };
    }
    var o = map.getObject(entry.object);
    if (!o) return "names an unknown object \"" + entry.object + "\"";
    if (!MCW.kindAccepts(kind, o.type)) return "targets \"" + entry.object + "\" (" + o.type + "), which can't have \"" + kind.label + "\"";
    if (!MCW.objectTypes.TYPES[o.type].hasDamaged) return "targets \"" + entry.object + "\", which has no damaged look";
    return { col: o.anchor.col, row: o.anchor.row, w: o.size.w, h: o.size.h };
  }

  // Returns the total storm length in seconds (0 when the phases are unusable).
  function checkPhases(level, problems) {
    var phases = level.phases || [];
    if (phases.length !== 3) {
      problems.push("A level needs exactly 3 phases, found " + phases.length);
      return 0;
    }
    var schedule = level.schedule || [];
    var start = 0, prevPace = -1;
    phases.forEach(function (p, i) {
      var name = "Phase \"" + p.name + "\"";
      if (!(p.durationS > 0)) problems.push(name + " needs a length above 0");
      if (!(p.maxActive >= 1)) problems.push(name + " needs maxActive of at least 1");
      if (i > 0 && p.maxActive < phases[i - 1].maxActive) problems.push(name + " allows fewer active incidents than the phase before");
      if (i > 0 && !(p.rain > phases[i - 1].rain)) problems.push(name + " needs heavier rain than the phase before");
      var end = start + p.durationS;
      var count = schedule.filter(function (e) { return e.at >= start && e.at < end; }).length;
      var pace = count / p.durationS;
      if (pace < prevPace) problems.push(name + " has fewer incidents per second than the phase before");
      prevPace = pace;
      start = end;
    });
    return start;
  }

  function checkCrews(level, map, crews, problems) {
    if (level.crews) {
      if (!Array.isArray(level.crews) || level.crews.length < 1 || level.crews.length > MAX_CREWS) {
        problems.push("A level needs 1 to " + MAX_CREWS + " crews");
      }
    } else if (!level.depot) {
      problems.push("A level needs crews (or the older depot + crew fields)");
    } else if (!level.crew || !(level.crew.speed > 0)) {
      problems.push("crew.speed must be above 0");
    }
    var seen = {};
    crews.forEach(function (c, i) {
      var label = "Crew " + (c.id || i);
      if (seen[c.id]) problems.push(label + " has the same id as another crew");
      seen[c.id] = true;
      var job = MCW.jobs[c.job];
      if (!job || (job.hidden && level.crews)) problems.push(label + " has an unknown job \"" + c.job + "\"");
      if (!isTile(c.depot) || !map.isPassable(c.depot[0], c.depot[1], "vehicle")) problems.push(label + "'s depot must be a road or bridge tile");
      if (PORTRAITS.indexOf(c.portrait) < 0) problems.push(label + " has an unknown portrait \"" + c.portrait + "\"");
    });
  }

  function checkSchedule(level, map, crews, total, problems) {
    var schedule = level.schedule || [];
    schedule.forEach(function (e, i) {
      var label = "Schedule entry " + i;
      if (i > 0 && e.at < schedule[i - 1].at) problems.push(label + " is out of order (sort the schedule by at)");
      if (!(e.at >= 0 && e.at < total)) problems.push(label + " appears at " + e.at + " s, outside the storm (0-" + total + " s)");
      if (e.tutorial && i !== 0) problems.push(label + " is a tutorial incident but is not the first entry");
      var kind = MCW.incidentKinds[e.kind];
      if (!kind) {
        problems.push(label + " has an unknown kind \"" + e.kind + "\"");
        return;
      }
      var hasTile = isTile(e.tile), hasObject = typeof e.object === "string";
      if (hasTile === hasObject) {
        problems.push(label + " needs exactly one of tile / object");
        return;
      }
      if ((kind.targets === "tile") !== hasTile) {
        problems.push(label + " (" + e.kind + ") needs a " + kind.targets + " target");
        return;
      }
      var fp = footprintOf(e, kind, map);
      if (typeof fp === "string") {
        problems.push(label + " " + fp);
        return;
      }
      var best = crews.filter(function (c) { return MCW.matchLevel(c.job, kind.id) === "best" && isTile(c.depot); });
      if (!best.length) {
        problems.push(label + " (" + kind.label + ") has no crew that is Best at it");
        return;
      }
      var goals = MCW.workTiles(map, fp);
      if (!goals.length) {
        problems.push(label + " has no road beside it");
        return;
      }
      var reachable = best.some(function (c) {
        return MCW.findRoute(map, { col: c.depot[0], row: c.depot[1] }, goals) !== null;
      });
      if (!reachable) problems.push(label + " cannot be reached by road from any Best crew's depot");
    });
  }

  function checkLevel(level, map) {
    var problems = [];
    var crews = levelCrews(level);
    checkCrews(level, map, crews, problems);
    var total = checkPhases(level, problems);
    checkSchedule(level, map, crews, total, problems);
    var n = (level.schedule || []).length;
    if (!(level.target >= 1 && level.target <= n)) problems.push("The target must be between 1 and " + n + " repairs");
    if (!level.stars || !(level.stars[0] <= level.stars[1])) problems.push("Star thresholds must be [two, three] with two <= three");
    if (!level.refill || !(level.refill.early >= level.refill.normal)) problems.push("refill.early must be at least refill.normal");
    if (level.warnScale !== undefined && !(level.warnScale > 0)) problems.push("warnScale must be above 0");
    if (level.rightCrewBonus !== undefined && !(level.rightCrewBonus >= 0)) problems.push("rightCrewBonus must be 0 or more");
    return problems;
  }

  MCW.checkLevel = checkLevel;
  MCW.levelCrews = levelCrews;
})(window.MCW);
