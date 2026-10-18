// Screen flow state machine (data-model.md). No DOM.
(function (MCW) {
  "use strict";

  // state -> action -> handler returning the next state
  function prepare(m) { m.focusOnShow = "btn-briefing-next"; return "briefing-crews"; }

  var TABLE = {
    loading: {
      loaded: function (m) { m.focusOnShow = "btn-play"; return "menu"; }
    },
    menu: {
      play: function (m) { if (m.hasLevel) return prepare(m); m.focusOnShow = null; return "playing"; },
      openHowto: function (m) { m.returnTo = "menu"; m.focusOnShow = "btn-howto-back"; return "howto"; },
      openCredits: function (m) { m.focusOnShow = "btn-credits-back"; return "credits"; }
    },
    "briefing-crews": {
      nextBriefing: function (m) { m.focusOnShow = "btn-start-round"; return "briefing-problems"; },
      toMenu: function (m) { m.focusOnShow = "btn-play"; return "menu"; }
    },
    "briefing-problems": {
      back: prepare,
      startRound: function (m) { m.focusOnShow = null; return "playing"; },
      toMenu: function (m) { m.focusOnShow = "btn-play"; return "menu"; }
    },
    howto: {
      back: function (m) {
        var to = m.returnTo || "menu";
        m.focusOnShow = to === "paused" ? "btn-pause-howto" : "btn-howto";
        m.returnTo = null;
        return to;
      }
    },
    credits: {
      back: function (m) { m.focusOnShow = "btn-credits"; return "menu"; }
    },
    playing: {
      pause: function (m) { m.focusOnShow = "btn-resume"; return "paused"; },
      finish: function (m) { m.focusOnShow = "btn-retry"; return "result"; }
    },
    result: {
      retry: function (m) { if (m.hasLevel) return prepare(m); m.focusOnShow = null; return "playing"; },
      toMenu: function (m) { m.focusOnShow = "btn-play"; return "menu"; }
    },
    paused: {
      retry: prepare,
      resume: function (m) { m.focusOnShow = null; return "playing"; },
      back: function (m) { m.focusOnShow = null; return "playing"; },
      openHowto: function (m) { m.returnTo = "paused"; m.focusOnShow = "btn-howto-back"; return "howto"; },
      toMenu: function (m) { m.focusOnShow = "btn-play"; return "menu"; }
    }
  };

  var ESCAPE = { "briefing-crews": "toMenu", "briefing-problems": "back", howto: "back", credits: "back", paused: "back", playing: "pause" };

  function ScreenMachine(opts) {
    this.hasLevel = !!(opts && opts.hasLevel);
    this.state = "loading";
    this.returnTo = null;
    this.focusOnShow = null;
    this.busy = false;
    this._events = MCW.createEmitter();
  }

  var P = ScreenMachine.prototype;

  P.on = function (evt, fn) { this._events.on(evt, fn); };
  P.off = function (evt, fn) { this._events.off(evt, fn); };

  P.dispatch = function (action) {
    if (this.busy || (action === "retry" && this.state === "paused" && !this.hasLevel)) return false;
    var handler = TABLE[this.state] && TABLE[this.state][action];
    if (!handler) return false;
    var from = this.state;
    this.state = handler(this);
    this._events.emit("change", { from: from, to: this.state, action: action });
    return true;
  };

  P.escape = function () {
    var action = ESCAPE[this.state];
    return action ? this.dispatch(action) : false;
  };

  P.inputEnabled = function () {
    return this.state === "playing";
  };

  ["nextBriefing", "startRound", "loaded", "play", "openHowto", "openCredits", "back", "pause", "resume", "toMenu", "finish", "retry"].forEach(function (a) {
    P[a] = function () { return this.dispatch(a); };
  });

  MCW.ScreenMachine = ScreenMachine;
})(window.MCW);
