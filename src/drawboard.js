/**
 * Interactive Character, Word & Sentence Handwriting Canvas (Duolingo-style).
 * Supports single-glyph square tracing (280x280) and wide word/sentence writing (520x170)
 * across Japanese, Spanish, Malayalam, and any community language.
 */

function computeFittedFont(ctx, text, maxWidth, maxHeight) {
  let size = Math.round(maxHeight * 0.64);
  const minSize = 26;
  const family = '"Noto Sans JP", "Noto Sans Malayalam", sans-serif';
  while (size > minSize) {
    ctx.font = `700 ${size}px ${family}`;
    const w = ctx.measureText(text).width;
    if (w <= maxWidth * 0.86) break;
    size -= 4;
  }
  return `700 ${size}px ${family}`;
}

export function mountDrawBoard(container, {
  glyph,
  width = 280,
  height = 280,
  ruled = false,
  guideMode = 'full',
  strokes = [],
  onStrokesChange
}) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = container.querySelector('#char-draw-canvas');
  if (!canvas) return null;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = '100%';
  canvas.style.maxWidth = `${width}px`;
  canvas.style.aspectRatio = `${width} / ${height}`;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  let currentStrokes = strokes.map((s) => s.map((pt) => ({ ...pt })));
  let activeStroke = null;
  let overlayResult = false;
  const inkWidth = ruled ? 7 : 13;

  function isLightTheme() {
    return document.body.classList.contains('theme-light');
  }

  function redraw() {
    ctx.clearRect(0, 0, width, height);

    // 1. Practice grid (crosshair square for single chars, ruled writing lines for words/sentences)
    ctx.save();
    ctx.strokeStyle = isLightTheme() ? 'rgba(15, 23, 42, 0.13)' : 'rgba(148, 163, 184, 0.18)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    if (ruled) {
      ctx.moveTo(14, height * 0.25);
      ctx.lineTo(width - 14, height * 0.25);
      ctx.moveTo(14, height * 0.52);
      ctx.lineTo(width - 14, height * 0.52);
      ctx.moveTo(14, height * 0.78);
      ctx.lineTo(width - 14, height * 0.78);
    } else {
      ctx.moveTo(width / 2, 10);
      ctx.lineTo(width / 2, height - 10);
      ctx.moveTo(10, height / 2);
      ctx.lineTo(width - 10, height / 2);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 2. Ghost trace guide
    if (guideMode !== 'off' || overlayResult) {
      ctx.save();
      const alpha = overlayResult ? 0.34 : guideMode === 'full' ? 0.25 : 0.1;
      ctx.fillStyle = overlayResult
        ? `rgba(16, 185, 129, ${alpha})`
        : isLightTheme()
          ? `rgba(15, 23, 42, ${alpha})`
          : `rgba(248, 250, 252, ${alpha})`;
      ctx.font = computeFittedFont(ctx, glyph, width, height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(glyph, width / 2, height / 2 + 3);
      ctx.restore();
    }

    // 3. User ink strokes
    ctx.save();
    ctx.strokeStyle = isLightTheme() ? '#059669' : '#34d399';
    ctx.lineWidth = inkWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const all = activeStroke ? [...currentStrokes, activeStroke] : currentStrokes;
    all.forEach((pts) => {
      if (!pts.length) return;
      ctx.beginPath();
      if (pts.length === 1) {
        ctx.arc(pts[0].x, pts[0].y, inkWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        return;
      }
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const midX = (pts[i].x + pts[i + 1].x) / 2;
        const midY = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    });
    ctx.restore();
  }

  function getPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    overlayResult = false;
    activeStroke = [getPoint(e)];
    redraw();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!activeStroke) return;
    e.preventDefault();
    const pt = getPoint(e);
    const prev = activeStroke[activeStroke.length - 1];
    if (Math.hypot(pt.x - prev.x, pt.y - prev.y) >= 2.2) {
      activeStroke.push(pt);
      redraw();
    }
  });

  function finishStroke(e) {
    if (!activeStroke) return;
    if (e) e.preventDefault();
    currentStrokes.push(activeStroke);
    activeStroke = null;
    if (onStrokesChange) onStrokesChange(currentStrokes);
    redraw();
  }

  canvas.addEventListener('pointerup', finishStroke);
  canvas.addEventListener('pointercancel', finishStroke);

  redraw();

  return {
    undo() {
      currentStrokes.pop();
      overlayResult = false;
      if (onStrokesChange) onStrokesChange(currentStrokes);
      redraw();
    },
    clear() {
      currentStrokes = [];
      activeStroke = null;
      overlayResult = false;
      if (onStrokesChange) onStrokesChange(currentStrokes);
      redraw();
    },
    setGuide(mode) {
      guideMode = mode;
      redraw();
    },
    showOverlay() {
      overlayResult = true;
      redraw();
    },
    evaluate() {
      const res = evaluateDrawing(glyph, currentStrokes, width, height, ruled);
      overlayResult = true;
      redraw();
      return res;
    },
    getStrokes() {
      return currentStrokes;
    }
  };
}

export function evaluateDrawing(glyph, strokes, displayW = 280, displayH = 280, isWordMode = false) {
  if (!strokes || strokes.length === 0) {
    return { passed: false, score: 0, feedback: 'Write on the board first before checking.' };
  }

  const scale = 0.5;
  const evalW = Math.round(displayW * scale);
  const evalH = Math.round(displayH * scale);

  function makeCanvas() {
    const c = document.createElement('canvas');
    c.width = evalW;
    c.height = evalH;
    return c;
  }

  const targetCoreCanvas = makeCanvas();
  const tc = targetCoreCanvas.getContext('2d');
  const fittedFont = computeFittedFont(tc, glyph, evalW, evalH);
  tc.fillStyle = '#000';
  tc.font = fittedFont;
  tc.textAlign = 'center';
  tc.textBaseline = 'middle';
  tc.fillText(glyph, evalW / 2, evalH / 2 + 2);
  const targetCore = tc.getImageData(0, 0, evalW, evalH).data;

  const targetHaloCanvas = makeCanvas();
  const th = targetHaloCanvas.getContext('2d');
  th.fillStyle = '#000';
  th.strokeStyle = '#000';
  th.lineJoin = 'round';
  th.lineWidth = isWordMode ? 16 : 22;
  th.font = fittedFont;
  th.textAlign = 'center';
  th.textBaseline = 'middle';
  th.strokeText(glyph, evalW / 2, evalH / 2 + 2);
  th.fillText(glyph, evalW / 2, evalH / 2 + 2);
  const targetHalo = th.getImageData(0, 0, evalW, evalH).data;

  function drawUser(lineWidth) {
    const uc = makeCanvas();
    const uctx = uc.getContext('2d');
    uctx.strokeStyle = '#000';
    uctx.fillStyle = '#000';
    uctx.lineWidth = lineWidth;
    uctx.lineCap = 'round';
    uctx.lineJoin = 'round';
    strokes.forEach((pts) => {
      if (!pts.length) return;
      uctx.beginPath();
      if (pts.length === 1) {
        uctx.arc(pts[0].x * scale, pts[0].y * scale, lineWidth / 2, 0, Math.PI * 2);
        uctx.fill();
        return;
      }
      uctx.moveTo(pts[0].x * scale, pts[0].y * scale);
      for (let i = 1; i < pts.length; i++) {
        uctx.lineTo(pts[i].x * scale, pts[i].y * scale);
      }
      uctx.stroke();
    });
    return uctx.getImageData(0, 0, evalW, evalH).data;
  }

  const userCore = drawUser(isWordMode ? 5 : 7);
  const userHalo = drawUser(isWordMode ? 14 : 19);

  let targetTotal = 0;
  let targetCovered = 0;
  let userTotal = 0;
  let userInsideHalo = 0;

  for (let i = 3; i < targetCore.length; i += 4) {
    const isTarget = targetCore[i] > 40;
    const isHalo = targetHalo[i] > 20;
    const isUser = userCore[i] > 40;
    const isUserWide = userHalo[i] > 40;

    if (isTarget) {
      targetTotal += 1;
      if (isUserWide) targetCovered += 1;
    }
    if (isUser) {
      userTotal += 1;
      if (isHalo) userInsideHalo += 1;
    }
  }

  const minInk = isWordMode ? 50 : 35;
  if (userTotal < minInk) {
    return { passed: false, score: 0, feedback: 'Draw full strokes across the guide before checking.' };
  }

  const coverage = targetTotal > 0 ? targetCovered / targetTotal : 0;
  const precision = userTotal > 0 ? userInsideHalo / userTotal : 0;
  const score = Math.min(100, Math.round((0.55 * coverage + 0.45 * precision) * 100));

  const minCov = isWordMode ? 0.42 : 0.48;
  const minPrec = isWordMode ? 0.50 : 0.55;
  const passScore = isWordMode ? 58 : 62;

  if (coverage < minCov) {
    return {
      passed: false,
      score,
      feedback: `Finish writing all strokes of "${glyph}" (${score}% match).`
    };
  }
  if (precision < minPrec) {
    return {
      passed: false,
      score,
      feedback: `Too much ink outside the guide (${score}% match) — trace closer to the outline.`
    };
  }
  if (score >= passScore) {
    return {
      passed: true,
      score,
      feedback: `Great handwriting! ${score}% stroke match!`
    };
  }
  return {
    passed: false,
    score,
    feedback: `Almost there (${score}% match) — compare with the green overlay and try again!`
  };
}
