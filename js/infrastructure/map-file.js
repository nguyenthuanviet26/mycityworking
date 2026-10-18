// Infrastructure: the maps/*.js map file format (feature 004 contracts/map-file.md).
// format() writes a definition the way the existing map files look; read() takes a file a
// teammate sent and returns its definition as data. read() never runs anything from the file:
// it is a small reader for object/array/string/number literals only (research R4). No DOM.
(function (MCW) {
  "use strict";

  var LEGEND_LINE = "// Legend: . grass  , dirt  # concrete  = asphalt  ~ water  r road  b bridge";
  function forbiddenKey(k) {
    return k === "__proto__" || k === "constructor" || k === "prototype";
  }

  // ---- writing ------------------------------------------------------------

  // A double-quoted string that also hides ` and ${ (contract rule 3).
  function str(s) {
    return JSON.stringify(String(s)).replace(/`/g, "\\u0060").replace(/\$\{/g, "\\u0024{");
  }

  function pair(a) {
    return "[" + a[0] + ", " + a[1] + "]";
  }

  function objectLine(o) {
    var parts = ["type: " + str(o.type), "at: " + pair(o.at)];
    if (o.variant === "damaged") parts.push('variant: "damaged"');
    if (o.id !== undefined) parts.push("id: " + str(o.id));
    if (o.access) parts.push("access: " + pair(o.access));
    return "    { " + parts.join(", ") + " }";
  }

  function terrainLines(terrain) {
    var lines = String(terrain).split(/\r?\n/);
    while (lines.length && lines[0] === "") lines.shift();
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    return lines;
  }

  // info: { cols, rows, date: "YYYY-MM-DD" }
  function format(def, info) {
    var name = String(def.name || def.id).replace(/[\r\n]+/g, " ");
    var objects = def.objects || [];
    var out = [
      "// " + name + " (" + info.cols + "x" + info.rows + "). Made with the map decorator on " + info.date + ".",
      LEGEND_LINE,
      "MCW.maps.register({",
      "  id: " + str(def.id) + ",",
      "  name: " + str(def.name || def.id) + ",",
      "  terrain: `"
    ].concat(terrainLines(def.terrain), ["`,"]);
    if (objects.length) {
      out.push("  objects: [");
      out.push(objects.map(objectLine).join(",\n"));
      out.push("  ]");
    } else {
      out.push("  objects: []");
    }
    out.push("});");
    return out.join("\n") + "\n";
  }

  function scriptLine(id) {
    return '<script src="maps/' + id + '.js"></script>';
  }

  // ---- reading ------------------------------------------------------------

  function ReadError(pos, msg) {
    this.pos = pos;
    this.msg = msg;
  }

  function Reader(text) {
    this.s = text;
    this.i = 0;
  }

  var R = Reader.prototype;

  R.lineAt = function (pos) {
    var n = 1;
    for (var k = 0; k < pos && k < this.s.length; k++) if (this.s.charCodeAt(k) === 10) n++;
    return n;
  };

  R.fail = function (msg, pos) {
    throw new ReadError(pos === undefined ? this.i : pos, msg);
  };

  // Skips whitespace and comments.
  R.skip = function () {
    var s = this.s;
    for (;;) {
      var c = s[this.i];
      if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === "﻿") { this.i++; continue; }
      if (c === "/" && s[this.i + 1] === "/") {
        while (this.i < s.length && s[this.i] !== "\n") this.i++;
        continue;
      }
      if (c === "/" && s[this.i + 1] === "*") {
        var end = s.indexOf("*/", this.i + 2);
        if (end < 0) this.fail("a comment is never closed");
        this.i = end + 2;
        continue;
      }
      return;
    }
  };

  R.peek = function () {
    this.skip();
    return this.s[this.i];
  };

  R.word = function () {
    var m = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(this.s.slice(this.i, this.i + 200));
    return m ? m[0] : null;
  };

  R.expect = function (ch, what) {
    if (this.peek() !== ch) this.fail("expected " + (what || '"' + ch + '"') + this.near());
    this.i++;
  };

  R.near = function () {
    if (this.i >= this.s.length) return " but the file ended";
    var w = this.word();
    return ' but found "' + (w || this.s[this.i]) + '"';
  };

  R.value = function () {
    var c = this.peek(), start = this.i;
    if (c === "{") return this.object();
    if (c === "[") return this.array();
    if (c === '"' || c === "'") return this.string(c);
    if (c === "`") return this.template();
    if (c === "-" || (c >= "0" && c <= "9")) return this.number();
    var w = this.word();
    if (w === "true") { this.i += 4; return true; }
    if (w === "false") { this.i += 5; return false; }
    if (w === "null") { this.i += 4; return null; }
    if (w) this.fail('"' + w + '" is not a value (the file may only contain map data)', start);
    if (this.i >= this.s.length) this.fail("the file ended too early");
    this.fail('unexpected "' + c + '" (the file may only contain map data)', start);
  };

  R.object = function () {
    var out = {};
    this.expect("{");
    while (this.peek() !== "}") {
      var keyPos = this.i, c = this.peek(), key;
      if (c === '"' || c === "'") key = this.string(c);
      else {
        key = this.word();
        if (!key) this.fail("expected a property name" + this.near());
        this.i += key.length;
      }
      if (forbiddenKey(key)) this.fail('"' + key + '" is not allowed as a property name', keyPos);
      this.expect(":");
      out[key] = this.value();
      if (this.peek() === ",") this.i++;
      else if (this.peek() !== "}") this.fail('expected "," or "}"' + this.near());
    }
    this.i++;
    return out;
  };

  R.array = function () {
    var out = [];
    this.expect("[");
    while (this.peek() !== "]") {
      out.push(this.value());
      if (this.peek() === ",") this.i++;
      else if (this.peek() !== "]") this.fail('expected "," or "]"' + this.near());
    }
    this.i++;
    return out;
  };

  var ESC = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", 0: "\0" };

  R.string = function (q) {
    var s = this.s, out = "", start = this.i;
    this.i++;
    while (this.i < s.length) {
      var c = s[this.i++];
      if (c === q) return out;
      if (c === "\n") this.fail("a text value runs past the end of its line", start);
      if (c !== "\\") { out += c; continue; }
      var e = s[this.i++];
      if (e === "u") {
        var hex = s.slice(this.i, this.i + 4);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.fail("bad \\u escape", this.i - 2);
        out += String.fromCharCode(parseInt(hex, 16));
        this.i += 4;
      } else if (e === "\n") {
        // line continuation
      } else {
        out += ESC[e] !== undefined ? ESC[e] : e;
      }
    }
    this.fail("a text value is never closed", start);
  };

  R.template = function () {
    var s = this.s, out = "", start = this.i;
    this.i++;
    while (this.i < s.length) {
      var c = s[this.i];
      if (c === "`") { this.i++; return out; }
      if (c === "$" && s[this.i + 1] === "{") this.fail("${ is not allowed in a map file");
      if (c === "\\" && (s[this.i + 1] === "`" || s[this.i + 1] === "\\" || s[this.i + 1] === "$")) {
        out += s[this.i + 1];
        this.i += 2;
        continue;
      }
      out += c;
      this.i++;
    }
    this.fail("a ` text value is never closed", start);
  };

  R.number = function () {
    var m = /^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(this.s.slice(this.i, this.i + 50));
    if (!m) this.fail("expected a number" + this.near());
    this.i += m[0].length;
    return Number(m[0]);
  };

  // { ok, definition } or { ok: false, error }
  function read(text) {
    var rd = new Reader(String(text || ""));
    try {
      var head = rd.peek(), headPos = rd.i;
      ["MCW", ".", "maps", ".", "register", "("].forEach(function (tok) {
        rd.skip();
        if (rd.s.slice(rd.i, rd.i + tok.length) !== tok) {
          throw new ReadError(headPos, head === undefined
            ? "the file is empty"
            : "this is not a map file (it must start with MCW.maps.register({ … }), after any comments)");
        }
        rd.i += tok.length;
      });
      if (rd.peek() !== "{") rd.fail("the map data must be { … }" + rd.near());
      var def = rd.value();
      rd.expect(")", '")" after the map data');
      if (rd.peek() === ";") rd.i++;
      rd.skip();
      if (rd.i < rd.s.length) rd.fail("only one MCW.maps.register(…) call is allowed, with nothing after it");
      return { ok: true, definition: def };
    } catch (e) {
      if (!(e instanceof ReadError)) throw e;
      return { ok: false, error: "Line " + rd.lineAt(e.pos) + ": " + e.msg };
    }
  }

  MCW.mapFile = { format: format, read: read, scriptLine: scriptLine };
})(window.MCW);
