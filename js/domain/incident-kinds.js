// Domain: what the storm can break (feature 005 data-model "Incident kind"; feature 006 adds
// streetlights and the pump station). Times in seconds. Each kind says what it can target;
// the damaged look comes from the existing art adapters.
(function (MCW) {
  "use strict";

  var PUMPS = ["water_a", "water_b"];

  MCW.incidentKinds = {
    road: Object.freeze({ id: "road", label: "Road cracked", targets: "tile", repairS: 4, warnS: 25, points: 100 }),
    building: Object.freeze({ id: "building", label: "Roof damaged", targets: "object", objectKind: "building", excludeTypes: PUMPS, repairS: 6, warnS: 30, points: 150 }),
    streetlight: Object.freeze({ id: "streetlight", label: "Streetlight down", targets: "object", objectTypes: ["lightpole_a", "lightpole_b"], repairS: 3, warnS: 25, points: 100 }),
    pump: Object.freeze({ id: "pump", label: "Pump station failing", targets: "object", objectTypes: PUMPS, repairS: 7, warnS: 34, points: 200 })
  };

  // Can an object of this type be the target of this (object) kind?
  MCW.kindAccepts = function (kind, objectType) {
    var entry = MCW.objectTypes.TYPES[objectType];
    if (!entry || kind.targets !== "object") return false;
    if (kind.objectTypes) return kind.objectTypes.indexOf(objectType) >= 0;
    if (kind.excludeTypes && kind.excludeTypes.indexOf(objectType) >= 0) return false;
    return !kind.objectKind || entry.kind === kind.objectKind;
  };
})(window.MCW);
