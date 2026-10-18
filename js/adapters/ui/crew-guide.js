// Adapter: the Crew guide inside How to Play — one row per job with its vehicle, what it is
// Best at, what it can help with and its advantage, built from MCW.jobs (feature 006 FR-015).
(function (MCW) {
  "use strict";

  function kindsWhere(job, level) {
    return Object.keys(MCW.incidentKinds).filter(function (k) { return job.match[k] === level; })
      .map(function (k) { return MCW.incidentKinds[k].label; });
  }

  function CrewGuide(root) {
    var table = document.createElement("table");
    table.className = "crew-guide";
    var head = table.createTHead().insertRow();
    ["Crew", "Vehicle", "Best at", "Can help with", "Advantage"].forEach(function (t) {
      var th = document.createElement("th");
      th.textContent = t;
      head.appendChild(th);
    });
    var body = table.createTBody();
    Object.keys(MCW.jobs).forEach(function (id) {
      var job = MCW.jobs[id];
      if (job.hidden) return;
      var row = body.insertRow();
      [
        MCW.jobArt.icon(id) + " " + job.name,
        MCW.jobArt.vehicleName(id),
        kindsWhere(job, "best").join(", ") || "—",
        kindsWhere(job, "help").join(", ") || "—",
        job.advantage.text
      ].forEach(function (text) { row.insertCell().textContent = text; });
    });
    root.textContent = "";
    root.appendChild(table);
  }

  MCW.CrewGuide = CrewGuide;
})(window.MCW);
