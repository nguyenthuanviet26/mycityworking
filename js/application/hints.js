// Application: tutorial hints, one at a time, advanced by named game events
// (feature 005 contracts/play-ui.md §Hints, data-model "Hints").
(function (MCW) {
  "use strict";

  var TRIAL_STEPS = [
    { id: "incident", text: "Briefing complete - the clock is running. An incident! Click its marker to see what happened.", showOn: "tutorialReleased", clearOn: "incidentSelected", anchor: "incident" },
    { id: "send", text: "Pick the crew marked Best, then press Send.", clearOn: "crewSent", anchor: "send" },
    { id: "drive", text: "The crew drives on roads — wait for it to arrive.", clearOn: "crewArrived", anchor: "crew" },
    { id: "repair", text: "Repairing… keep the city condition up!", clearOn: "repairDone", anchor: "meter" },
    { id: "goal", text: "Repair {target} incidents before the storm ends. Click a crew below, then an incident, to send it faster.", clearAfterMs: 5000, anchor: "goal" }
  ];

  function Hints(steps) {
    this.steps = steps;
    this.index = -1; // index of the current step, -1 before the first one shows
    this.current = null;
    this.skipped = false;
    this._timer = 0;
    this._events = MCW.createEmitter();
  }

  var P = Hints.prototype;

  P.on = function (evt, fn) { this._events.on(evt, fn); };
  P.off = function (evt, fn) { this._events.off(evt, fn); };

  P._show = function (i) {
    this.index = i;
    this.current = this.steps[i] || null;
    this._timer = 0;
    this._events.emit("change", this.current);
  };

  P.notify = function (evt) {
    if (this.skipped) return;
    if (this.index < 0) {
      if (this.steps[0] && this.steps[0].showOn === evt) this._show(0);
      return;
    }
    if (!this.current) return;
    // The current step, or a later one whose action already happened, clears.
    for (var k = this.index; k < this.steps.length; k++) {
      if (this.steps[k].clearOn === evt) return this._show(k + 1);
    }
  };

  P.update = function (dtMs) {
    var c = this.current;
    if (!c || !c.clearAfterMs) return;
    this._timer += dtMs;
    if (this._timer >= c.clearAfterMs) this._show(this.steps.length);
  };

  P.skip = function () {
    this.skipped = true;
    if (this.current) {
      this.current = null;
      this._events.emit("change", null);
    }
  };

  // Copies of the steps with "{name}" replaced from vars (e.g. the level's target).
  Hints.fill = function (steps, vars) {
    return steps.map(function (s) {
      var copy = Object.assign({}, s);
      copy.text = s.text.replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? String(vars[k]) : m; });
      return copy;
    });
  };

  Hints.TRIAL_STEPS = TRIAL_STEPS;
  MCW.Hints = Hints;
})(window.MCW);
