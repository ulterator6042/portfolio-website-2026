import CONFIG from "./config.js";
import { setPaused, getPhoto, markDetailClosed } from "./gallery.js";

/* ============================================================
   DETAIL OVERLAY
   Handles click-to-expand on gallery items.
   ============================================================ */

const overlay = document.getElementById("detail-overlay");
const closeBtn = document.getElementById("detail-close");
const downloadBtn = document.getElementById("detail-download");

let currentPhotoSrc = null;

const fields = {
  preview: document.getElementById("detail-preview"),
  title:   document.getElementById("detail-title"),
  date:    document.getElementById("detail-date"),
  location:document.getElementById("detail-location"),
  desc:    document.getElementById("detail-desc"),
};

/** Open the detail view for a photo. */
function open(photoIndex) {
  const photo = getPhoto(photoIndex);
  if (!photo) return;

  // Detail view loads the larger "full" variant; fall back to thumb/legacy src.
  const previewSrc = photo.full || photo.thumb || photo.src || null;

  // Fill fields
  if (previewSrc) {
    // previewSrc is already a valid encoded URL — do not re-encode (see gallery.js).
    fields.preview.style.backgroundImage = `url("${previewSrc}")`;
    fields.preview.style.backgroundColor = "transparent";
  } else {
    fields.preview.style.backgroundImage = "";
    fields.preview.style.backgroundColor = photo.color;
  }

  fields.title.textContent    = photo.title    || "Untitled";
  fields.date.textContent     = photo.date     || "";
  fields.location.textContent = photo.location || "";
  fields.desc.textContent     = photo.description || "";

  // Download serves the largest pre-rendered variant.
  currentPhotoSrc = photo.download || photo.full || photo.src || null;

  // Show
  overlay.classList.add("active");
  setPaused(true);
}

/** Close the detail view. */
function close() {
  markDetailClosed();
  overlay.classList.remove("active");
  setPaused(false);
}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */

// Click on gallery item -> open detail
document.getElementById("gallery-canvas").addEventListener("click", (e) => {
  const item = e.target.closest(".gallery-item");
  if (!item) return;

  const idx = parseInt(item.dataset.photoIndex, 10);
  if (!isNaN(idx)) open(idx);
});

// Close button
closeBtn.addEventListener("click", close);

// Download button
downloadBtn.addEventListener("click", () => {
  if (!currentPhotoSrc) return;
  const a = document.createElement("a");
  a.href = currentPhotoSrc;
  a.download = currentPhotoSrc.split("/").pop() || "photo";
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// Click on backdrop (outside content) to close
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) close();
});

// Escape key to close
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && overlay.classList.contains("active")) {
    close();
  }
});
