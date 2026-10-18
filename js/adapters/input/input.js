// Mouse and keyboard: drag/keyboard scroll, wheel/key zoom, tile hover and selection.
// A pointer tool (decorate mode, feature 004 R10) takes the left button; other buttons pan.
(function (MCW) {
  "use strict";

  var CLICK_SLOP = 5; // px of movement below which a press counts as a click
  var ZOOM_STEP = 1.1;
  var SCROLL_KEYS = {
    ArrowUp: [0, -1], KeyW: [0, -1],
    ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0]
  };

  function Input(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.hovered = null;
    this.selected = null;
    this.held = {};
    this.enabled = true;
    this._drag = null;
    this._pointer = null;
    this._tool = null;
    this._toolPointer = null;
    // Optional fn(sx, sy, tile) called first on a left click; returning true consumes it
    // (the trial level uses it for incident pins and edge arrows, feature 005 R9).
    this.clickHandler = null;
    this._events = MCW.createEmitter();
    this._bind();
  }

  var P = Input.prototype;

  P.on = function (evt, fn) { this._events.on(evt, fn); };
  P.off = function (evt, fn) { this._events.off(evt, fn); };

  // Text fields get their own keys (e.g. typing "wasd" in the palette search).
  function typing() {
    var el = document.activeElement;
    return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
  }

  // tool: { down(pos, tile), move(pos, tile), up(pos, tile), cancel() } or null.
  P.setTool = function (tool) {
    this._cancelTool();
    this._tool = tool || null;
  };

  P._cancelTool = function () {
    if (this._toolPointer === null) return;
    this._toolPointer = null;
    if (this._tool && this._tool.cancel) this._tool.cancel();
  };

  P._toolArgs = function (e) {
    return [this.game.camera.screenToMap(e.clientX, e.clientY), this._tileAt(e.clientX, e.clientY)];
  };

  P._bind = function () {
    var self = this, canvas = this.canvas;

    canvas.addEventListener("pointerdown", function (e) {
      if (!self.enabled) return;
      if (self._tool && e.button === 0) {
        canvas.setPointerCapture(e.pointerId);
        self._toolPointer = e.pointerId;
        var a = self._toolArgs(e);
        self._tool.down(a[0], a[1]);
        return;
      }
      var pans = self._tool ? e.button === 1 || e.button === 2 : e.button === 0;
      if (!pans) return;
      if (e.button === 1) e.preventDefault(); // no autoscroll
      canvas.setPointerCapture(e.pointerId);
      self._drag = { id: e.pointerId, button: e.button, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: 0 };
      canvas.classList.add("grabbing");
    });

    canvas.addEventListener("contextmenu", function (e) {
      if (self._tool) e.preventDefault();
    });

    canvas.addEventListener("pointermove", function (e) {
      self._pointer = { x: e.clientX, y: e.clientY };
      if (!self.enabled) return;
      if (self._toolPointer === e.pointerId) {
        var a = self._toolArgs(e);
        self._tool.move(a[0], a[1]);
        self._updateHover();
        return;
      }
      var d = self._drag;
      if (d && d.id === e.pointerId) {
        var dx = e.clientX - d.x, dy = e.clientY - d.y;
        d.x = e.clientX;
        d.y = e.clientY;
        d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.startX, e.clientY - d.startY));
        if (dx || dy) {
          self.game.camera.panBy(dx, dy);
          self.game.renderer.requestRedraw();
        }
      }
      self._updateHover();
    });

    function endDrag(e, isUp) {
      if (e && self._toolPointer === e.pointerId) {
        self._toolPointer = null;
        if (isUp) {
          var a = self._toolArgs(e);
          self._tool.up(a[0], a[1]);
        } else if (self._tool.cancel) self._tool.cancel();
        return;
      }
      var d = self._drag;
      if (!d || (e && d.id !== e.pointerId)) return;
      self._drag = null;
      canvas.classList.remove("grabbing");
      if (isUp && d.button === 0 && d.moved < CLICK_SLOP) {
        var t = self._tileAt(e.clientX, e.clientY);
        if (self.clickHandler && self.clickHandler(e.clientX, e.clientY, t)) return;
        if (t) self.select(t);
      }
    }

    canvas.addEventListener("pointerup", function (e) { endDrag(e, true); });
    canvas.addEventListener("pointercancel", function (e) { endDrag(e, false); });
    canvas.addEventListener("pointerleave", function () {
      self._pointer = null;
      if (!self._drag) self._setHover(null);
    });

    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      if (!self.enabled || !e.deltaY) return;
      self.game.camera.zoomAt(e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, e.clientX, e.clientY);
      self.game.renderer.requestRedraw();
      self._updateHover();
    }, { passive: false });

    window.addEventListener("keydown", function (e) {
      if (!self.enabled || typing()) return;
      if (SCROLL_KEYS[e.code]) {
        self.held[e.code] = true;
        e.preventDefault();
        return;
      }
      var cam = self.game.camera;
      if (e.key === "+" || e.key === "=") cam.zoomCenter(ZOOM_STEP);
      else if (e.key === "-" || e.key === "_") cam.zoomCenter(1 / ZOOM_STEP);
      else if (e.key === "Home") {
        cam.setZoom(1);
        cam.centerOn(self.game.map.cols / 2, self.game.map.rows / 2);
      } else return;
      e.preventDefault();
      self.game.renderer.requestRedraw();
      self._updateHover();
    });

    window.addEventListener("keyup", function (e) {
      delete self.held[e.code];
    });

    window.addEventListener("blur", function () {
      self._cancelTool();
      self.held = {};
      self._drag = null;
      canvas.classList.remove("grabbing");
    });
  };

  // Keyboard scrolling; returns true when the camera moved.
  // Drops held keys, any drag and the hover highlight (used when a menu opens).
  P.reset = function () {
    this._cancelTool();
    this.held = {};
    this._drag = null;
    this.canvas.classList.remove("grabbing");
    this._setHover(null);
  };

  P.update = function (dtMs) {
    if (!this.enabled) return false;
    var dx = 0, dy = 0;
    for (var code in this.held) {
      dx += SCROLL_KEYS[code][0];
      dy += SCROLL_KEYS[code][1];
    }
    if (!dx && !dy) return false;
    var len = Math.hypot(dx, dy);
    var step = this.game.camera.scrollSpeedWorld() * dtMs / 1000;
    this.game.camera.panWorld(dx / len * step, dy / len * step);
    this._updateHover();
    return true;
  };

  P._tileAt = function (x, y) {
    return this.game.camera.tileAtScreen(x, y, this.game.map.cols, this.game.map.rows);
  };

  P._updateHover = function () {
    this._setHover(this._pointer ? this._tileAt(this._pointer.x, this._pointer.y) : null);
  };

  P._setHover = function (t) {
    var h = this.hovered;
    if ((h && t && h.col === t.col && h.row === t.row) || (!h && !t)) return;
    this.hovered = t;
    this.game.renderer.hovered = t;
    this.game.renderer.requestRedraw();
    this._events.emit("tilehover", t);
  };

  P.select = function (t) {
    this.selected = t;
    this.game.renderer.selected = t;
    this.game.renderer.requestRedraw();
    this._events.emit("tileselect", t);
  };

  // Implements the application's selection port ({get, set}) used by GameSession.
  P.selectionPort = function () {
    var self = this;
    return {
      get: function () { return { hovered: self.hovered, selected: self.selected }; },
      set: function (v) {
        self.select(v.selected);
        self.hovered = v.hovered;
        self.game.renderer.hovered = v.hovered;
      }
    };
  };

  // Exact map position under the mouse, or null.
  P.pointerMapPosition = function () {
    if (!this._pointer) return null;
    return this.game.camera.screenToMap(this._pointer.x, this._pointer.y);
  };

  MCW.Input = Input;
})(window.MCW);
