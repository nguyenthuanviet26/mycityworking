// Application: undo/redo stacks of plain change records (feature 004 research R14).
// The editor session applies a change's inverse on undo and the change itself on redo.
(function (MCW) {
  "use strict";

  function EditHistory(opts) {
    this.limit = (opts && opts.limit) || 200;
    this.undoStack = [];
    this.redoStack = [];
  }

  var P = EditHistory.prototype;

  P.push = function (change) {
    this.undoStack.push(change);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack.length = 0;
  };

  P.undo = function () {
    var c = this.undoStack.pop();
    if (!c) return null;
    this.redoStack.push(c);
    return c;
  };

  P.redo = function () {
    var c = this.redoStack.pop();
    if (!c) return null;
    this.undoStack.push(c);
    return c;
  };

  P.canUndo = function () { return this.undoStack.length > 0; };
  P.canRedo = function () { return this.redoStack.length > 0; };

  P.clear = function () {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  };

  MCW.EditHistory = EditHistory;
})(window.MCW);
