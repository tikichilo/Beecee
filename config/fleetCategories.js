/* ==========================================================================
   Bee Cee Logistics — fleet category config
   Fixed set of 5 rental categories. Nothing about the fleet is tracked
   per-vehicle anymore — the public site and the admin dashboard both only
   ever deal with a rate range per category.
   ========================================================================== */

const CATEGORIES = [
  { key: "saloon", label: "Saloon Cars", icon: "directions_car" },
  { key: "4x4-pickup", label: "4x4 Pickups", icon: "airport_shuttle" },
  { key: "4x4-car", label: "4x4 Cars & SUVs", icon: "terrain" },
  { key: "bus", label: "Buses", icon: "directions_bus" },
  { key: "truck", label: "Trucks", icon: "local_shipping" },
];

const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

const CATEGORY_LABELS = CATEGORIES.reduce((map, c) => {
  map[c.key] = c.label;
  return map;
}, {});

module.exports = { CATEGORIES, CATEGORY_KEYS, CATEGORY_LABELS };