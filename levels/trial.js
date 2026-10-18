// Trial level: the first storm (feature 005), with four crews (feature 006). Times in seconds.
// Starting numbers from specs/005-trial-level/research.md R12 and specs/006-crew-jobs/research.md
// R8, to be tuned in playtesting.
// Format: specs/005-trial-level/contracts/level-definition.md
MCW.levels.register({
  id: "trial",
  name: "Trial: First Storm",
  map: "trial",
  startView: { zoom: 1, center: [8, 9] },
  // Four crews by the garage (feature 006); order = crew bar and keys 1-4.
  crews: [
    { id: "road", job: "road", leader: "Minh", portrait: "char_a", depot: [4, 9] },
    { id: "builders", job: "builders", leader: "Hoa", portrait: "char_b", depot: [3, 9] },
    { id: "electric", job: "electric", leader: "Linh", portrait: "char_c", depot: [5, 8] },
    { id: "drainage", job: "drainage", leader: "Tuan", portrait: "char_a", depot: [5, 10] }
  ],
  target: 10,
  phases: [
    { name: "Drizzle", durationS: 60, maxActive: 3, rain: 0.4 },
    { name: "Downpour", durationS: 90, maxActive: 4, rain: 0.7 },
    { name: "Peak storm", durationS: 90, maxActive: 6, rain: 1.0 }
  ],
  // 18 incidents, all four kinds (feature 006 FR-006, FR-006a). Same-kind clusters make the
  // Best crew busy so the player must wait or send a helper (FR-006b).
  schedule: [
    // Drizzle
    { at: 3, kind: "road", tile: [8, 3], tutorial: true },
    { at: 25, kind: "streetlight", object: "light-3" },
    { at: 45, kind: "building", object: "clinic" },
    // Downpour
    { at: 65, kind: "road", tile: [16, 6] },
    { at: 75, kind: "building", object: "apartments" },
    { at: 90, kind: "streetlight", object: "light-2" },
    { at: 92, kind: "streetlight", object: "light-4" },        // cluster 1
    { at: 110, kind: "pump", object: "pump" },
    { at: 125, kind: "building", object: "church" },
    { at: 140, kind: "road", tile: [5, 13] },
    // Peak storm
    { at: 155, kind: "building", object: "hospital" },         // cluster 2: three roofs far apart
    { at: 157, kind: "building", object: "apartments" },
    { at: 159, kind: "building", object: "pizza" },
    { at: 172, kind: "pump", object: "pump" },
    { at: 175, kind: "road", tile: [14, 13] },
    { at: 190, kind: "streetlight", object: "light-1" },
    { at: 212, kind: "road", tile: [1, 15] },
    { at: 225, kind: "building", object: "cafe" }
  ],
  warnScale: 0.7,
  drainPerUrgentPerS: 1.8,
  refill: { normal: 5, early: 8 },
  earlyBonus: 50,
  rightCrewBonus: 40,
  stars: [3000, 4200]
});
