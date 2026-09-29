import CONFIG from "./config.js";

// Populated by init(photos) — the array is pre-rendered at build time by
// src/pages/index.astro (Astro image pipeline) and passed in from the page.
let PHOTOS = [];

// True once the user interacts via touch; disables cursor-position panning
// (which has no meaning on a touchscreen) in favour of finger drag + pinch.
let touchMode = false;

/* ============================================================
   STATE
   ============================================================ */

const state = {
  // Canvas offset (what the user has panned to)
  offsetX: 0,
  offsetY: 0,

  // Current pan velocity (px/s), lerped toward target
  velX: 0,
  velY: 0,

  // Mouse position (viewport coords)
  mouseX: 0,
  mouseY: 0,

  // All placed items: { el, baseX, baseY, w, h, waveX, waveY, photoIndex }
  items: [],

  // Occupied cells to avoid overlap: Set of "col,row" strings
  occupied: new Set(),

  // Bounds of generated area (in grid-cell coords)
  generatedBounds: { minCol: 0, maxCol: 0, minRow: 0, maxRow: 0 },

  // Viewport dimensions (cached, updated on resize)
  vw: window.innerWidth,
  vh: window.innerHeight,

  // Timestamp tracking for requestAnimationFrame
  lastTime: 0,

  // Whether detail overlay is open (pause panning)
  paused: false,

  // Global zoom (scroll wheel)
  globalZoom: 1,        // current zoom level (lerped)
  globalZoomTarget: 1,  // target zoom level

  // Track which photo indices are already placed (for no-duplicate mode)
  usedPhotos: new Set(),

  // Counter for sequential assignment when above duplicate threshold
  nextPhotoIdx: 0,

  // Timestamp of last detail close (for hand input debounce)
  lastDetailClose: 0,
};


/* ============================================================
   DOM SETUP
   ============================================================ */

const canvas = document.getElementById("gallery-canvas");


/* ============================================================
   GRID GENERATION
   ============================================================ */

/** Deterministic-ish pseudo-random from cell coords (avoids needing stored seeds). */
function cellRandom(col, row, seed = 0) {
  let h = (col * 374761 + row * 668265 + seed * 93481) & 0x7fffffff;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return (h & 0xffff) / 0xffff;  // 0-1
}

/** Pick a photo from the data array for a given cell (no duplicates if above threshold). */
function photoForCell(col, row) {
  const allowDupes = PHOTOS.length < CONFIG.duplicateThreshold;

  if (allowDupes) {
    const idx = Math.abs((col * 7 + row * 13 + 37)) % PHOTOS.length;
    return { index: idx, data: PHOTOS[idx] };
  }

  // No duplicates: assign sequentially, skip if exhausted
  if (state.usedPhotos.size >= PHOTOS.length) return null;

  const idx = state.nextPhotoIdx % PHOTOS.length;
  state.nextPhotoIdx++;
  state.usedPhotos.add(idx);
  return { index: idx, data: PHOTOS[idx] };
}

/** Grid step sizes — cell dimensions + gap. Items fit within cellWidth x cellHeight. */
function gridSteps() {
  const g = CONFIG.grid;
  return {
    stepX: g.cellWidth + g.gapX,
    stepY: g.cellHeight + g.gapY,
    safeJitterX: Math.min(g.jitterX, g.gapX / 2),
    safeJitterY: Math.min(g.jitterY, g.gapY / 2),
  };
}

/** Compute item width and height from photo aspect ratio, fitting within cell bounds. */
function itemSize(data) {
  const g = CONFIG.grid;
  const aspect = data.aspect || (g.cellWidth / g.cellHeight);

  // Fit the photo into the cell without cropping
  let w, h;
  if (aspect >= 1) {
    // Landscape or square — fill width, shrink height
    w = g.cellWidth;
    h = Math.round(g.cellWidth / aspect);
  } else {
    // Portrait — fill height, shrink width
    h = g.cellHeight;
    w = Math.round(g.cellHeight * aspect);
  }

  return { w, h };
}

/** Create a single gallery item DOM element. */
function createItem(col, row) {
  const g = CONFIG.grid;
  const result = photoForCell(col, row);
  if (!result) return null;  // all photos placed (no-duplicate mode)
  const { index, data } = result;
  const steps = gridSteps();

  // Size from actual aspect ratio — no cropping
  const { w, h } = itemSize(data);

  // Position: center the item within its grid cell, then add jitter
  const cellOriginX = col * steps.stepX;
  const cellOriginY = row * steps.stepY;
  const baseX = cellOriginX + (steps.stepX - w) / 2 + (cellRandom(col, row, 3) - 0.5) * 2 * steps.safeJitterX;
  const baseY = cellOriginY + (steps.stepY - h) / 2 + (cellRandom(col, row, 4) - 0.5) * 2 * steps.safeJitterY;

  // Build element at 2x visual size for crisp zoom without excessive GPU cost.
  // Scale ranges from (1/maxScale) at rest to (2/maxScale) at full zoom,
  // capped at 1.0 so the DOM element is never upscaled beyond its pixel size.
  const renderScale = 2;
  const domW = Math.round(w * renderScale);
  const domH = Math.round(h * renderScale);

  const el = document.createElement("div");
  el.className = "gallery-item";
  el.style.width = domW + "px";
  el.style.height = domH + "px";
  if (!data.thumb && !data.src) {
    el.style.backgroundColor = data.color || "#222";
  }

  // Don't set backgroundImage here — lazy loading handles it in the render loop
  el.style.backgroundSize = "contain";
  el.style.backgroundPosition = "center";
  el.style.backgroundRepeat = "no-repeat";

  // Store photo index for detail view
  el.dataset.photoIndex = index;

  canvas.appendChild(el);

  // Grid uses the smallest pre-rendered variant (thumb); detail view loads the
  // larger variants on demand via getPhoto().
  const src = data.thumb || data.src || null;
  const item = { el, baseX, baseY, w, h, waveX: 0, waveY: 0, repX: 0, repY: 0, photoIndex: index, src, loaded: false };
  state.items.push(item);
  return item;
}

/** Fill a rectangular region of grid cells with items. Skips already-occupied cells. */
function fillRegion(minCol, maxCol, minRow, maxRow) {
  const allowDupes = PHOTOS.length < CONFIG.duplicateThreshold;

  for (let c = minCol; c <= maxCol; c++) {
    for (let r = minRow; r <= maxRow; r++) {
      const key = c + "," + r;
      if (state.occupied.has(key)) continue;

      // Stop spawning if all photos are placed (no-duplicate mode)
      if (!allowDupes && state.usedPhotos.size >= PHOTOS.length) return;

      // ~5% of cells are deliberately empty for organic feel
      if (cellRandom(c, r, 99) < 0.05) {
        state.occupied.add(key);
        continue;
      }

      state.occupied.add(key);
      createItem(c, r);
    }
  }
}

/** Calculate which grid-cell region should exist based on current viewport + offset. */
function requiredBounds() {
  const { stepX, stepY } = gridSteps();
  const extra = CONFIG.grid.extraRings;

  const minCol = Math.floor((-state.offsetX - CONFIG.pan.spawnBuffer) / stepX) - extra;
  const maxCol = Math.ceil((-state.offsetX + state.vw + CONFIG.pan.spawnBuffer) / stepX) + extra;
  const minRow = Math.floor((-state.offsetY - CONFIG.pan.spawnBuffer) / stepY) - extra;
  const maxRow = Math.ceil((-state.offsetY + state.vh + CONFIG.pan.spawnBuffer) / stepY) + extra;

  return { minCol, maxCol, minRow, maxRow };
}

/** Expand the generated area if needed. Only creates new cells, never removes. */
function expandIfNeeded() {
  const need = requiredBounds();
  const have = state.generatedBounds;

  let dirty = false;

  if (need.minCol < have.minCol) { fillRegion(need.minCol, have.minCol - 1, have.minRow, have.maxRow); dirty = true; }
  if (need.maxCol > have.maxCol) { fillRegion(have.maxCol + 1, need.maxCol, have.minRow, have.maxRow); dirty = true; }
  if (need.minRow < have.minRow) { fillRegion(need.minCol, need.maxCol, need.minRow, have.minRow - 1); dirty = true; }
  if (need.maxRow > have.maxRow) { fillRegion(need.minCol, need.maxCol, have.maxRow + 1, need.maxRow); dirty = true; }

  if (dirty) {
    state.generatedBounds = {
      minCol: Math.min(have.minCol, need.minCol),
      maxCol: Math.max(have.maxCol, need.maxCol),
      minRow: Math.min(have.minRow, need.minRow),
      maxRow: Math.max(have.maxRow, need.maxRow),
    };
  }
}


/* ============================================================
   PANNING + WAVE
   ============================================================ */

/** Map cursor offset from center to a speed value using dead zone + power curve. */
function axisSpeed(offset, halfSpan) {
  // offset: signed distance from center (-halfSpan to +halfSpan)
  // Returns signed speed (-maxSpeed to +maxSpeed)
  const p = CONFIG.pan;
  const normalized = offset / halfSpan;                         // -1 to 1
  const abs = Math.abs(normalized);
  if (abs < p.deadZone) return 0;                               // inside dead zone
  const mapped = (abs - p.deadZone) / (1 - p.deadZone);        // 0-1 after dead zone
  const curved = Math.pow(mapped, p.curve);                     // power curve
  return -Math.sign(normalized) * curved * p.maxSpeed;          // negative = pan opposite to cursor direction
}

/** Calculate target pan velocity from mouse position relative to viewport center. */
function targetVelocity() {
  const cx = state.vw / 2;
  const cy = state.vh / 2;

  return {
    tx: axisSpeed(state.mouseX - cx, cx),
    ty: axisSpeed(state.mouseY - cy, cy),
  };
}

/** Apply wave displacement to all items based on current velocity. */
function applyWave(dt) {
  const w = CONFIG.wave;
  const speed = Math.sqrt(state.velX * state.velX + state.velY * state.velY);
  // Blend factor: 0 when still, 1 at full speed — no hard cutoff
  const blend = Math.min(speed / 80, 1);

  for (const item of state.items) {
    const dx = (item.baseX + state.offsetX) - state.vw / 2;
    const dy = (item.baseY + state.offsetY) - state.vh / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const factor = Math.exp(-dist * w.falloff) * w.intensity * blend;

    const targetWX = (state.velX > 0 ? 1 : -1) * factor * Math.sin(dist * 0.01 + performance.now() * 0.002);
    const targetWY = (state.velY > 0 ? 1 : -1) * factor * Math.sin(dist * 0.01 + performance.now() * 0.002 + 1);

    item.waveX += (targetWX - item.waveX) * w.recovery;
    item.waveY += (targetWY - item.waveY) * w.recovery;
  }
}


/* ============================================================
   RENDER LOOP
   ============================================================ */

function tick(now) {
  requestAnimationFrame(tick);

  const dt = Math.min((now - state.lastTime) / 1000, 0.05);  // cap at 50ms to avoid jumps
  state.lastTime = now;

  if (state.paused) return;

  // Lerp velocity toward target. On touch devices the canvas is driven by
  // finger drag (see touch handlers), so cursor-position panning is disabled.
  const { tx, ty } = touchMode ? { tx: 0, ty: 0 } : targetVelocity();
  const acc = CONFIG.pan.acceleration;
  state.velX += (tx - state.velX) * acc;
  state.velY += (ty - state.velY) * acc;

  // Update offset
  state.offsetX += state.velX * dt;
  state.offsetY += state.velY * dt;

  // Lerp global zoom toward target
  const gzCfg = CONFIG.globalZoom;
  state.globalZoom += (state.globalZoomTarget - state.globalZoom) * gzCfg.ease;

  // Expand grid if we've panned near the edge
  expandIfNeeded();

  // Wave
  applyWave(dt);

  // Position all items + center zoom + repulsion
  const cx = state.vw / 2;
  const cy = state.vh / 2;
  const gz = state.globalZoom;
  const z = CONFIG.zoom;
  const pad = z.repulsePad;

  // Scale system (three independent layers):
  //   renderScale = 2  → DOM is 2x visual size, base CSS scale = 0.5
  //   magnify     = 1..maxScale  → center magnifying glass
  //   gz          = globalZoom   → scroll wheel zoom
  // Final CSS scale = (1/renderScale) * magnify * gz
  const renderScale = 2;
  const cullMargin = 400;

  // First pass: compute screen position + magnify factor, cull off-screen
  for (const item of state.items) {
    // Apply global zoom: scale positions relative to viewport center
    const rawX = item.baseX + state.offsetX + item.waveX;
    const rawY = item.baseY + state.offsetY + item.waveY;
    item._sx = cx + (rawX - cx) * gz;
    item._sy = cy + (rawY - cy) * gz;

    // Viewport culling
    const visW = item.w * gz;
    const visH = item.h * gz;
    item._visible = (
      item._sx + visW > -cullMargin &&
      item._sx < state.vw + cullMargin &&
      item._sy + visH > -cullMargin &&
      item._sy < state.vh + cullMargin
    );

    if (!item._visible) {
      item.el.style.display = "none";
      if (item.loaded) {
        item.el.style.backgroundImage = "";
        item.loaded = false;
      }
      continue;
    }
    item.el.style.display = "";

    // Lazy load. src is already a valid, encoded URL (Astro getImage in dev,
    // or a hashed /_astro/*.webp path in the build) — do NOT re-encode it, or
    // the %-escapes get double-encoded and the dev image endpoint 500s.
    if (!item.loaded && item.src) {
      item.el.style.backgroundImage = `url("${item.src}")`;
      item.loaded = true;
    }

    // Magnifying glass: constant visual radius regardless of global zoom
    const icx = item._sx + visW / 2;
    const icy = item._sy + visH / 2;
    const dist = Math.sqrt((icx - cx) ** 2 + (icy - cy) ** 2);

    item._magnify = 1;
    if (dist < z.radius) {
      const t = 1 - dist / z.radius;
      item._magnify = 1 + (z.maxScale - 1) * Math.pow(t, z.curve);
    }
  }

  // Second pass: resolve overlaps (only visible items)
  for (const item of state.items) {
    if (!item._visible) continue;

    let targetRepX = 0;
    let targetRepY = 0;

    // Item's visual center and half-size (at global zoom, magnify=1)
    const visW = item.w * gz;
    const visH = item.h * gz;
    const ax = item._sx + visW / 2;
    const ay = item._sy + visH / 2;
    const aHalfW = visW / 2;
    const aHalfH = visH / 2;

    for (const other of state.items) {
      if (other === item || !other._visible) continue;
      if (other._magnify <= 1.02) continue;

      // Other's visual half-size at current magnification
      const oVisW = other.w * gz * other._magnify;
      const oVisH = other.h * gz * other._magnify;
      const bx = other._sx + other.w * gz / 2;
      const by = other._sy + other.h * gz / 2;
      const bHalfW = oVisW / 2 + pad;
      const bHalfH = oVisH / 2 + pad;

      const overlapX = (aHalfW + bHalfW) - Math.abs(ax - bx);
      const overlapY = (aHalfH + bHalfH) - Math.abs(ay - by);

      if (overlapX > 0 && overlapY > 0) {
        if (overlapX < overlapY) {
          targetRepX += (ax > bx ? overlapX : -overlapX);
        } else {
          targetRepY += (ay > by ? overlapY : -overlapY);
        }
      }
    }

    item.repX += (targetRepX - item.repX) * z.repulseEase;
    item.repY += (targetRepY - item.repY) * z.repulseEase;

    const finalX = item._sx + item.repX;
    const finalY = item._sy + item.repY;

    // Combine all three scale layers
    const finalScale = (1 / renderScale) * item._magnify * gz;
    item.el.style.zIndex = item._magnify > 1.05 ? 10 : "";
    item.el.style.transform = `translate3d(${finalX}px, ${finalY}px, 0) scale(${finalScale})`;
  }
}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */

window.addEventListener("mousemove", (e) => {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
});

window.addEventListener("resize", () => {
  state.vw = window.innerWidth;
  state.vh = window.innerHeight;
});

// Reset velocity when mouse leaves window (stop panning)
document.addEventListener("mouseleave", () => {
  state.mouseX = state.vw / 2;
  state.mouseY = state.vh / 2;
});

// Scroll wheel: global zoom in/out
window.addEventListener("wheel", (e) => {
  if (state.paused) return;
  e.preventDefault();
  const gz = CONFIG.globalZoom;
  const delta = e.deltaY > 0 ? -gz.step : gz.step;
  state.globalZoomTarget = Math.max(gz.min, Math.min(gz.max, state.globalZoomTarget + delta));
}, { passive: false });


/* ============================================================
   TOUCH INPUT (phones / tablets)
   One finger drags the canvas; two fingers pinch to zoom. A tap
   (no drag) falls through to the click handler to open the detail view.
   ============================================================ */

let dragPoint = null;          // { x, y } last position for one-finger pan
let pinchStart = null;         // { dist, zoom } baseline for two-finger pinch
let gestureMoved = false;      // did this gesture move beyond the tap threshold?
let suppressClickUntil = 0;    // ignore the synthetic click after a drag
const TAP_SLOP = 10;           // px of movement still treated as a tap

const fingerDist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

window.addEventListener("touchstart", (e) => {
  touchMode = true;
  state.velX = 0;
  state.velY = 0;
  gestureMoved = false;
  if (e.touches.length === 1) {
    dragPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    pinchStart = null;
  } else if (e.touches.length === 2) {
    pinchStart = { dist: fingerDist(e.touches[0], e.touches[1]), zoom: state.globalZoomTarget };
    dragPoint = null;
  }
}, { passive: true });

window.addEventListener("touchmove", (e) => {
  if (state.paused) return;

  if (e.touches.length === 1 && dragPoint) {
    const t = e.touches[0];
    const dx = t.clientX - dragPoint.x;
    const dy = t.clientY - dragPoint.y;
    // Divide by zoom so the content tracks the finger 1:1 at any zoom level.
    state.offsetX += dx / state.globalZoom;
    state.offsetY += dy / state.globalZoom;
    dragPoint.x = t.clientX;
    dragPoint.y = t.clientY;
    if (Math.abs(dx) + Math.abs(dy) > TAP_SLOP) gestureMoved = true;
    e.preventDefault();
  } else if (e.touches.length === 2 && pinchStart) {
    const gz = CONFIG.globalZoom;
    const d = fingerDist(e.touches[0], e.touches[1]);
    const next = pinchStart.zoom * (d / pinchStart.dist);
    state.globalZoomTarget = Math.max(gz.min, Math.min(gz.max, next));
    gestureMoved = true;
    e.preventDefault();
  }
}, { passive: false });

window.addEventListener("touchend", (e) => {
  if (gestureMoved) suppressClickUntil = performance.now() + 350;
  if (e.touches.length === 0) {
    dragPoint = null;
    pinchStart = null;
  } else if (e.touches.length === 1) {
    // Dropped from two fingers to one — resume panning from the remaining finger.
    dragPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    pinchStart = null;
  }
}, { passive: true });

// Swallow the synthetic click that follows a drag/pinch so it doesn't open
// the detail view. Capture phase on window runs before the canvas handler.
window.addEventListener("click", (e) => {
  if (performance.now() < suppressClickUntil) {
    e.stopPropagation();
    e.preventDefault();
  }
}, true);


/* ============================================================
   INIT
   ============================================================ */

export function init(photos = []) {
  PHOTOS = photos;

  // Mobile: shrink cells and lighten preload so more photos fit on a small
  // screen and the grid stays smooth on lower-powered phones.
  if (window.matchMedia("(max-width: 700px)").matches) {
    const g = CONFIG.grid;
    g.cellWidth = Math.round(g.cellWidth * 0.6);
    g.cellHeight = Math.round(g.cellHeight * 0.6);
    g.gapX = Math.round(g.gapX * 0.5);
    g.gapY = Math.round(g.gapY * 0.5);
    g.extraRings = Math.min(g.extraRings, 1);
  }

  // Shuffle photos so clusters are mixed across the grid
  for (let i = PHOTOS.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [PHOTOS[i], PHOTOS[j]] = [PHOTOS[j], PHOTOS[i]];
  }

  const { stepX, stepY } = gridSteps();

  // Estimate grid dimensions (how many cols/rows the photos fill)
  const colsNeeded = Math.ceil(Math.sqrt(PHOTOS.length * (stepX / stepY)));
  const rowsNeeded = Math.ceil(PHOTOS.length / colsNeeded);

  // Pick a random cell within the grid, offset so it lands at viewport center
  const randCol = Math.floor(Math.random() * Math.max(1, colsNeeded - 2)) + 1;
  const randRow = Math.floor(Math.random() * Math.max(1, rowsNeeded - 2)) + 1;
  state.offsetX = state.vw / 2 - randCol * stepX;
  state.offsetY = state.vh / 2 - randRow * stepY;

  // Initial mouse at center (no panning until user moves to edge)
  state.mouseX = state.vw / 2;
  state.mouseY = state.vh / 2;

  // Generate initial region
  const bounds = requiredBounds();
  state.generatedBounds = bounds;
  fillRegion(bounds.minCol, bounds.maxCol, bounds.minRow, bounds.maxRow);

  // Start loop
  state.lastTime = performance.now();
  requestAnimationFrame(tick);
}

/** Pause/resume panning (used by detail overlay). */
export function setPaused(paused) {
  state.paused = paused;
}

/** Get photo data by index. */
export function getPhoto(index) {
  return PHOTOS[index];
}

/** Mark detail as just closed (for hand input debounce). */
export function markDetailClosed() {
  state.lastDetailClose = performance.now();
}
