/**
 * Central configuration for the gallery.
 * Tuned via the dev settings panel — values exported 2026-06-17.
 */

const CONFIG = {
  "grid": {
    "cellWidth": 207,
    "cellHeight": 138,
    "gapX": 59,
    "gapY": 14,
    "jitterX": 2,
    "jitterY": 5,
    "extraRings": 2
  },
  "pan": {
    "deadZone": 0.19,
    "maxSpeed": 720,
    "curve": 2.8,
    "acceleration": 0.28,
    "spawnBuffer": 300
  },
  "wave": {
    "intensity": 12.5,
    "falloff": 0.009,
    "recovery": 0.03
  },
  "zoom": {
    "maxScale": 3.8,
    "radius": 420,
    "curve": 3,
    "repulsePad": 32,
    "repulseEase": 0.15
  },
  "globalZoom": {
    "min": 0.85,
    "max": 1.45,
    "step": 0.05,
    "ease": 0.08
  },
  "duplicateThreshold": 100,
  "detail": {
    "transitionMs": 400
  }
};

export default CONFIG;
