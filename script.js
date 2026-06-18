const year = document.querySelector("[data-year]");
const header = document.querySelector("[data-header]");
const lightbox = document.querySelector("[data-lightbox]");
const lightboxImage = document.querySelector("[data-lightbox-image]");
const lightboxClose = document.querySelector("[data-lightbox-close]");
const videoModal = document.querySelector("[data-video-modal]");
const videoBody = document.querySelector("[data-video-body]");
const videoClose = document.querySelector("[data-video-close]");
const videoOpenButtons = document.querySelectorAll("[data-video-open]");
const documentLinks = document.querySelectorAll(".doc-link, [data-document-link]");
const galleryButtons = Array.from(document.querySelectorAll("[data-gallery-image]"));
const personalProjectsFeature = document.querySelectorAll('[data-feature="personal-projects"]');
let activeGalleryIndex = 0;
const showPersonalProjects = false;
const wheelDeltaPixelMode = 0;
const wheelDeltaLineMode = 1;
const wheelDeltaPageMode = 2;
const mouseWheelScrollThreshold = 50;
const mouseWheelScrollMultiplier = 2.1;
const wheelLineHeight = 56;
const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "iframe",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");
let activeModal = null;
let modalReturnFocus = null;

const normalizeWheelDelta = (event, track) => {
  if (event.deltaMode === wheelDeltaLineMode) return event.deltaY * wheelLineHeight;
  if (event.deltaMode === wheelDeltaPageMode) return event.deltaY * track.clientWidth;
  return event.deltaY;
};

const getFocusableElements = (container) => {
  return Array.from(container.querySelectorAll(focusableSelector)).filter((element) => {
    return element.offsetParent !== null || element === document.activeElement;
  });
};

const activateModal = (modal, focusTarget) => {
  modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  activeModal = modal;
  window.setTimeout(() => {
    const target = focusTarget || getFocusableElements(modal)[0];
    if (target instanceof HTMLElement) target.focus();
  }, 0);
};

const deactivateModal = (modal) => {
  if (activeModal !== modal) return;
  activeModal = null;
  if (modalReturnFocus instanceof HTMLElement) modalReturnFocus.focus();
  modalReturnFocus = null;
};

personalProjectsFeature.forEach((element) => {
  element.hidden = !showPersonalProjects;
});

const focusSections = document.querySelectorAll(".home-page main > section:not([hidden])");
const scrollRails = document.querySelectorAll("[data-scroll-rail]");

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
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.removeAttribute("src");
  lightboxImage.removeAttribute("alt");
  deactivateModal(lightbox);
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

const closeVideoModal = () => {
  if (!videoModal || !videoBody) return;
  videoModal.classList.remove("is-open");
  videoModal.setAttribute("aria-hidden", "true");
  videoBody.replaceChildren();
  deactivateModal(videoModal);
};

const openVideoModal = (button) => {
  if (!videoModal || !videoBody) return;
  const title = button.dataset.videoTitle || "Production video";
  const src = button.dataset.videoSrc;
  const heading = videoModal.querySelector("#video-modal-title");

  if (!src) return;
  if (heading) heading.textContent = title;

  videoBody.replaceChildren();
  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = title;
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allowFullscreen = true;
  videoBody.appendChild(iframe);

  videoModal.classList.add("is-open");
  videoModal.setAttribute("aria-hidden", "false");
  activateModal(videoModal, videoClose);
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
    lightbox.setAttribute("aria-hidden", "false");
    activateModal(lightbox, lightboxClose);
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

videoOpenButtons.forEach((button) => {
  button.addEventListener("click", () => openVideoModal(button));
});

if (videoModal) {
  videoModal.addEventListener("click", (event) => {
    if (event.target === videoModal) closeVideoModal();
  });
}

if (videoClose) {
  videoClose.addEventListener("click", closeVideoModal);
}

const closeDocumentModal = () => {
  if (!documentModal) return;
  const body = documentModal.querySelector("[data-document-body]");
  documentModal.classList.remove("is-open");
  documentModal.setAttribute("aria-hidden", "true");
  if (body) body.replaceChildren();
  deactivateModal(documentModal);
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
  activateModal(documentModal, documentModal.querySelector(".document-modal__close"));
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
  if (event.key === "Tab" && activeModal) {
    const focusableElements = getFocusableElements(activeModal);
    if (!focusableElements.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  if (event.key === "Escape") {
    closeLightbox();
    closeDocumentModal();
    closeVideoModal();
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

const setActiveSection = (activeSection) => {
  focusSections.forEach((section) => {
    section.classList.toggle("is-active", section === activeSection);
  });
};

const updateScrollRails = () => {
  scrollRails.forEach((rail) => {
    const track = rail.querySelector("[data-scroll-track]");
    if (!track) return;
    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    rail.classList.toggle("has-scroll-left", track.scrollLeft > 12);
    rail.classList.toggle("has-scroll-right", track.scrollLeft < maxScrollLeft - 12);
  });
};

updateHeader();
if (focusSections.length) {
  setActiveSection(focusSections[0]);
}
updateScrollRails();
window.addEventListener("scroll", updateHeader, { passive: true });
if ("IntersectionObserver" in window && focusSections.length) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const activeEntry = entries.find((entry) => entry.isIntersecting);
      if (activeEntry) setActiveSection(activeEntry.target);
    },
    {
      rootMargin: "-42% 0px -42% 0px",
      threshold: 0,
    },
  );

  focusSections.forEach((section) => sectionObserver.observe(section));
} else {
  updateSectionFocus();
  window.addEventListener("scroll", updateSectionFocus, { passive: true });
  window.addEventListener("resize", updateSectionFocus);
}
window.addEventListener("resize", updateScrollRails);

scrollRails.forEach((rail) => {
  const track = rail.querySelector("[data-scroll-track]");
  if (!track) return;

  track.querySelectorAll("img").forEach((image) => {
    image.setAttribute("draggable", "false");
  });

  track.addEventListener(
    "wheel",
    (event) => {
      const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 0.25;
      const isPrecisePointer = event.deltaMode === wheelDeltaPixelMode && Math.abs(event.deltaY) < mouseWheelScrollThreshold;
      const shouldConvertMouseWheel = !event.ctrlKey && !horizontalIntent && !isPrecisePointer;

      if (!shouldConvertMouseWheel) return;

      const maxScrollLeft = track.scrollWidth - track.clientWidth;
      const canScrollLeft = track.scrollLeft > 0;
      const canScrollRight = track.scrollLeft < maxScrollLeft;
      const scrollingLeft = event.deltaY < 0;
      const scrollingRight = event.deltaY > 0;
      const scrollAmount = normalizeWheelDelta(event, track) * mouseWheelScrollMultiplier;

      if ((scrollingLeft && canScrollLeft) || (scrollingRight && canScrollRight)) {
        event.preventDefault();
        track.scrollBy({ left: scrollAmount, behavior: "auto" });
      }
    },
    { passive: false },
  );

  track.addEventListener("scroll", updateScrollRails, { passive: true });
});
