// Infrastructure: download a text file and let the user pick one (feature 004 research R9).
// Both work over file:// and static hosting with no server.
(function (MCW) {
  "use strict";

  function download(fileName, text) {
    var url = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // Resolves { ok, text, name } or { ok: false, reason }; reason "cancelled" when nothing is chosen.
  function pickText(opts) {
    opts = opts || {};
    var maxBytes = opts.maxBytes || 1048576;
    return new Promise(function (resolve) {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = opts.accept || ".js";
      input.style.display = "none";
      document.body.appendChild(input);
      var done = false;
      function finish(r) {
        if (done) return;
        done = true;
        input.remove();
        resolve(r);
      }
      input.addEventListener("change", function () {
        var file = input.files && input.files[0];
        if (!file) return finish({ ok: false, reason: "cancelled" });
        if (file.size > maxBytes) return finish({ ok: false, reason: "The file is too big to be a map file" });
        var reader = new FileReader();
        reader.onload = function () { finish({ ok: true, text: String(reader.result), name: file.name }); };
        reader.onerror = function () { finish({ ok: false, reason: "The file could not be read" }); };
        reader.readAsText(file);
      });
      input.addEventListener("cancel", function () { finish({ ok: false, reason: "cancelled" }); });
      input.click();
    });
  }

  MCW.fileIO = { download: download, pickText: pickText };
})(window.MCW);
