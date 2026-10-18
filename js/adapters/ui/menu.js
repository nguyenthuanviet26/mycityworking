// Menu screens in the DOM: shows the screen for the current state, focus, keys, fades.
(function (MCW) {
  "use strict";

  var FADE_MS = 300;
  var SCREENS = {
    menu: "screen-menu",
    "briefing-crews": "screen-briefing-crews",
    "briefing-problems": "screen-briefing-problems",
    howto: "screen-howto",
    credits: "screen-credits",
    paused: "screen-pause",
    result: "screen-result"
  };

  function $(id) {
    return document.getElementById(id);
  }

  function MenuUI(game, layer) {
    this.game = game;
    this.machine = game.screens;
    this.layer = layer;
    this.pauseBtn = $("btn-pause");
    this.instant = false; // skip the fade (used by ?menu=0)
    var self = this, m = this.machine;

    m.on("change", function (e) { self._onChange(e); });

    this.bind("btn-briefing-next", function () { m.nextBriefing(); });
    this.bind("btn-briefing-back", function () { m.back(); });
    this.bind("btn-briefing-menu", function () { m.toMenu(); });
    this.bind("btn-problems-menu", function () { m.toMenu(); });
    this.bind("btn-start-round", function () { m.startRound(); });
    this.bind("btn-play", function () { m.play(); });
    this.bind("btn-howto", function () { m.openHowto(); });
    this.bind("btn-credits", function () { m.openCredits(); });
    this.bind("btn-howto-back", function () { m.back(); });
    this.bind("btn-credits-back", function () { m.back(); });
    this.bind("btn-pause", function () { m.pause(); });
    this.bind("btn-resume", function () { m.resume(); });
    this.bind("btn-pause-howto", function () { m.openHowto(); });
    this.bind("btn-to-menu", function () { m.toMenu(); });
    this.bind("btn-pause-retry", function () { m.retry(); });
    this.bind("btn-retry", function () { m.retry(); });
    this.bind("btn-result-menu", function () { m.toMenu(); });

    window.addEventListener("keydown", function (e) { self._onKey(e); });
    // Leaving the tab pauses the round so nothing happens while the player is away (feature 005).
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && m.state === "playing") m.pause();
    });
  }

  var P = MenuUI.prototype;

  P.bind = function (id, fn) {
    $(id).addEventListener("click", fn);
  };

  function fmtTime(s) {
    s = Math.round(s);
    return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
  }

  // Fills the trial level's result card (feature 005 contracts/play-ui.md "Result card").
  P.setResult = function (r) {
    $("result-title").textContent = r.won ? "Level complete" : "Level failed";
    $("result-reason").textContent = r.reason === "cleared"
      ? (r.won ? "Storm cleared — the city made it through" : "The storm ended before the goal")
      : (r.won ? "The city wore out, but you reached the goal" : "The city could not hold on");
    var stars = $("result-stars");
    stars.textContent = "★★★".slice(0, r.stars) + "☆☆☆".slice(0, 3 - r.stars);
    stars.setAttribute("aria-label", r.stars + " of 3 stars");
    stars.hidden = !r.won;
    var rows = [["Incidents repaired", r.repaired + " / " + r.target], ["Time", fmtTime(r.timeS)], ["Score", String(r.score)]];
    var table = $("result-stats");
    table.textContent = "";
    rows.forEach(function (row) {
      var tr = table.insertRow();
      tr.insertCell().textContent = row[0];
      tr.insertCell().textContent = row[1];
    });
  };

  P._onKey = function (e) {
    if (this.game.run && this.game.run.referenceSection) return;
    if (e.key === "Escape") {
      if (this.machine.escape()) e.preventDefault();
      return;
    }
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && this._visibleScreen() && this.machine.state.indexOf("briefing-") !== 0) {
      e.preventDefault();
      this._moveFocus(e.key === "ArrowDown" ? 1 : -1);
    }
  };

  P._visibleScreen = function () {
    var id = SCREENS[this.machine.state];
    return id && !this.layer.hidden ? $(id) : null;
  };

  P._moveFocus = function (step) {
    var screen = this._visibleScreen();
    var buttons = Array.prototype.slice.call(screen.querySelectorAll(".menu-btn"));
    if (!buttons.length) return;
    var i = buttons.indexOf(document.activeElement);
    i = i < 0 ? 0 : (i + step + buttons.length) % buttons.length;
    buttons[i].focus();
  };

  P._onChange = function (e) {
    var self = this, m = this.machine;
    if (e.from === "menu" && e.to === "playing" && !this.instant) {
      m.busy = true;
      this.layer.classList.add("fade-out");
      setTimeout(function () {
        self.layer.classList.remove("fade-out");
        m.busy = false;
        self._show(m.state);
      }, FADE_MS);
      return;
    }
    this._show(e.to);
  };

  P._show = function (state) {
    var m = this.machine;
    Object.keys(SCREENS).forEach(function (key) {
      $(SCREENS[key]).hidden = key !== state;
    });
    this.layer.hidden = !SCREENS[state];
    this.layer.classList.toggle("dim-light", state === "paused" || (state === "howto" && m.returnTo === "paused"));
    this.pauseBtn.hidden = state !== "playing";
    $("btn-pause-retry").hidden = !m.hasLevel;

    if (SCREENS[state]) {
      var target = (m.focusOnShow && $(m.focusOnShow)) || $(SCREENS[state]).querySelector(".menu-btn");
      if (target) target.focus({ preventScroll: true });
    } else if (document.activeElement && document.activeElement.blur) {
      // Leave no menu button focused while playing, so Enter/Space can't re-trigger it.
      document.activeElement.blur();
    }
  };

  MCW.MenuUI = MenuUI;
})(window.MCW);
