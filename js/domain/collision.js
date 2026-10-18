// Collision values { foot, vehicle, cost } and the "most restrictive wins" rule.
(function (MCW) {
  "use strict";

  var OPEN = Object.freeze({ foot: true, vehicle: true, cost: 1 });
  var BLOCKED = Object.freeze({ foot: false, vehicle: false, cost: Infinity });

  function normalize(c) {
    if (!c.foot && !c.vehicle) return { foot: false, vehicle: false, cost: Infinity };
    return c;
  }

  function combine(a, b) {
    return normalize({
      foot: a.foot && b.foot,
      vehicle: a.vehicle && b.vehicle,
      cost: Math.max(a.cost, b.cost)
    });
  }

  function fromPartial(p) {
    p = p || {};
    return normalize({
      foot: p.foot === undefined ? true : !!p.foot,
      vehicle: p.vehicle === undefined ? true : !!p.vehicle,
      cost: p.cost === undefined ? 1 : p.cost
    });
  }

  MCW.collision = { OPEN: OPEN, BLOCKED: BLOCKED, combine: combine, fromPartial: fromPartial };
})(window.MCW);
