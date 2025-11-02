// Beginner-friendly JS to fetch APOD data and render a simple gallery.
// The API will return objects with image URLs, titles, dates, and explanations.
// We'll use that data to populate the gallery and show a modal with details.

// URL that contains the APOD JSON data
const API_URL = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

// Get references to DOM elements
const getImageBtn = document.getElementById('getImageBtn');
const gallery = document.getElementById('gallery');

// Modal elements
const modal = document.getElementById('modal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose = document.getElementById('modalClose');
const modalMedia = document.querySelector('.modal-media');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');

// Keep the fetched items so clicks on cards can show details in the modal
let apodItems = [];

/* -------------------------
   Random "Did You Know?" fact
   ------------------------- */
const SPACE_FACTS = [
  'Did you know? A day on Venus is longer than a year on Venus.',
  'Did you know? Neutron stars can spin 600 times per second.',
  'Did you know? Space is not completely empty — it contains tiny particles and radiation.',
  'Did you know? The footprints on the Moon will likely remain for millions of years.',
  'Did you know? Jupiter’s magnetic field is 20,000 times stronger than Earth’s.',
  'Did you know? A teaspoon of a neutron star would weigh about a billion tons on Earth.',
  'Did you know? There are more trees on Earth than stars in the Milky Way.',
  'Did you know? The Sun makes up 99.86% of the mass in our solar system.',
  'Did you know? Saturn could float in water because it is mostly made of gas.',
  'Did you know? The largest volcano in the solar system is Olympus Mons on Mars.'
];

// Create and display a random fact above the gallery on page load
function showRandomFact() {
  const container = document.querySelector('.container') || document.body;
  const factEl = document.createElement('section');
  factEl.id = 'randomFact';
  factEl.className = 'random-fact';
  const fact = SPACE_FACTS[Math.floor(Math.random() * SPACE_FACTS.length)];
  factEl.innerHTML = `<p>🔭 <strong>Did you know?</strong> ${fact.replace(/^Did you know\?\s*/, '')}</p>`;
  // Insert the fact after the header and filters, before the gallery
  const galleryEl = document.getElementById('gallery');
  galleryEl.parentNode.insertBefore(factEl, galleryEl);
}
// show fact immediately
showRandomFact();

/* -------------------------
   Helpers for video handling
   ------------------------- */

// If the APOD 'url' contains iframe HTML, extract its src attribute
function extractIframeSrc(maybeHtml) {
  if (!maybeHtml || typeof maybeHtml !== 'string') return null;
  const m = maybeHtml.match(/<iframe[^>]*\s+src=(?:'|")([^'"]+)(?:'|")[^>]*>/i);
  return m ? m[1] : null;
}

// Extract YouTube video id from common URL formats (watch?v=..., youtu.be/, embed/, or iframe src)
function getYouTubeId(url) {
  if (!url) return null;
  const src = extractIframeSrc(url) || url;
  // try common YouTube patterns (embed/, watch?v=, youtu.be/)
  let m = src.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  // try extracting v= parameter explicitly
  m = src.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Build thumbnail URL for a video item when possible
function videoThumbnailFor(item) {
  if (!item) return null;
  // prefer explicit thumbnail_url if provided
  if (item.thumbnail_url) return item.thumbnail_url;
  // try to use iframe src or direct url for YouTube thumb
  const src = extractIframeSrc(item.url) || item.url;
  const id = getYouTubeId(src);
  if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  return null;
}

/* Helper: show a simple message in the gallery area (loading, errors, etc.) */
function showMessage(text) {
  gallery.innerHTML = `<div class="placeholder"><p>${text}</p></div>`;
}

/* Helper: create HTML for a single APOD item (image or video)
   Each card includes data-index so we can open the correct item in the modal. */
function createCard(item, index) {
  const title = item.title || 'Untitled';
  const date = item.date || '';
  let mediaHtml = '';

  // If the item is an image, show a thumbnail image
  if (item.media_type === 'image' && item.url) {
    mediaHtml = `<img src="${item.url}" alt="${title}" loading="lazy">`;
  } else if (item.media_type === 'video') {
    // For videos: try to show a thumbnail (YouTube or provided). Add a play overlay.
    const thumb = videoThumbnailFor(item);
    if (thumb) {
      mediaHtml = `
        <div class="video-thumb-wrap">
          <img src="${thumb}" alt="${title}" loading="lazy">
          <div class="play-overlay" aria-hidden="true">▶</div>
        </div>
      `;
    } else {
      // Fallback: clear video placeholder
      mediaHtml = `
        <div class="no-media">
          <div class="play-overlay small" aria-hidden="true">▶</div>
          <div class="no-media-text">Video — click to open</div>
        </div>
      `;
    }
  } else {
    mediaHtml = `<div class="no-media">Media not available</div>`;
  }

  // Card includes accessible button semantics via role and tabindex
  return `
    <article class="card" data-index="${index}" role="button" tabindex="0" aria-pressed="false">
      <div class="media">${mediaHtml}</div>
      <div class="card-body">
        <h3 class="card-title">${title}</h3>
        <small class="card-date">${date}</small>
      </div>
    </article>
  `;
}

/* Render the gallery from an array of items */
function renderGallery(items) {
  if (!Array.isArray(items) || items.length === 0) {
    showMessage('No images found in the data.');
    return;
  }

  // Save items for modal lookups
  apodItems = items;

  // Build cards — show up to 9 items so we get a 3x3 grid (three rows of three)
  const itemsToShow = items.slice(0, 9);
  const cardsHtml = itemsToShow.map((it, i) => createCard(it, i)).join('');
  gallery.innerHTML = `<div class="cards">${cardsHtml}</div>`;
}

/* Open modal for a specific item index
   Handle images and videos appropriately:
   - images: show a larger image
   - videos: embed an iframe if possible (YouTube), otherwise show thumbnail + link
   This special-case embeds the exact iframe markup you provided for the video id 1R5QqhPq1Ik. */
function openModal(index) {
  const item = apodItems[index];
  if (!item) return;

  // Clear previous media
  modalMedia.innerHTML = '';

  if (item.media_type === 'image') {
    // Create an <img> element for larger image
    const img = document.createElement('img');
    img.src = item.hdurl || item.url || '';
    img.alt = item.title || 'Space image';
    img.loading = 'lazy';
    modalMedia.appendChild(img);
  } else if (item.media_type === 'video') {
    // Try to extract any iframe src from the data (some APOD entries include full iframe HTML)
    const embeddedSrc = extractIframeSrc(item.url) || item.url || '';
    const ytId = getYouTubeId(embeddedSrc);

    // If this is the exact video you want, insert the provided iframe markup so it plays with the exact params
    if (ytId === '1R5QqhPq1Ik') {
      modalMedia.innerHTML = `
        <div class="video-embed-wrap">
          <iframe width="560" height="315"
            src="https://www.youtube.com/embed/1R5QqhPq1Ik?si=mfXXB1kdtjW50Nji&autoplay=1"
            title="YouTube video player"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen>
          </iframe>
        </div>
      `;
    } else if (ytId) {
      // Generic YouTube embed for other videos
      const iframe = document.createElement('iframe');
      iframe.setAttribute('src', `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&autoplay=1`);
      iframe.setAttribute('width', '100%');
      iframe.setAttribute('height', '500');
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.setAttribute('allowfullscreen', '');
      iframe.title = item.title || 'Video';
      iframe.style.border = '0';
      modalMedia.appendChild(iframe);
    } else if (embeddedSrc && (embeddedSrc.startsWith('http://') || embeddedSrc.startsWith('https://'))) {
      // Generic iframe embed for other video sources
      const iframe = document.createElement('iframe');
      iframe.setAttribute('src', embeddedSrc);
      iframe.setAttribute('width', '100%');
      iframe.setAttribute('height', '500');
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.setAttribute('allowfullscreen', '');
      iframe.title = item.title || 'Video';
      iframe.style.border = '0';
      modalMedia.appendChild(iframe);

      // Fallback link in case embedding is blocked
      const fallback = document.createElement('div');
      fallback.style.marginTop = '0.75rem';
      fallback.innerHTML = `<a href="${embeddedSrc}" target="_blank" rel="noopener">Open video in a new tab</a>`;
      modalMedia.appendChild(fallback);
    } else {
      // No usable embed; show thumbnail (if any) and provide a link
      const thumb = videoThumbnailFor(item);
      if (thumb) {
        const img = document.createElement('img');
        img.src = thumb;
        img.alt = item.title || 'Video thumbnail';
        img.loading = 'lazy';
        modalMedia.appendChild(img);
      }
      if (item.url) {
        const link = document.createElement('a');
        link.href = item.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'Open video in new tab';
        link.style.display = 'inline-block';
        link.style.marginTop = '0.75rem';
        modalMedia.appendChild(link);
      } else {
        modalMedia.textContent = 'Video not available.';
      }
    }
  } else {
    modalMedia.textContent = 'Media not available.';
  }

  // Fill meta text
  modalTitle.textContent = item.title || '';
  modalDate.textContent = item.date || '';
  modalExplanation.textContent = item.explanation || '';

  // Show modal
  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('open');
  document.body.classList.add('modal-open');
}

/* Close the modal and clear media to stop playback where applicable */
function closeModal() {
  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('open');
  document.body.classList.remove('modal-open');

  // Remove media content to stop any playback (iframe removal stops video)
  modalMedia.innerHTML = '';
  modalTitle.textContent = '';
  modalDate.textContent = '';
  modalExplanation.textContent = '';
}

/* Fetch data from the JSON file and render the gallery */
async function fetchApodData() {
  try {
    // Show a clear loading message while data downloads
    showMessage('🔄 Loading space photos…');

    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Network response was not ok (${response.status})`);
    }

    const data = await response.json();

    // The API will return a set of objects that include image URLs, titles, dates, and explanations.
    // Use that data to populate the gallery.
    renderGallery(data);
  } catch (error) {
    console.error('Fetch error:', error);
    showMessage('Sorry, something went wrong while fetching images.');
  }
}

/* Event: click on the "Get Space Images" button */
getImageBtn.addEventListener('click', () => {
  fetchApodData();
});

/* Event delegation: open modal when a card is clicked or activated via keyboard */
gallery.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  const idx = Number(card.getAttribute('data-index'));
  openModal(idx);
});

gallery.addEventListener('keydown', (e) => {
  // open on Enter or Space when a card is focused
  if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.card')) {
    e.preventDefault();
    const card = e.target.closest('.card');
    const idx = Number(card.getAttribute('data-index'));
    openModal(idx);
  }
});

/* Modal UI events: backdrop, close button, and Escape key */
modalBackdrop.addEventListener('click', closeModal);
modalClose.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('open')) {
    closeModal();
  }
});
