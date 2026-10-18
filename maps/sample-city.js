// Sample city (32x32): residential blocks, hospital, market, garage, pump station,
// park with a pond, and a canal crossed by three bridges.
// Legend: . grass  , dirt  # concrete  = asphalt  ~ water  r road  b bridge
MCW.maps.register({
  id: "sample-city",
  name: "Sample City",
  terrain: `
.....r......~..........,,,,,....
.....r......~..........,,,,,....
.....r......~..........,,,,,....
.....r......~..........,,,,,....
rrrrrrrrrrrrbrrrrrrrrrrrrrrrr...
.....r......~.....r.........r...
.....r......~.....r.........r...
.....r......~.....r.........r...
.....r......~.....r.........r...
.....r......~.....r.........r...
.....r......~.####r.........r...
.....r......~.####r.........r...
.....r......~.####r.........r...
.....r......~.####r.........r...
rrrrrrrrrrrrbrrrrrrrrrrrrrrrr...
.....r......~.....r...r.....r...
.....r......~.....r...r.....r...
.....r......~.....r...r.....r...
.....r......~.....r...r.....r...
.....r......~.....r...r.~~..r...
.....r......~.....r...r.~~..r...
.....r......~.....r.........r...
.....r......~.....r.........r...
.....r......~.....r.........r...
.....r......~.....r.........r...
.....r......~.....r.........r...
rrrrrrrrrrrrbrrrrrrrrrrrrrrrr...
.....r......~.....r.............
.....r......~.....r.............
.....r......~.....r.............
.....r......~.....r.............
.....r......~.....r.............
`,
  objects: [
    // North blocks
    { type: "house_tall_purple_a", at: [0, 3] },
    { type: "house_small_red_a", at: [3, 3] },
    { type: "house_small_yellow_a", at: [6, 3] },
    { type: "house_medium_white_a", at: [8, 3], variant: "damaged" },
    { type: "house_small_blue_b", at: [14, 3] },
    { type: "house_tall_green_a", at: [16, 3] },
    { type: "office_small_gray_a", at: [19, 2] },
    { type: "warehouse_blue_a", at: [24, 2] },

    // Residential area (west)
    { type: "house_small_blue_a", at: [0, 5] },
    { type: "house_medium_green_a", at: [2, 5] },
    { type: "trashcan_blue_a", at: [4, 5] },
    { type: "house_small_brickred_a", at: [6, 5] },
    { type: "house_tall_blue_a", at: [8, 5] },
    { type: "house_small_purple_a", at: [0, 13] },
    { type: "house_medium_brown_a", at: [3, 13] },
    { type: "apartments_brickwhite_a", at: [6, 12] },
    { type: "lightpole_a", at: [10, 13] },

    // Hospital district
    { type: "hospital_a", at: [19, 5], id: "hospital" },
    { type: "clinic_b", at: [21, 5] },
    { type: "house_medium_brickwhite_a", at: [29, 5] },
    { type: "house_small_red_b", at: [29, 9] },

    // Market plaza
    { type: "cafe_a", at: [15, 10] },
    { type: "fruitstand_a", at: [14, 13], id: "market" },
    { type: "fruitstand_b", at: [16, 13] },

    // Garage, fire station and south-west houses
    { type: "firestation_a", at: [0, 15] },
    { type: "autoshop_a", at: [6, 15], id: "garage" },
    { type: "house_tall_brown_a", at: [3, 17] },
    { type: "tree_common_medium", at: [8, 20] },
    { type: "house_small_brickred_b", at: [0, 25] },
    { type: "water_a", at: [9, 24], id: "pump-station" },

    // Between canal and the middle road
    { type: "house_small_brickbrown_a", at: [14, 15] },
    { type: "house_medium_brickwhite_b", at: [16, 15] },
    { type: "icecream_a", at: [14, 25] },
    { type: "pizza_a", at: [16, 25] },

    // Park with pond
    { type: "tree_common_large", at: [20, 16] },
    { type: "tree_pine_tall", at: [24, 16] },
    { type: "tree_common_medium", at: [26, 17] },
    { type: "tree_pine_medium", at: [20, 19] },
    { type: "flowers_yellow", at: [26, 19] },
    { type: "flowers_red", at: [21, 21] },
    { type: "tree_common_large", at: [23, 22] },
    { type: "tree_pine_small", at: [26, 22] },
    { type: "tree_common_medium", at: [20, 24] },
    { type: "tree_pine_tall", at: [25, 24] },
    { type: "sign_caution_a", at: [22, 20] },
    { type: "church_a", at: [29, 24] },
    { type: "tree_pine_tall", at: [30, 20] },

    // South blocks
    { type: "house_small_yellow_b", at: [0, 27] },
    { type: "house_medium_blue_a", at: [2, 27] },
    { type: "house_tall_brickwhite_a", at: [6, 27] },
    { type: "house_small_purple_b", at: [8, 27] },
    { type: "policestation_a", at: [14, 27] },
    { type: "gasstation_a", at: [19, 27] }
  ]
});
