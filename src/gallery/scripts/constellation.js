/* ============================================================
   CONSTELLATION
   Tracks viewed photos, adds a glow, and draws organic
   trails between them on a canvas overlay.
   ============================================================ */

const cvs = document.getElementById("constellation-canvas");
const ctx = cvs.getContext("2d");

// Ordered list of viewed photo indices (no duplicates)
const viewedOrder = [];
const viewedSet = new Set();

// Cached screen positions (updated every frame by gallery.js)
// Map<photoIndex, {x, y}> — center of the item in viewport coords
const positions = new Map();

/* ---- Canvas sizing ---- */

function resize() {
  cvs.width = window.innerWidth;
  cvs.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();


/* ---- Public API ---- */

/** Called when a photo detail is closed after viewing. */
export function markViewed(photoIndex, itemEl) {
  if (viewedSet.has(photoIndex)) return;
  viewedSet.add(photoIndex);
  viewedOrder.push(photoIndex);
  itemEl.classList.add("viewed");
}

/** Called every frame by gallery.js with the current screen center of each visible item. */
export function updatePosition(photoIndex, screenX, screenY) {
  positions.set(photoIndex, { x: screenX, y: screenY });
}

/** Called every frame to redraw trails. */
export function draw() {
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  if (viewedOrder.length < 2) return;

  // Collect screen-space points in view order
  const pts = [];
  for (const idx of viewedOrder) {
    const p = positions.get(idx);
    if (p) pts.push(p);
  }
  if (pts.length < 2) return;

  // Draw the organic trail using Catmull-Rom splines
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Outer glow layer
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 6;
  strokeCatmullRom(pts);

  // Core line
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.5;
  strokeCatmullRom(pts);

  // Draw small dots at each viewed photo position
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#ffffff";
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}


/* ---- Catmull-Rom spline ---- */

/**
 * Attempt a smooth Catmull-Rom curve through all points.
 * Adds slight perpendicular noise to midpoints for organic feel.
 */
function strokeCatmullRom(pts) {
  if (pts.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  if (pts.length === 2) {
    // Simple quadratic with a slight offset for organic feel
    const mx = (pts[0].x + pts[1].x) / 2;
    const my = (pts[0].y + pts[1].y) / 2;
    const nx = -(pts[1].y - pts[0].y);
    const ny = (pts[1].x - pts[0].x);
    const len = Math.sqrt(nx * nx + ny * ny) || 1;
    const wobble = 8;
    ctx.quadraticCurveTo(
      mx + (nx / len) * wobble,
      my + (ny / len) * wobble,
      pts[1].x, pts[1].y
    );
    ctx.stroke();
    return;
  }

  // Catmull-Rom: for each segment, compute control points
  const tension = 0.3;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    // Add subtle perpendicular wobble to control points
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segLen = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / segLen;
    const ny = dx / segLen;
    const wobble = Math.sin(i * 2.7 + segLen * 0.01) * 6;

    ctx.bezierCurveTo(
      cp1x + nx * wobble,
      cp1y + ny * wobble,
      cp2x - nx * wobble,
      cp2y - ny * wobble,
      p2.x, p2.y
    );
  }

  ctx.stroke();
}
