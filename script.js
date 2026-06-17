const year = document.querySelector("[data-year]");
const header = document.querySelector("[data-header]");
const lightbox = document.querySelector("[data-lightbox]");
const lightboxImage = document.querySelector("[data-lightbox-image]");
const lightboxClose = document.querySelector("[data-lightbox-close]");
const focusSections = document.querySelectorAll(".home-page main > section");
const scrollRails = document.querySelectorAll("[data-scroll-rail]");
const documentLinks = document.querySelectorAll(".doc-link, [data-document-link]");
const galleryButtons = Array.from(document.querySelectorAll("[data-gallery-image]"));
let activeGalleryIndex = 0;

if (year) {
  year.textContent = new Date().getFullYear();
}

const updateHeader = () => {
  if (!header) return;
  const revealAt = Math.min(window.innerHeight * 0.28, 220);
  const shouldReveal = !document.body.classList.contains("home-page") || window.scrollY > revealAt;

  header.classList.toggle("is-visible", shouldReveal);
  header.classList.toggle("is-scrolled", shouldReveal && window.scrollY > 8);
};

const closeLightbox = () => {
  if (!lightbox || !lightboxImage) return;
  lightbox.classList.remove("is-open");
  lightboxImage.removeAttribute("src");
  lightboxImage.removeAttribute("alt");
};

const setLightboxImage = (index) => {
  if (!lightbox || !lightboxImage || !galleryButtons.length) return;
  activeGalleryIndex = (index + galleryButtons.length) % galleryButtons.length;
  const button = galleryButtons[activeGalleryIndex];
  const image = button.querySelector("img");
  lightboxImage.src = button.dataset.full || image?.src || "";
  lightboxImage.alt = image?.alt || "Production photograph";
};

const showAdjacentImage = (direction) => {
  setLightboxImage(activeGalleryIndex + direction);
};

const documentModal = (() => {
  if (!documentLinks.length) return null;

  const modal = document.createElement("div");
  modal.className = "document-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="document-modal__panel" role="dialog" aria-modal="true" aria-labelledby="document-modal-title">
      <div class="document-modal__bar">
        <h2 id="document-modal-title">Document viewer</h2>
        <div class="document-modal__actions">
          <button class="document-modal__close" type="button" aria-label="Close document viewer"></button>
        </div>
      </div>
      <div class="document-modal__body" data-document-body></div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
})();

if (lightbox && galleryButtons.length > 1) {
  const previousButton = document.createElement("button");
  const nextButton = document.createElement("button");

  previousButton.type = "button";
  previousButton.className = "lightbox__nav lightbox__nav--prev";
  previousButton.setAttribute("aria-label", "Previous image");
  previousButton.innerHTML = '<span class="lightbox__arrow" aria-hidden="true"></span>';

  nextButton.type = "button";
  nextButton.className = "lightbox__nav lightbox__nav--next";
  nextButton.setAttribute("aria-label", "Next image");
  nextButton.innerHTML = '<span class="lightbox__arrow" aria-hidden="true"></span>';

  previousButton.addEventListener("click", () => showAdjacentImage(-1));
  nextButton.addEventListener("click", () => showAdjacentImage(1));

  lightbox.append(previousButton, nextButton);
}

galleryButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    if (!lightbox || !lightboxImage) return;
    setLightboxImage(index);
    lightbox.classList.add("is-open");
  });
});

if (lightbox) {
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
}

if (lightboxClose) {
  lightboxClose.addEventListener("click", closeLightbox);
}

const closeDocumentModal = () => {
  if (!documentModal) return;
  const body = documentModal.querySelector("[data-document-body]");
  documentModal.classList.remove("is-open");
  documentModal.setAttribute("aria-hidden", "true");
  if (body) body.replaceChildren();
};

const openDocumentModal = (link) => {
  if (!documentModal) return;
  const body = documentModal.querySelector("[data-document-body]");
  const title = documentModal.querySelector("#document-modal-title");
  const href = link.href;
  const label = link.textContent.trim() || "Document";
  const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(link.pathname);

  if (title) title.textContent = label;
  if (body) {
    body.replaceChildren();
    const viewer = document.createElement(isImage ? "img" : "iframe");
    viewer.src = href;
    viewer.title = label;
    if (isImage) viewer.alt = label;
    body.appendChild(viewer);
  }

  documentModal.classList.add("is-open");
  documentModal.setAttribute("aria-hidden", "false");
};

documentLinks.forEach((link) => {
  link.setAttribute("target", "_blank");
  link.setAttribute("rel", "noreferrer");

  link.addEventListener("click", (event) => {
    if (window.matchMedia("(max-width: 780px)").matches) return;
    event.preventDefault();
    openDocumentModal(link);
  });
});

if (documentModal) {
  documentModal.addEventListener("click", (event) => {
    if (event.target === documentModal) closeDocumentModal();
  });

  const closeButton = documentModal.querySelector(".document-modal__close");
  if (closeButton) closeButton.addEventListener("click", closeDocumentModal);
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLightbox();
    closeDocumentModal();
  }

  if (lightbox?.classList.contains("is-open") && event.key === "ArrowLeft") {
    showAdjacentImage(-1);
  }

  if (lightbox?.classList.contains("is-open") && event.key === "ArrowRight") {
    showAdjacentImage(1);
  }
});

const updateSectionFocus = () => {
  if (!focusSections.length) return;

  const viewportCenter = window.innerHeight / 2;
  let activeSection = focusSections[0];
  let closestDistance = Number.POSITIVE_INFINITY;

  focusSections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const sectionCenter = rect.top + rect.height / 2;
    const distance = Math.abs(sectionCenter - viewportCenter);

    if (distance < closestDistance) {
      closestDistance = distance;
      activeSection = section;
    }
  });

  focusSections.forEach((section) => {
    section.classList.toggle("is-active", section === activeSection);
  });
};

const updateScrollRails = () => {
  scrollRails.forEach((rail) => {
    const track = rail.querySelector("[data-scroll-track]");
    if (!track) return;
    rail.classList.toggle("has-scroll-left", track.scrollLeft > 12);
  });
};

updateHeader();
updateSectionFocus();
updateScrollRails();
window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("scroll", updateSectionFocus, { passive: true });
window.addEventListener("resize", updateSectionFocus);
window.addEventListener("resize", updateScrollRails);

scrollRails.forEach((rail) => {
  const track = rail.querySelector("[data-scroll-track]");
  if (track) track.addEventListener("scroll", updateScrollRails, { passive: true });
});
