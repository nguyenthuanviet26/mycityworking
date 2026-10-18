// Adapter: pictures and symbols for crews and damage — each job's vehicle (per facing), leader
// portraits, job icons and damage-kind glyphs (feature 006). Relative to the "Isometric City" folder.
(function (MCW) {
  "use strict";

  var FACINGS = ["NE", "SE", "SW", "NW"];
  var VEHICLES = { road: "pickup_orange", builders: "box_red", electric: "van_white", drainage: "truck_green", general: "truck_yellow" };
  var VEHICLE_NAMES = { road: "pickup", builders: "box truck", electric: "van", drainage: "truck", general: "truck" };
  var ICONS = { road: "🚧", builders: "🏗", electric: "⚡", drainage: "💧", general: "🔧" };
  var GLYPHS = { road: "⚠", building: "⌂", streetlight: "💡", pump: "💧" };

  function vehicleFor(jobId, facing) {
    return "Vehicles/veh_" + (VEHICLES[jobId] || VEHICLES.general) + "_" + facing + ".png";
  }

  function portraitFor(key) {
    return "Characters/" + key + "_idle_SE_f01.png";
  }

  MCW.jobArt = {
    vehicleFor: vehicleFor,
    portraitFor: portraitFor,
    icon: function (jobId) { return ICONS[jobId] || ICONS.general; },
    vehicleName: function (jobId) { return VEHICLE_NAMES[jobId] || VEHICLE_NAMES.general; },
    kindGlyph: function (kindId) { return GLYPHS[kindId] || "!"; },
    // crews: [{ job, portrait }] — every vehicle facing and portrait they need, once each.
    imagePathsFor: function (crews) {
      var out = [];
      function add(p) { if (out.indexOf(p) < 0) out.push(p); }
      crews.forEach(function (c) {
        FACINGS.forEach(function (f) { add(vehicleFor(c.job, f)); });
        if (c.portrait) add(portraitFor(c.portrait));
      });
      return out;
    }
  };
})(window.MCW);
