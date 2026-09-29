/**
 * Optional per-photo metadata, keyed by image filename (exactly as it appears
 * in src/images/). Anything you omit falls back to sensible defaults
 * (title = filename without extension; other fields blank).
 *
 * Example:
 *   "_DSC0156.jpg": {
 *     title: "Morning fog",
 *     date: "2024-11-03",
 *     location: "Vercors, FR",
 *     description: "Shot just after sunrise."
 *   },
 */
const META = {
  // "_DSC0156.jpg": { title: "", date: "", location: "", description: "" },
};

export default META;
