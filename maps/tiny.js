// Tiny 5x5 map for checking that small maps are centred and cannot scroll.
MCW.maps.register({
  id: "tiny",
  name: "Tiny",
  terrain: `
..r..
..r..
rrrrr
..r..
..r..
`,
  objects: [{ type: "house_small_blue_a", at: [0, 0] }]
});
