// Domain: crew jobs — what each job is Best at, can help with or can't fix, and its advantage
// (feature 006 contracts/level-and-jobs.md). Rebalance by editing this table.
// Vehicles, icons and portraits live in js/adapters/art/job-art.js.
(function (MCW) {
  "use strict";

  var HELP_SLOWDOWN = 2; // a "Can help" crew takes twice the base repair time (spec FR-012)

  function job(def) {
    def.match = Object.freeze(def.match);
    def.advantage = Object.freeze(def.advantage);
    return Object.freeze(def);
  }

  MCW.jobs = {
    road: job({
      id: "road", name: "Road Crew", speed: 4.0,
      match: { road: "best" },
      advantage: { type: "speed", factor: 1, text: "Fastest vehicle" }
    }),
    builders: job({
      id: "builders", name: "Builders", speed: 2.5,
      match: { building: "best", road: "help" },
      advantage: { type: "points", kind: "building", factor: 1.5, text: "+50% points on roofs" }
    }),
    electric: job({
      id: "electric", name: "Electricians", speed: 3.5,
      match: { streetlight: "best", building: "help", pump: "help" },
      advantage: { type: "repair", kind: "streetlight", factor: 0.6, text: "Fast streetlight repairs" }
    }),
    drainage: job({
      id: "drainage", name: "Drainage Team", speed: 3.0,
      match: { pump: "best", road: "help" },
      advantage: { type: "repair", kind: "pump", factor: 0.7, text: "Fast pump repairs" }
    }),
    // Legacy one-crew levels (feature 005 format): fixes everything, never shown to players.
    general: job({
      id: "general", name: "Repair Crew", speed: 3, hidden: true,
      match: { road: "best", building: "best", streetlight: "best", pump: "best" },
      advantage: { type: "speed", factor: 1, text: "" }
    })
  };

  // "best" | "help" | "none"
  MCW.matchLevel = function (jobId, kindId) {
    var j = MCW.jobs[jobId];
    return (j && j.match[kindId]) || "none";
  };

  function hasAdvantage(job, type, kind, match) {
    return match === "best" && job.advantage.type === type && job.advantage.kind === kind.id;
  }

  MCW.repairSeconds = function (job, kind, match) {
    if (match === "help") return kind.repairS * HELP_SLOWDOWN;
    return kind.repairS * (hasAdvantage(job, "repair", kind, match) ? job.advantage.factor : 1);
  };

  // Points for a repair, before the early-repair bonus.
  MCW.repairPoints = function (job, kind, match, level) {
    var points = kind.points * (hasAdvantage(job, "points", kind, match) ? job.advantage.factor : 1);
    if (match === "best") points += (level && level.rightCrewBonus) || 0;
    return Math.round(points);
  };
})(window.MCW);
