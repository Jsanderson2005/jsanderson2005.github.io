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
const lazyImages = document.querySelectorAll('img[loading="lazy"]');
const scrollComparisons = document.querySelectorAll("[data-scroll-comparison]");
const comparisonScrollCues = document.querySelectorAll("[data-comparison-scroll-cue]");
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

const setupLazyImageIndicators = () => {
  const indicatorContainers = ".production-card, .gallery button, .headshot-slot";
  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const container = entry.target.closest(indicatorContainers);
            if (container) {
              container.classList.add("is-media-loading");
              container.setAttribute("aria-busy", "true");
            }
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: "180px" },
      )
    : null;

  lazyImages.forEach((image) => {
    const container = image.closest(indicatorContainers);
    if (!container) return;

    const veil = document.createElement("span");
    const loader = document.createElement("span");
    veil.className = "lazy-media__veil";
    veil.setAttribute("aria-hidden", "true");
    loader.className = "lazy-media__loader";
    loader.setAttribute("aria-hidden", "true");
    container.append(veil, loader);

    const finishLoading = async () => {
      try {
        await image.decode();
      } catch {
        // A failed decode is handled like a failed load so the indicator cannot hang.
      }
      container.removeAttribute("aria-busy");
      observer?.unobserve(image);

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        container.classList.remove("is-media-loading");
        container.classList.add("is-media-loaded");
        return;
      }

      container.classList.remove("is-media-loading");
      container.classList.add("is-media-revealing");
      window.setTimeout(() => container.classList.add("is-media-loaded"), 230);
      window.setTimeout(() => container.classList.remove("is-media-revealing"), 720);
    };

    container.classList.add("lazy-media");

    if (image.complete) {
      void finishLoading();
      return;
    }

    image.addEventListener("load", () => void finishLoading(), { once: true });
    image.addEventListener("error", () => void finishLoading(), { once: true });

    if (observer) {
      observer.observe(image);
    } else {
      container.classList.add("is-media-loading");
      container.setAttribute("aria-busy", "true");
    }
  });
};

const setupScrollComparisons = () => {
  if (!scrollComparisons.length) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const comparisonMetrics = new WeakMap();
  const comparisonProgressCache = new WeakMap();
  let isTicking = false;
  let comparisonViewportHeight = window.innerHeight || document.documentElement.clientHeight;
  let hasHiddenHeaderForComparison = false;

  const clampProgress = (value) => Math.min(1, Math.max(0, value));
  const clampOffset = (value, min, max) => Math.min(max, Math.max(min, value));
  const getComparisonNumber = (element, key, fallback) => {
    const value = Number.parseFloat(element.dataset[key]);
    return Number.isFinite(value) ? value : fallback;
  };

  const easeComparisonProgress = (value) => {
    return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
  };

  const alignComparisonImages = (section) => {
    const stage = section.querySelector(".comparison-hook__stage");
    if (!(stage instanceof HTMLElement)) return;

    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    if (!stageWidth || !stageHeight) return;

    const targetX = stageWidth * (getComparisonNumber(section, "comparisonTargetX", 50) / 100);
    const targetY = stageHeight * (getComparisonNumber(section, "comparisonTargetY", 0) / 100);

    section.querySelectorAll(".comparison-hook__image").forEach((image) => {
      if (!(image instanceof HTMLImageElement) || !image.naturalWidth || !image.naturalHeight) return;

      const scale = Math.max(stageWidth / image.naturalWidth, stageHeight / image.naturalHeight);
      const renderedWidth = image.naturalWidth * scale;
      const renderedHeight = image.naturalHeight * scale;
      const sourceWidth = getComparisonNumber(image, "comparisonSourceWidth", image.naturalWidth) || image.naturalWidth;
      const sourceHeight = getComparisonNumber(image, "comparisonSourceHeight", image.naturalHeight) || image.naturalHeight;
      const anchorSourceX = getComparisonNumber(image, "comparisonAnchorX", sourceWidth / 2);
      const anchorSourceY = getComparisonNumber(image, "comparisonAnchorY", 0);
      const anchorX = image.naturalWidth * (anchorSourceX / sourceWidth);
      const anchorY = image.naturalHeight * (anchorSourceY / sourceHeight);
      const offsetX = clampOffset(targetX - anchorX * scale, stageWidth - renderedWidth, 0);
      const offsetY = clampOffset(targetY - anchorY * scale, stageHeight - renderedHeight, 0);

      image.style.setProperty("--comparison-image-width", `${renderedWidth.toFixed(2)}px`);
      image.style.setProperty("--comparison-image-height", `${renderedHeight.toFixed(2)}px`);
      image.style.setProperty("--comparison-image-x", `${offsetX.toFixed(2)}px`);
      image.style.setProperty("--comparison-image-y", `${offsetY.toFixed(2)}px`);
      image.classList.add("is-comparison-image-aligned");
    });
  };

  const measureComparisons = () => {
    comparisonViewportHeight = window.innerHeight || document.documentElement.clientHeight;
    scrollComparisons.forEach((section) => {
      alignComparisonImages(section);
      comparisonMetrics.set(section, {
        scrollableDistance: Math.max(1, section.offsetHeight - comparisonViewportHeight),
      });
    });
  };

  const setComparisonProgress = (section, rawProgress) => {
    const progress = clampProgress(rawProgress);
    const easedProgress = easeComparisonProgress(progress);
    const anyComparisonActive = rawProgress > 0.02 && rawProgress < 1.08;
    const progressKey = Math.round(easedProgress * 1000);
    const isModelComparison = section.hasAttribute("data-three-model-comparison");

    if (comparisonProgressCache.get(section) === progressKey) return anyComparisonActive;
    comparisonProgressCache.set(section, progressKey);

    const reveal = easedProgress * 100;
    const maskSolid = Math.min(100, Math.max(0, reveal - 14));
    const maskEnd = Math.min(100, Math.max(0, reveal + 10));
    const maskStartFromLeft = 100 - maskEnd;
    const maskRevealFromLeft = 100 - reveal;
    const maskSolidFromLeft = 100 - maskSolid;
    const edge = Math.min(98, Math.max(2, maskRevealFromLeft));
    const blendStrength = Math.sin(easedProgress * Math.PI);
    const renderCopyFade = Math.min(1, progress * 1.45);
    const photoCopyFade = clampProgress((progress - 0.32) / 0.28);
    const modelPhotoFade = clampProgress((progress - 0.56) / 0.32);
    const modelBackgroundFade = clampProgress((progress - 0.5) / 0.3);
    const modelPhotoCopyFade = clampProgress((progress - 0.68) / 0.22);

    section.style.setProperty("--comparison-progress", easedProgress.toFixed(4));
    section.style.setProperty("--comparison-render-copy-opacity", (1 - renderCopyFade).toFixed(3));
    section.style.setProperty("--comparison-render-copy-offset", `${(-18 * renderCopyFade).toFixed(2)}px`);
    section.style.setProperty("--comparison-cue-opacity", (1 - Math.min(1, progress * 2.2)).toFixed(3));

    if (isModelComparison) {
      const modelRenderCopyFade = clampProgress(progress / 0.34);
      const modelPlanningCopyIn = easeComparisonProgress(clampProgress((progress - 0.38) / 0.16));
      const modelPlanningCopyOut = easeComparisonProgress(clampProgress((progress - 0.7) / 0.14));
      section.style.setProperty("--comparison-reveal", "100%");
      section.style.setProperty("--comparison-edge", "50%");
      section.style.setProperty("--comparison-mask-start", "0%");
      section.style.setProperty("--comparison-mask-reveal", "0%");
      section.style.setProperty("--comparison-mask-solid", "100%");
      section.style.setProperty("--comparison-blend-opacity", "0");
      section.style.setProperty("--comparison-render-opacity", "1");
      section.style.setProperty("--comparison-render-copy-opacity", (1 - easeComparisonProgress(modelRenderCopyFade)).toFixed(3));
      section.style.setProperty("--comparison-render-copy-offset", `${(-18 * modelRenderCopyFade).toFixed(2)}px`);
      section.style.setProperty("--comparison-planning-copy-opacity", (modelPlanningCopyIn * (1 - modelPlanningCopyOut)).toFixed(3));
      section.style.setProperty("--comparison-planning-copy-offset", `${(22 - 22 * modelPlanningCopyIn - 16 * modelPlanningCopyOut).toFixed(2)}px`);
      section.style.setProperty("--comparison-photo-opacity", easeComparisonProgress(modelPhotoFade).toFixed(3));
      section.style.setProperty("--comparison-photo-copy-opacity", easeComparisonProgress(modelPhotoCopyFade).toFixed(3));
      section.style.setProperty("--comparison-photo-copy-offset", `${(22 - 22 * modelPhotoCopyFade).toFixed(2)}px`);
      section.style.setProperty("--model-background-opacity", (1 - easeComparisonProgress(modelBackgroundFade)).toFixed(3));
      section.style.setProperty("--model-layer-opacity", "1");
    } else {
      section.style.setProperty("--comparison-reveal", `${reveal.toFixed(2)}%`);
      section.style.setProperty("--comparison-edge", `${edge.toFixed(2)}%`);
      section.style.setProperty("--comparison-mask-start", `${maskStartFromLeft.toFixed(2)}%`);
      section.style.setProperty("--comparison-mask-reveal", `${maskRevealFromLeft.toFixed(2)}%`);
      section.style.setProperty("--comparison-mask-solid", `${maskSolidFromLeft.toFixed(2)}%`);
      section.style.setProperty("--comparison-blend-opacity", (blendStrength * 0.64).toFixed(3));
      section.style.setProperty("--comparison-render-opacity", (1 - easedProgress * 0.2).toFixed(3));
      section.style.setProperty("--comparison-photo-opacity", Math.min(1, easedProgress * 1.18).toFixed(3));
      section.style.setProperty("--comparison-photo-copy-opacity", photoCopyFade.toFixed(3));
      section.style.setProperty("--comparison-photo-copy-offset", `${(22 - 22 * photoCopyFade).toFixed(2)}px`);
    }

    section.classList.toggle("is-comparing", progress > 0.03 && progress < 0.97);
    section.classList.toggle("is-revealed", progress > 0.9);
    return anyComparisonActive;
  };

  const updateComparisons = () => {
    let hasActiveComparison = false;

    scrollComparisons.forEach((section) => {
      const metrics = comparisonMetrics.get(section);
      const rect = section.getBoundingClientRect();
      const scrollableDistance = metrics?.scrollableDistance || Math.max(1, rect.height - comparisonViewportHeight);
      const progress = -rect.top / scrollableDistance;
      hasActiveComparison = setComparisonProgress(section, progress) || hasActiveComparison;
    });

    if (hasActiveComparison !== hasHiddenHeaderForComparison) {
      document.body.classList.toggle("has-scroll-comparison-active", hasActiveComparison);
      hasHiddenHeaderForComparison = hasActiveComparison;
    }
    isTicking = false;
  };

  const requestComparisonUpdate = () => {
    if (isTicking) return;
    isTicking = true;
    window.requestAnimationFrame(updateComparisons);
  };

  scrollComparisons.forEach((section) => {
    section.querySelectorAll(".comparison-hook__image").forEach((image) => {
      if (!(image instanceof HTMLImageElement) || image.complete) return;
      image.addEventListener("load", () => alignComparisonImages(section), { once: true });
    });
  });

  measureComparisons();

  if (reducedMotion.matches) {
    scrollComparisons.forEach((section) => {
      section.classList.add("is-revealed");
    });
    return;
  }

  updateComparisons();
  window.addEventListener("scroll", requestComparisonUpdate, { passive: true });
  window.addEventListener("resize", () => {
    measureComparisons();
    requestComparisonUpdate();
  });
  window.addEventListener("orientationchange", () => {
    measureComparisons();
    requestComparisonUpdate();
  });
  window.addEventListener("modelcomparisonready", () => {
    measureComparisons();
    requestComparisonUpdate();
  });
  window.addEventListener("modelcomparisonfallback", () => {
    measureComparisons();
    requestComparisonUpdate();
  });

  comparisonScrollCues.forEach((cue) => {
    cue.addEventListener("click", (event) => {
      const section = cue.closest("[data-scroll-comparison]");
      if (!(section instanceof HTMLElement)) return;
      event.preventDefault();
      const targetScroll = window.scrollY + section.getBoundingClientRect().top + window.innerHeight * 0.58;
      const behavior = reducedMotion.matches ? "auto" : "smooth";
      try {
        window.scrollTo({ top: targetScroll, behavior });
      } catch {
        window.scrollTo(0, targetScroll);
      }
    });
  });
};

const setupDocumentProcesses = () => {
  document.querySelectorAll("[data-doc-process]").forEach((process) => {
    const cards = Array.from(process.querySelectorAll(".doc-card"));
    const panelTimers = new WeakMap();

    const clearPanelTimer = (panel) => {
      const timer = panelTimers.get(panel);
      if (!timer) return;
      window.clearTimeout(timer);
      panelTimers.delete(panel);
    };

    const setPanelHeight = (panel, value) => {
      panel.style.setProperty("--doc-details-height", value);
    };

    const openPanel = (card, panel, shouldAnimate) => {
      clearPanelTimer(panel);
      panel.hidden = false;

      if (!shouldAnimate) {
        panel.classList.remove("is-collapsing");
        panel.style.removeProperty("--doc-details-height");
        return;
      }

      panel.classList.add("is-collapsing");
      setPanelHeight(panel, "0px");
      panel.getBoundingClientRect();

      window.requestAnimationFrame(() => {
        if (!card.classList.contains("is-active")) return;
        panel.classList.remove("is-collapsing");
        window.requestAnimationFrame(() => {
          if (!card.classList.contains("is-active")) return;
          setPanelHeight(panel, `${panel.scrollHeight}px`);
        });
      });

      const timer = window.setTimeout(() => {
        if (card.classList.contains("is-active")) {
          panel.style.removeProperty("--doc-details-height");
        }
        panelTimers.delete(panel);
      }, 390);

      panelTimers.set(panel, timer);
    };

    const closePanel = (card, panel, shouldAnimate) => {
      clearPanelTimer(panel);

      if (panel.hidden) return;

      if (!shouldAnimate) {
        panel.hidden = true;
        panel.classList.remove("is-collapsing");
        panel.style.removeProperty("--doc-details-height");
        return;
      }

      setPanelHeight(panel, `${panel.scrollHeight}px`);
      panel.getBoundingClientRect();
      panel.classList.add("is-collapsing");
      setPanelHeight(panel, "0px");

      const timer = window.setTimeout(() => {
        if (!card.classList.contains("is-active")) {
          panel.hidden = true;
          panel.classList.remove("is-collapsing");
          panel.style.removeProperty("--doc-details-height");
        }
        panelTimers.delete(panel);
      }, 320);

      panelTimers.set(panel, timer);
    };

    const activateStep = (activeIndex, shouldScroll = false, shouldAnimate = true) => {
      cards.forEach((card, index) => {
        const trigger = card.querySelector("[data-doc-step-trigger]");
        const panel = card.querySelector("[data-doc-step-panel]");
        const isActive = index === activeIndex;

        card.classList.toggle("is-active", isActive);

        if (trigger instanceof HTMLButtonElement) {
          trigger.setAttribute("aria-expanded", String(isActive));
        }

        if (panel instanceof HTMLElement) {
          if (isActive) {
            openPanel(card, panel, shouldAnimate);
          } else {
            closePanel(card, panel, shouldAnimate);
          }
        }
      });

      if (activeIndex < 0 || !shouldScroll || !window.matchMedia("(max-width: 780px)").matches) return;
      window.setTimeout(() => {
        cards[activeIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 0);
    };

    cards.forEach((card, index) => {
      const trigger = card.querySelector("[data-doc-step-trigger]");

      if (trigger instanceof HTMLButtonElement) {
        trigger.addEventListener("click", () => {
          activateStep(card.classList.contains("is-active") ? -1 : index, true);
        });
      }
    });

    const initialIndex = cards.findIndex((card) => card.classList.contains("is-active"));
    activateStep(initialIndex, false, false);
  });
};

personalProjectsFeature.forEach((element) => {
  element.hidden = !showPersonalProjects;
});

setupLazyImageIndicators();
setupScrollComparisons();
setupDocumentProcesses();

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
