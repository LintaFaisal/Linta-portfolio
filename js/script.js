/* ==========================================================
   Linta Portfolio — script.js
   Project content lives in the data-* attributes on each
   .project-card in index.html — edit it there.
   ========================================================== */

(function () {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- footer year ---------- */
  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- mobile menu ---------- */
  const menuToggle = document.querySelector(".menu-toggle");
  const mainNav = document.querySelector(".main-nav");

  function setMenu(open) {
    body.classList.toggle("menu-open", open);
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    }
  }

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => setMenu(!body.classList.contains("menu-open")));
    mainNav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
    window.matchMedia("(min-width: 801px)").addEventListener("change", () => setMenu(false));
  }

  /* ---------- scroll reveal ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  /* ---------- project filters ---------- */
  const filterBtns = document.querySelectorAll(".filter-btn");
  const cards = document.querySelectorAll(".project-card");

  filterBtns.forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.classList.contains("active")));
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");

      const filter = btn.dataset.filter;
      cards.forEach((card) => {
        const show = filter === "all" || card.dataset.category === filter;
        card.classList.toggle("hidden", !show);
        if (show) card.classList.add("visible"); // never leave a card invisible after filtering
      });
    });
  });

  /* ---------- cover images on the grid ----------
     If assets/projects/<name>-01.jpg exists, use it as the card cover
     and hide the placeholder. If it doesn't, the placeholder stays. */
  cards.forEach((card) => {
    const first = card.dataset.cover || (card.dataset.images || "").split("|")[0];
    const frame = card.querySelector(".project-image");
    const placeholder = card.querySelector(".image-placeholder");
    if (!first || !frame) return;

    const img = new Image();
    img.alt = "";
    img.addEventListener("load", () => {
      frame.insertBefore(img, frame.firstChild);
      if (placeholder) placeholder.remove();
    });
    img.src = first;
  });

  /* ---------- case study modal ---------- */
  const modal = document.querySelector(".project-modal");
  const modalClose = document.querySelector(".modal-close");
  const modalBackdrop = document.querySelector(".modal-backdrop");
  const gallery = document.querySelector("#modalGallery");
  const panel = document.querySelector(".case-study-panel");
  let lastFocused = null;
  let zoomList = []; // loaded gallery images, in order, for the zoom viewer

  function fillModal(card) {
    const d = card.dataset;
    document.querySelector("#modalType").textContent = d.type || "PROJECT";
    document.querySelector("#modalTitle").textContent = d.title || "";
    document.querySelector("#modalDescription").textContent = d.description || "";
    document.querySelector("#modalStory").textContent = d.story || "";
    document.querySelector("#modalRole").textContent = d.role || "";

    gallery.classList.remove("portrait", "post", "square");
    if (d.layout) gallery.classList.add(d.layout);
    gallery.innerHTML = "";
    zoomList = [];
    const images = (d.images || "").split("|").filter(Boolean);

    images.forEach((src, i) => {
      const item = document.createElement("div");
      item.className = "gallery-card";

      const placeholder = document.createElement("div");
      placeholder.className = "image-placeholder";
      const label = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = d.title;
      const small = document.createElement("small");
      small.textContent = "IMAGE " + String(i + 1).padStart(2, "0") + " · add your artwork here";
      label.append(strong, small);
      placeholder.appendChild(label);
      item.appendChild(placeholder);

      const img = new Image();
      img.alt = d.title + " project image " + (i + 1);
      img.addEventListener("load", () => {
        placeholder.remove();
        item.appendChild(img);

        // make this image zoomable
        zoomList.push({ src: src, alt: img.alt, order: i, el: item });
        zoomList.sort((a, b) => a.order - b.order);
        item.classList.add("zoomable");
        item.tabIndex = 0;
        item.setAttribute("role", "button");
        item.setAttribute("aria-label", "Zoom image " + (i + 1) + " of " + d.title);
        item.addEventListener("click", () => openLightbox(src));
        item.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openLightbox(src);
          }
        });
      });
      img.src = src; // if it fails to load, the placeholder just stays
      gallery.appendChild(item);
    });
  }


  /* ---------- zoom viewer (lightbox) ---------- */
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.setAttribute("aria-hidden", "true");
  lb.setAttribute("role", "dialog");
  lb.setAttribute("aria-modal", "true");
  lb.setAttribute("aria-label", "Image viewer");
  lb.innerHTML =
    '<div class="lb-backdrop"></div>' +
    '<button type="button" class="lb-close" aria-label="Close image">×</button>' +
    '<button type="button" class="lb-nav lb-prev" aria-label="Previous image">←</button>' +
    '<button type="button" class="lb-nav lb-next" aria-label="Next image">→</button>' +
    '<div class="lb-stage"><img class="lb-img" alt="" draggable="false"></div>' +
    '<p class="lb-caption"></p>';
  body.appendChild(lb);

  const lbImg = lb.querySelector(".lb-img");
  const lbStage = lb.querySelector(".lb-stage");
  const lbCaption = lb.querySelector(".lb-caption");
  const lbClose = lb.querySelector(".lb-close");
  const lbPrev = lb.querySelector(".lb-prev");
  const lbNext = lb.querySelector(".lb-next");
  let lbIndex = 0;
  let lbZoomed = false;
  let lbBase = null;
  let lbReturn = null;
  const ZOOM = 2.4;

  function lbIsOpen() {
    return lb.classList.contains("open");
  }

  function setZoom(on, evt) {
    lbZoomed = on;
    lb.classList.toggle("zoomed", on);
    if (on) {
      lbBase = lbImg.getBoundingClientRect();
      moveOrigin(evt);
      lbImg.style.transform = "scale(" + ZOOM + ")";
    } else {
      lbImg.style.transform = "";
    }
  }

  function moveOrigin(evt) {
    if (!lbBase) return;
    const x = evt ? ((evt.clientX - lbBase.left) / lbBase.width) * 100 : 50;
    const y = evt ? ((evt.clientY - lbBase.top) / lbBase.height) * 100 : 50;
    lbImg.style.transformOrigin =
      Math.max(0, Math.min(100, x)) + "% " + Math.max(0, Math.min(100, y)) + "%";
  }

  function showLightbox(index) {
    if (!zoomList.length) return;
    lbIndex = (index + zoomList.length) % zoomList.length;
    const item = zoomList[lbIndex];
    setZoom(false);
    lbImg.src = item.src;
    lbImg.alt = item.alt;
    const title = document.querySelector("#modalTitle").textContent;
    lbCaption.textContent =
      title + " · " + (lbIndex + 1) + " / " + zoomList.length + " · click image to zoom";
    const many = zoomList.length > 1;
    lbPrev.hidden = !many;
    lbNext.hidden = !many;
  }

  function openLightbox(src) {
    const idx = zoomList.findIndex((z) => z.src === src);
    lbReturn = document.activeElement;
    showLightbox(idx < 0 ? 0 : idx);
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    lbClose.focus({ preventScroll: true });
  }

  function closeLightbox() {
    if (!lbIsOpen()) return;
    setZoom(false);
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    if (lbReturn && typeof lbReturn.focus === "function") lbReturn.focus({ preventScroll: true });
  }

  lbClose.addEventListener("click", closeLightbox);
  lb.querySelector(".lb-backdrop").addEventListener("click", closeLightbox);
  lbStage.addEventListener("click", (e) => {
    if (e.target === lbStage) closeLightbox(); // click outside the image
  });
  lbPrev.addEventListener("click", () => showLightbox(lbIndex - 1));
  lbNext.addEventListener("click", () => showLightbox(lbIndex + 1));
  lbImg.addEventListener("click", (e) => setZoom(!lbZoomed, e));
  lbStage.addEventListener("pointermove", (e) => {
    if (lbZoomed) moveOrigin(e);
  });

  function openCase(card) {
    lastFocused = document.activeElement;
    fillModal(card);
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    body.classList.add("modal-open");
    modal.scrollTop = 0;
    modalClose.focus({ preventScroll: true });
  }

  function closeCase() {
    if (!modal.classList.contains("open")) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    body.classList.remove("modal-open");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus({ preventScroll: true });
  }

  cards.forEach((card) => {
    const opener = card.querySelector(".project-open");
    if (opener) opener.addEventListener("click", () => openCase(card));
  });

  if (modal) {
    modalClose.addEventListener("click", closeCase);
    modalBackdrop.addEventListener("click", closeCase);

    // clicking empty space beside the panel also closes it
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeCase();
    });

    // "Let's talk" link inside the modal: close first, then jump to contact
    const modalContact = modal.querySelector(".case-contact");
    if (modalContact) modalContact.addEventListener("click", closeCase);

    document.addEventListener("keydown", (e) => {
      if (lbIsOpen()) {
        if (e.key === "Escape") closeLightbox();
        else if (e.key === "ArrowLeft") showLightbox(lbIndex - 1);
        else if (e.key === "ArrowRight") showLightbox(lbIndex + 1);
        else if (e.key === "Tab") {
          const f = Array.from(lb.querySelectorAll("button")).filter((b) => !b.hidden);
          const first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
        return;
      }

      if (!modal.classList.contains("open")) return;

      if (e.key === "Escape") {
        closeCase();
        return;
      }

      // keep Tab inside the dialog while it's open
      if (e.key === "Tab") {
        const focusable = panel.querySelectorAll("a[href], button:not([disabled])");
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ---------- custom cursor (mouse devices only) ---------- */
  const dot = document.querySelector(".cursor-dot");
  const star = document.querySelector(".cursor-star");

  if (dot && star && window.matchMedia("(pointer: fine)").matches && !reduceMotion) {
    root.classList.add("has-cursor");

    let mx = -100, my = -100, sx = -100, sy = -100;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = "translate(" + mx + "px," + my + "px)";
    });

    (function follow() {
      sx += (mx - sx) * 0.18;
      sy += (my - sy) * 0.18;
      star.style.transform = "translate(" + sx + "px," + sy + "px)";
      requestAnimationFrame(follow);
    })();

    // event delegation, so it also works on elements added later
    document.addEventListener("mouseover", (e) => {
      star.classList.toggle("big", !!e.target.closest("a, button, .zoomable, .lb-img"));
    });
  } else {
    if (dot) dot.remove();
    if (star) star.remove();
  }
})();
