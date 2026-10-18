// Adapter: the trial level's HUD in the DOM — top bar (phase, timer, goal, count, score, city
// condition), banners, the incident panel with its crew list, the crew bar, toasts, the hint
// bubble and the level's keys (feature 005 contracts/play-ui.md, feature 006
// contracts/play-ui.md). Reads state from LevelRun; acts only through run.select /
// pickCrew / arm / sendCrew / skipHints, the screen machine and the camera.
(function (MCW) {
  "use strict";

  var BANNER_MS = 2200, TOAST_MS = 1500, HINT_GAP = 14;
  var BADGES = { best: "BEST", help: "CAN HELP · 2× slower", none: "CAN'T FIX" };

  var HTML =
    '<div class="hud-bar">' +
    '  <div class="hud-cell hud-phase"><span class="hud-phase-name"></span> <span class="hud-timer"></span></div>' +
    '  <div class="hud-cell hud-goal"><span class="hud-goal-text"></span> <span class="hud-count"></span></div>' +
    '  <div class="hud-cell hud-score"><span class="hud-score-value">0</span> pts<span class="hud-score-pop"></span></div>' +
    '  <div class="hud-cell hud-meter" role="meter" aria-label="City condition" aria-valuemin="0" aria-valuemax="100">' +
    '    <span class="hud-meter-label">City condition</span>' +
    '    <span class="hud-meter-bar"><span class="hud-meter-fill"></span></span>' +
    '    <span class="hud-meter-pct"></span><span class="hud-meter-pop"></span>' +
    '  </div>' +
    '</div>' +
    '<div class="hud-reference-buttons"><button type="button" class="hud-btn hud-stats" title="Crew stats (R)">Crew stats</button><button type="button" class="hud-btn hud-schedule" title="Problem schedule (O)">Problem schedule</button></div>' +
    '<div class="hud-banner" hidden></div>' +
    '<div class="hud-panel" hidden>' +
    '  <div class="hud-panel-head"><span class="hud-panel-title"></span><span class="hud-panel-tag"></span></div>' +
    '  <div class="hud-panel-best" hidden></div>' +
    '  <div class="hud-rows" role="listbox" aria-label="Crews"></div>' +
    '  <div class="hud-panel-buttons">' +
    '    <button type="button" class="hud-btn hud-send"></button>' +
    '    <button type="button" class="hud-btn hud-goto">Go to</button>' +
    '  </div>' +
    '</div>' +
    '<div class="hud-crews">' +
    '  <div class="hud-crews-hint" hidden></div>' +
    '  <div class="hud-crew-cards"></div>' +
    '  <button type="button" class="hud-btn hud-guide" title="Crew guide" aria-label="Crew guide">?</button>' +
    '</div>' +
    '<div class="hud-toast" hidden></div>' +
    '<div class="hud-hint" hidden>' +
    '  <p class="hud-hint-text"></p>' +
    '  <button type="button" class="hud-hint-skip">Skip hints</button>' +
    '</div>';

  function fmtTime(s) {
    s = Math.max(0, Math.ceil(s));
    var m = Math.floor(s / 60), r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function crewName(crew) {
    return MCW.jobs[crew.jobId].name + (crew.leader ? " — " + crew.leader : "");
  }

  // io: { imageSrc(path) } for the leaders' portraits (images are loaded by infrastructure).
  function HUD(game, run, root, io) {
    this.game = game;
    this.run = run;
    this.root = root;
    this.io = io || {};
    root.innerHTML = HTML;
    var q = function (sel) { return root.querySelector(sel); };
    this.el = {
      phase: q(".hud-phase-name"), timer: q(".hud-timer"), goal: q(".hud-goal-text"), count: q(".hud-count"),
      score: q(".hud-score-value"), scorePop: q(".hud-score-pop"), meter: q(".hud-meter"),
      fill: q(".hud-meter-fill"), pct: q(".hud-meter-pct"), meterPop: q(".hud-meter-pop"),
      banner: q(".hud-banner"), panel: q(".hud-panel"), title: q(".hud-panel-title"), tag: q(".hud-panel-tag"),
      best: q(".hud-panel-best"), rows: q(".hud-rows"), send: q(".hud-send"), goto: q(".hud-goto"),
      crews: q(".hud-crews"), crewsHint: q(".hud-crews-hint"), cards: q(".hud-crew-cards"), guide: q(".hud-guide"),
      toast: q(".hud-toast"), hint: q(".hud-hint"), hintText: q(".hud-hint-text"), skip: q(".hud-hint-skip")
    };
    this._shown = {};
    this._banners = [];
    this._bannerMs = 0;
    this._cards = [];
    this._rowsSig = "";
    this._toastTimer = null;
    var self = this, el = this.el;

    q(".hud-stats").addEventListener("click", function () { run.openReference("crews"); });
    q(".hud-schedule").addEventListener("click", function () { run.openReference("problems"); });
    el.send.addEventListener("click", function () { run.sendCrew(); });
    el.goto.addEventListener("click", function () { self._goTo(); });
    el.skip.addEventListener("click", function () { run.skipHints(); });
    el.guide.addEventListener("click", function () {
      game.screens.pause();
      game.screens.openHowto();
    });
    el.rows.addEventListener("click", function (e) {
      var row = e.target.closest(".hud-row");
      if (row) run.pickCrew(row.getAttribute("data-crew"));
    });

    run.on("start", function (round) {
      self._banners.length = 0;
      self._bannerMs = 0;
      self._banner(round.phase().name + " — Repair " + run.level.target + " incidents before the storm ends");
      self._buildCards(round);
    });
    run.on("phase", function (p) { self._banner(p.name + "!"); });
    run.on("goal", function () { self._banner("Goal reached!"); });
    run.on("cleared", function () { self._banner("Storm cleared"); });
    run.on("refused", function (p) { self._toast(p.message); });
    run.on("repaired", function (p) {
      self._pop(el.scorePop, "+" + p.points + (p.rightCrew ? " · Right crew!" : ""));
      self._pop(el.meterPop, "+" + p.refill + "%");
    });

    // Capture phase, so Esc closes the panel before the menu pauses the game.
    window.addEventListener("keydown", function (e) { self._onKey(e); }, true);
  }

  var P = HUD.prototype;

  P._playing = function () {
    return this.game.screens.state === "playing" && !!this.run.round;
  };

  P._onKey = function (e) {
    if (!this._playing() || this.run.referenceSection || e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.target.closest && e.target.closest("button") && (e.key === "Enter" || e.key === " " || e.key === "Tab")) return;
    if (e.code === "KeyR" || e.code === "KeyO") {
      e.preventDefault(); e.stopImmediatePropagation();
      this.run.openReference(e.code === "KeyR" ? "crews" : "problems");
      return;
    }
    var run = this.run, n = /^Digit([1-9])$/.exec(e.code);
    if (e.key === "Escape" && (run.selected || run.armedCrew)) {
      run.select(null); // also disarms
    } else if (n && run.round.crews[+n[1] - 1]) {
      if (run.selected) run.pickIndex(+n[1]);
      else if (!run.armIndex(+n[1])) this._toast("Busy repairing");
    } else if ((e.key === "Enter" || e.key === " ") && run.selected) {
      if (!this.el.send.disabled) run.sendCrew();
    } else if (e.key === "Tab" && !e.shiftKey && run.selected) {
      run.selectNext();
    } else if (e.code === "KeyC" && !(this.game.debug && this.game.debug.on)) {
      this._glideTo(this._focusCrew());
    } else {
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
  };

  // The crew the player is most likely thinking about.
  P._focusCrew = function () {
    var round = this.run.round;
    return round.crewById(this.run.armedCrew) || round.crewById(this.run.pickedCrew) || round.crews[0];
  };

  P._glideTo = function (crew) {
    if (crew) this.game.camera.centerOn(crew.x, crew.y, { smooth: true });
  };

  P._goTo = function () {
    var inc = this.run.selected && this.run.round.incident(this.run.selected);
    if (inc) this.game.camera.centerOn(inc.centre.x, inc.centre.y, { smooth: true });
  };

  P._banner = function (text) {
    this._banners.push(text);
  };

  P._toast = function (text) {
    var t = this.el.toast;
    t.textContent = text;
    t.hidden = false;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(function () { t.hidden = true; }, TOAST_MS);
  };

  P._pop = function (span, text) {
    span.textContent = text;
    span.classList.remove("show");
    void span.offsetWidth; // restart the CSS animation
    span.classList.add("show");
  };

  // Writes text only when it changed (keeps per-frame DOM work small).
  P._set = function (key, node, text) {
    if (this._shown[key] === text) return;
    this._shown[key] = text;
    node.textContent = text;
  };

  // ---- crew bar ---------------------------------------------------------------

  P._buildCards = function (round) {
    var self = this, run = this.run, cards = this.el.cards;
    cards.textContent = "";
    this._cards = round.crews.map(function (crew, i) {
      var card = document.createElement("div");
      card.className = "hud-crew";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "-1");
      card.title = "Click, then click an incident, to send " + MCW.jobs[crew.jobId].name + ". Double-click to find.";
      var img = document.createElement("img");
      img.className = "hud-crew-face";
      img.alt = "";
      if (self.io.imageSrc) img.src = self.io.imageSrc(MCW.jobArt.portraitFor(crew.portrait));
      var text = document.createElement("span");
      text.className = "hud-crew-text";
      text.innerHTML = '<span class="hud-crew-name"></span><span class="hud-crew-status"></span>';
      text.firstChild.textContent = (i + 1) + "  " + MCW.jobArt.icon(crew.jobId) + " " + crewName(crew);
      var find = document.createElement("button");
      find.type = "button";
      find.className = "hud-crew-find";
      find.textContent = "⌖";
      find.setAttribute("aria-label", "Find " + MCW.jobs[crew.jobId].name);
      find.addEventListener("click", function (e) {
        e.stopPropagation();
        self._glideTo(crew);
      });
      card.appendChild(img);
      card.appendChild(text);
      card.appendChild(find);
      card.addEventListener("click", function () {
        if (!run.arm(crew.id)) self._toast("Busy repairing");
      });
      card.addEventListener("dblclick", function () { self._glideTo(crew); });
      cards.appendChild(card);
      return { crew: crew, card: card, status: text.lastChild };
    });
  };

  P._updateCards = function (round) {
    var run = this.run;
    for (var i = 0; i < this._cards.length; i++) {
      var c = this._cards[i], crew = c.crew, st = crew.status();
      if (st === "repairing") st += " · free in " + Math.ceil(round.secondsUntilFree(crew.id) || 0) + "s";
      this._set("card" + i, c.status, st);
      c.card.classList.toggle("armed", run.armedCrew === crew.id);
      c.card.classList.toggle("busy", crew.state === "repairing");
    }
    var armed = round.crewById(run.armedCrew);
    this.el.crewsHint.hidden = !armed;
    if (armed) this._set("armedHint", this.el.crewsHint, "Click an incident for " + MCW.jobs[armed.jobId].name + " (Esc to cancel)");
  };

  // ---- update -------------------------------------------------------------------

  // Called every frame by the composition root; never needs a canvas redraw.
  P.update = function (dtMs) {
    var run = this.run, round = run.round, s = this.game.screens.state;
    var visible = !!round && (s === "playing" || s === "paused" || (s === "howto" && this.game.screens.returnTo === "paused"));
    this.root.hidden = !visible;
    if (!visible) {
      this.el.hint.hidden = true;
      return false;
    }
    this._updateBar(round);
    this._updateBanner(dtMs);
    this._updateCards(round);
    this._updatePanel(round);
    this._updateHint(round);
    return false;
  };

  P._updateBar = function (round) {
    var el = this.el, lvl = this.run.level;
    this._set("phase", el.phase, round.phase().name);
    this._set("timer", el.timer, fmtTime(round.remaining()));
    this._set("goal", el.goal, round.goalReached ? "Goal reached! Keep repairing for a higher score"
      : "Repair " + lvl.target + " incidents before the storm ends");
    this._set("count", el.count, round.repaired + " / " + lvl.target + (round.goalReached ? " ✓" : ""));
    this._set("score", el.score, String(round.score));
    var pct = Math.round(round.condition);
    if (this._shown.pct !== pct) {
      this._shown.pct = pct;
      el.pct.textContent = pct + "%";
      el.fill.style.width = round.condition + "%";
      el.meter.setAttribute("aria-valuenow", pct);
      el.meter.classList.toggle("low", pct < 50 && pct >= 25);
      el.meter.classList.toggle("critical", pct < 25);
    }
  };

  P._updateBanner = function (dtMs) {
    var b = this.el.banner;
    if (this._bannerMs > 0) {
      this._bannerMs -= dtMs;
      if (this._bannerMs > 0) return;
      b.hidden = true;
    }
    if (!this._banners.length) return;
    b.textContent = this._banners.shift();
    b.hidden = false;
    this._bannerMs = BANNER_MS;
  };

  // ---- incident panel ---------------------------------------------------------

  P._rowStatus = function (o) {
    if (o.reason === "Already on the way") return "on the way";
    if (o.status === "repairing") return "busy · free in " + Math.ceil(o.freeInS || 0) + "s";
    if (o.match === "none") return "";
    if (o.etaS === null) return "no road there";
    return "arrives " + Math.ceil(o.etaS) + "s · repair " + Math.round(o.repairS * 10) / 10 + "s";
  };

  P._renderRows = function (round) {
    var self = this, run = this.run, options = run.options;
    var sig = run.pickedCrew + "|" + options.map(function (o) {
      return o.crewId + o.match + o.sendable + self._rowStatus(o);
    }).join("|");
    if (sig === this._rowsSig) return;
    this._rowsSig = sig;
    var rows = this.el.rows;
    rows.textContent = "";
    options.forEach(function (o, i) {
      var crew = round.crewById(o.crewId);
      var row = document.createElement("div");
      row.className = "hud-row" + (o.crewId === run.pickedCrew ? " picked" : "") + (o.sendable ? "" : " unavailable");
      row.setAttribute("data-crew", o.crewId);
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(o.crewId === run.pickedCrew));
      var name = document.createElement("span");
      name.className = "hud-row-name";
      name.textContent = (i + 1) + " " + MCW.jobArt.icon(crew.jobId) + " " + crewName(crew);
      var badge = document.createElement("span");
      badge.className = "hud-badge " + o.match;
      badge.textContent = BADGES[o.match];
      var status = document.createElement("span");
      status.className = "hud-row-status";
      status.textContent = self._rowStatus(o);
      row.appendChild(name);
      row.appendChild(badge);
      row.appendChild(status);
      rows.appendChild(row);
    });
  };

  P._updatePanel = function (round) {
    var el = this.el, run = this.run, inc = run.selected ? round.incident(run.selected) : null;
    el.panel.hidden = !inc;
    if (!inc) {
      this._rowsSig = "";
      return;
    }
    this._set("title", el.title, MCW.jobArt.kindGlyph(inc.kind.id) + " " + inc.kind.label);
    this._set("tag", el.tag, inc.urgent ? "URGENT" : "");
    el.panel.classList.toggle("urgent", inc.urgent);
    this._renderRows(round);

    // "Best crew free in Ns" when every Best crew is busy repairing (FR-011).
    var best = run.options.filter(function (o) { return o.match === "best"; });
    var busy = best.length && !best.some(function (o) { return o.sendable; }) &&
      best.filter(function (o) { return o.freeInS !== null; })[0];
    el.best.hidden = !busy;
    if (busy) {
      this._set("best", el.best, "Best crew (" + MCW.jobs[round.crewById(busy.crewId).jobId].name + ") free in " + Math.ceil(busy.freeInS) + "s");
    }

    var label, enabled = false;
    var picked = run.options.filter(function (o) { return o.crewId === run.pickedCrew; })[0];
    if (inc.state === "repairing") {
      label = "Repairing… " + Math.round(inc.progress * 100) + "%";
    } else if (!picked) {
      label = "No crew can go now";
    } else if (picked.sendable) {
      var crew = round.crewById(picked.crewId);
      label = (crew.state === "driving" ? "Redirect " : "Send ") + MCW.jobs[crew.jobId].name;
      enabled = true;
    } else {
      label = picked.reason + (picked.freeInS !== null ? " — free in " + Math.ceil(picked.freeInS) + "s" : "");
    }
    this._set("send", el.send, label);
    el.send.disabled = !enabled;
  };

  // Places the bubble next to what the current hint talks about.
  P._updateHint = function (round) {
    var el = this.el, h = this.run.hints, step = h && h.current;
    var playing = this.game.screens.state === "playing";
    el.hint.hidden = !step || !playing;
    if (el.hint.hidden) return;
    this._set("hint", el.hintText, step.text);
    var cam = this.game.camera, x, y, below = false, r, s;
    if (step.anchor === "incident") {
      var tut = round.activeIncidents().filter(function (i) { return i.tutorial; })[0];
      if (!tut) { el.hint.hidden = true; return; }
      s = cam.mapToScreen(tut.centre.x, tut.centre.y);
      var lift = tut.target.tile ? 30 : 80;
      x = s.sx;
      y = s.sy - lift * cam.zoom - 34;
    } else if (step.anchor === "crew") {
      var crew = round.crews.filter(function (c) { return c.state === "driving"; })[0] || this._focusCrew();
      s = cam.mapToScreen(crew.x, crew.y);
      x = s.sx;
      y = s.sy - 40 * cam.zoom;
    } else {
      var target = step.anchor === "send" ? (el.panel.hidden ? null : el.send)
        : step.anchor === "meter" ? el.meter : this.root.querySelector(".hud-goal");
      if (!target) { el.hint.hidden = true; return; }
      r = target.getBoundingClientRect();
      x = r.left + r.width / 2;
      below = step.anchor !== "send";
      y = below ? r.bottom : el.panel.getBoundingClientRect().top; // above the whole panel
    }
    var w = el.hint.offsetWidth, hh = el.hint.offsetHeight;
    var left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2));
    var top = below ? y + HINT_GAP : y - hh - HINT_GAP;
    el.hint.style.left = left + "px";
    el.hint.style.top = Math.max(8, top) + "px";
    el.hint.classList.toggle("below", below);
    el.hint.style.setProperty("--arrow-x", Math.max(16, Math.min(w - 16, x - left)) + "px");
  };

  MCW.HUD = HUD;
})(window.MCW);
