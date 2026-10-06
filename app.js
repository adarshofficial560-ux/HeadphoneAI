/**
 * SONY WH-1000XM6 - Apple-Grade Pure Dark Scrollytelling Engine
 * Fixed Background Canvas with Dynamic 3D Expanding Headphone Animation
 */

(function () {
  'use strict';

  const TOTAL_FRAMES = 300;
  const FRAME_PREFIX = 'ezgif-frame-';
  const FRAME_EXT = '.jpg';

  function getFrameFilename(index) {
    const padded = String(index).padStart(3, '0');
    return `${FRAME_PREFIX}${padded}${FRAME_EXT}`;
  }

  const state = {
    images: [],
    loadedIndices: new Set(),
    isLoaded: false,
    currentFrame: 1,
    targetFrame: 1,
    scrollProgress: 0
  };

  const preloader = document.getElementById('preloader');
  const loaderFill = document.getElementById('loaderFill');
  const loaderPercent = document.getElementById('loaderPercent');
  const navbar = document.getElementById('navbar');
  const scrollyTrack = document.getElementById('scrollyTrack');
  const canvas = document.getElementById('headphoneCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  // --- Preloading ---
  function preloadImages() {
    let loaded = 0;

    const firstImg = new Image();
    firstImg.src = getFrameFilename(1);
    firstImg.onload = () => {
      state.images[1] = firstImg;
      state.loadedIndices.add(1);
      drawFrame(1, 0);
    };

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFrameFilename(i);

      img.onload = () => {
        loaded++;
        state.loadedIndices.add(i);
        state.images[i] = img;

        const pct = Math.round((loaded / TOTAL_FRAMES) * 100);
        if (loaderFill) loaderFill.style.width = `${pct}%`;
        if (loaderPercent) loaderPercent.textContent = `${pct}%`;

        if (loaded === 1 || Math.round(state.currentFrame) === i) {
          drawFrame(state.currentFrame, state.scrollProgress);
        }

        if (loaded >= Math.min(20, TOTAL_FRAMES) && !state.isLoaded) {
          state.isLoaded = true;
          if (preloader) preloader.classList.add('loaded');
        }
      };

      img.onerror = () => {
        loaded++;
      };

      state.images[i] = img;
    }
  }

  function getBestAvailableImage(targetIndex) {
    const clamped = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(targetIndex)));
    if (state.images[clamped] && state.images[clamped].complete && state.images[clamped].naturalWidth > 0) {
      return state.images[clamped];
    }

    for (let r = 1; r < TOTAL_FRAMES; r++) {
      const low = clamped - r;
      const high = clamped + r;
      if (low >= 1 && state.images[low] && state.images[low].complete && state.images[low].naturalWidth > 0) {
        return state.images[low];
      }
      if (high <= TOTAL_FRAMES && state.images[high] && state.images[high].complete && state.images[high].naturalWidth > 0) {
        return state.images[high];
      }
    }
    return state.images[1];
  }

  let canvasW = 0;
  let canvasH = 0;

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasW = window.innerWidth;
    canvasH = window.innerHeight;

    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;

    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    drawFrame(state.currentFrame, state.scrollProgress);
  }

  function drawFrame(frameIndex, progress = 0) {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const img = getBestAvailableImage(frameIndex);
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const screenAspect = canvasW / canvasH;

    // --- Dynamic 3D Expansion on Scroll ---
    const expansionFactor = 1.0 + Math.sin(progress * Math.PI) * 0.22;

    let baseW, baseH;
    if (screenAspect > imgAspect) {
      baseH = canvasH * 0.86;
      baseW = baseH * imgAspect;
    } else {
      baseW = canvasW * 0.94;
      baseH = baseW / imgAspect;
    }

    const drawW = baseW * expansionFactor;
    const drawH = baseH * expansionFactor;

    const drawX = (canvasW - drawW) / 2;
    const drawY = (canvasH - drawH) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  function updateScroll() {
    if (!scrollyTrack) return;

    const rect = scrollyTrack.getBoundingClientRect();
    const totalScrollable = rect.height - window.innerHeight;

    if (totalScrollable <= 0) return;

    const scrolled = -rect.top;
    let progress = scrolled / totalScrollable;
    progress = Math.max(0, Math.min(1, progress));

    state.scrollProgress = progress;
    state.targetFrame = 1 + progress * (TOTAL_FRAMES - 1);

    if (window.scrollY > 30) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  let lastDrawnFrame = -1;
  let lastProgress = -1;

  function renderLoop() {
    const diff = state.targetFrame - state.currentFrame;

    if (Math.abs(diff) > 0.005) {
      state.currentFrame += diff * 0.16;
    } else {
      state.currentFrame = state.targetFrame;
    }

    const currentRounded = Math.round(state.currentFrame);
    if (currentRounded !== lastDrawnFrame || Math.abs(state.scrollProgress - lastProgress) > 0.002) {
      drawFrame(state.currentFrame, state.scrollProgress);
      lastDrawnFrame = currentRounded;
      lastProgress = state.scrollProgress;
    }

    requestAnimationFrame(renderLoop);
  }

  function setupNavLinks() {
    document.querySelectorAll('[data-scroll-to]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-scroll-to');

        if (target.startsWith('frame:')) {
          const targetPct = parseFloat(target.replace('frame:', ''));
          const rect = scrollyTrack.getBoundingClientRect();
          const targetY = window.scrollY + rect.top + (rect.height - window.innerHeight) * targetPct;
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        } else {
          const el = document.getElementById(target);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  function init() {
    preloadImages();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('scroll', updateScroll, { passive: true });

    setupNavLinks();

    updateScroll();
    renderLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
