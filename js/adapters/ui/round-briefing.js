// Adapter: preparation and read-only round capabilities. Rule values come from LevelRun.
(function (MCW) {
  "use strict";
  var MATCH = { best: "Best", help: "Can help", none: "Can't fix" };
  function el(tag, text, cls) {
    var node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  }
  function number(n) { return String(Math.round(n * 10000) / 10000); }
  function time(n) { return Math.floor(n / 60) + ":" + (n % 60 < 10 ? "0" : "") + number(n % 60); }
  function coord(p) { return "col " + p.col + ", row " + p.row + " (zero-based)"; }
  function table(headers, caption) {
    var t = el("table", undefined, "briefing-table");
    t.appendChild(el("caption", caption));
    var row = t.createTHead().insertRow();
    headers.forEach(function (h) { var th = el("th", h); th.scope = "col"; row.appendChild(th); });
    t.createTBody();
    return t;
  }
  function image(src, alt, cls) { var img = el("img", undefined, cls); img.src = src; img.alt = alt; return img; }

  function RoundBriefingUI(game, run, io) {
    this.game = game;
    this.run = run;
    this.io = io;
    this.crewRoot = document.getElementById("briefing-crews-content");
    this.problemRoot = document.getElementById("briefing-problems-content");
    this.referenceLayer = document.getElementById("round-reference-layer");
    this.referenceContent = document.getElementById("reference-content");
    this.opener = null;
    var self = this;
    run.on("prepare", function (briefing) {
      self.renderCrews(self.crewRoot, briefing);
      self.renderProblems(self.problemRoot, briefing);
      self.crewRoot.scrollTop = self.problemRoot.scrollTop = 0;
    });
    run.on("reference", function (section) { self.showReference(section); });
    document.getElementById("btn-reference-crews").addEventListener("click", function () { run.openReference("crews"); });
    document.getElementById("btn-reference-problems").addEventListener("click", function () { run.openReference("problems"); });
    document.getElementById("btn-reference-close").addEventListener("click", function () { run.closeReference(); });
    document.getElementById("btn-reference-pause").addEventListener("click", function () { game.screens.pause(); });
    window.addEventListener("keydown", function (e) { self.referenceKey(e); }, true);
    window.addEventListener("resize", function () { self.positionReference(); });
  }
  var P = RoundBriefingUI.prototype;
  P.positionReference = function () {
    if (this.referenceLayer.hidden) return;
    var bar = this.game.hud.root.querySelector(".hud-bar");
    this.referenceLayer.style.top = Math.ceil(bar.offsetTop + bar.offsetHeight + 8) + "px";
    document.getElementById("round-reference").classList.toggle("briefing-compact", this.referenceLayer.clientHeight < 460);
  };
  P.showReference = function (section) {
    if (!section) {
      this.referenceLayer.hidden = true;
      this.game.hud.root.inert = false;
      if (this.game.screens.state === "playing" && this.opener && this.opener.isConnected) this.opener.focus();
      this.opener = null;
      return;
    }
    var first = this.referenceLayer.hidden;
    if (first) this.opener = document.activeElement;
    this.referenceLayer.hidden = false;
    this.game.hud.root.inert = true;
    document.getElementById("reference-title").textContent = section === "crews" ? "Crew capabilities" : "Complete problem schedule";
    if (section === "crews") this.renderCrews(this.referenceContent, this.run.briefing);
    else this.renderProblems(this.referenceContent, this.run.briefing);
    this.referenceContent.scrollTop = this.referenceContent.scrollLeft = 0;
    document.getElementById("btn-reference-crews").setAttribute("aria-pressed", String(section === "crews"));
    document.getElementById("btn-reference-problems").setAttribute("aria-pressed", String(section === "problems"));
    this.positionReference();
    if (first) document.getElementById("btn-reference-close").focus();
  };
  P.referenceKey = function (e) {
    if (!this.run.referenceSection) return;
    if (e.key === "Escape") {
      e.preventDefault(); e.stopImmediatePropagation(); this.run.closeReference(); return;
    }
    if (e.key === "Tab") {
      var stops = Array.prototype.slice.call(this.referenceLayer.querySelectorAll("button, [tabindex='0']"));
      var index = stops.indexOf(document.activeElement), next = (index + (e.shiftKey ? -1 : 1) + stops.length) % stops.length;
      e.preventDefault(); e.stopImmediatePropagation(); stops[next].focus(); return;
    }
    // Let native focused controls activate/scroll, but never pass these keys to game listeners.
    e.stopImmediatePropagation();
  };
  P.renderCrews = function (root, briefing) {
    root.textContent = "";
    root.appendChild(el("p", briefing.name + " - " + briefing.crews.length + " crews. Compare capabilities before choosing who to send."));
    var cards = el("div", undefined, "briefing-roster"), self = this;
    briefing.crews.forEach(function (crew) {
      var card = el("article", undefined, "briefing-crew");
      var head = el("div", undefined, "briefing-crew-head");
      head.appendChild(image(self.io.imageSrc(MCW.jobArt.portraitFor(crew.portrait)), "", "briefing-portrait"));
      var title = el("div");
      title.appendChild(el("h3", crew.jobName));
      title.appendChild(el("p", crew.leader || "Repair team"));
      head.appendChild(title);
      head.appendChild(image(self.io.imageSrc(MCW.jobArt.vehicleFor(crew.jobId, "SE")), MCW.jobArt.vehicleName(crew.jobId), "briefing-vehicle"));
      card.appendChild(head);
      card.appendChild(el("p", "Vehicle: " + MCW.jobArt.vehicleName(crew.jobId) + " / Speed: " + number(crew.speedTilesPerS) + " tiles/second"));
      card.appendChild(el("p", "Depot: " + coord(crew.depot), "briefing-detail"));
      card.appendChild(el("p", crew.advantage.text || "Repairs every damage kind", "briefing-advantage"));
      var matches = table(["Damage", "Match", "Repair time"], crew.jobName + " capabilities");
      crew.matches.forEach(function (match) {
        var kind = briefing.kinds.filter(function (k) { return k.id === match.kindId; })[0];
        var row = matches.tBodies[0].insertRow();
        row.insertCell().textContent = kind.label;
        row.insertCell().appendChild(el("span", MATCH[match.match], "briefing-match match-" + match.match));
        row.insertCell().textContent = match.repairS === null ? "Can't fix" : number(match.repairS) + " s";
      });
      card.appendChild(matches); cards.appendChild(card);
    });
    root.appendChild(cards);
    root.appendChild(el("p", "Repair times include crew advantages and the Can help slowdown. Travel time is additional and depends on the route.", "briefing-detail"));
  };
  P.renderProblems = function (root, briefing) {
    root.textContent = "";
    root.appendChild(el("p", briefing.totalIncidents + " problems / " + time(briefing.durationS) + " storm / Repair " + briefing.target + " to win", "briefing-summary"));
    root.appendChild(el("p", briefing.phases.map(function (p) { return p.name + " " + p.durationS + " s"; }).join(" / ")));
    root.appendChild(el("p", "Reach the repair target to secure a win. Keep playing for a higher score until the storm ends or city condition reaches zero. Before the target, city condition reaching zero or the storm ending means a loss.", "briefing-detail"));
    root.appendChild(el("p", "Planned times are measured from round start. Problems become active gradually; active-incident limits or an occupied target can delay release, including later problems waiting in the queue. Warning time starts at actual release. The tutorial problem is protected until its first dispatch, when its warning clock starts.", "briefing-detail"));
    var schedule = table(["#", "Problem / Location", "Planned time / Phase", "Warning", "Compatible crews"], "Complete planned workload - future problems are not yet dispatchable");
    schedule.classList.add("briefing-schedule");
    briefing.problems.forEach(function (problem) {
      var kind = briefing.kinds.filter(function (k) { return k.id === problem.kindId; })[0];
      var target = problem.target, row = schedule.tBodies[0].insertRow();
      row.insertCell().textContent = problem.sequence;
      var where = row.insertCell(); where.appendChild(el("strong", kind.label));
      var label = target.tile ? "Road: " + coord(target.tile) : target.objectType.replace(/_/g, " ") + " / " + target.objectId + " / " + coord(target.anchor);
      where.appendChild(el("div", label, "briefing-detail"));
      row.insertCell().textContent = time(problem.plannedAtS) + " / " + briefing.phases[problem.phaseIndex].name;
      row.insertCell().textContent = number(problem.warningS) + " s" + (problem.tutorial ? " (after first dispatch)" : " (after release)");
      var compatible = row.insertCell();
      problem.compatibleCrews.forEach(function (match) {
        var crew = briefing.crews.filter(function (c) { return c.id === match.crewId; })[0];
        compatible.appendChild(el("div", crew.jobName + " - " + MATCH[match.match], "match-" + match.match));
      });
    });
    root.appendChild(schedule);
  };
  MCW.RoundBriefingUI = RoundBriefingUI;
})(window.MCW);
