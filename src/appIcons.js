export const DEFAULT_APP_ICON_ID = 'polygot';

// Blank-center Polygot folded-P badge shell (256x256 quantized RGBA PNG) so custom
// language/symbol icons keep the exact same Polygot gradient, lavender ring, and 3D fold.
const POLYGOT_SHELL_DATA_URL = 'data:image/png;base64,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';

export const APP_ICON_PRESETS = [
  {
    id: 'polygot',
    glyph: 'A文',
    label: 'Polygot',
    isDefault: true,
    customImage: './assets/icons/polygot-icon.svg',
    fontFamily: "'Fredoka', 'Nunito', 'Noto Sans', sans-serif",
    bubbleFontSize: 74,
    bubbleY: 254
  },
  {
    id: 'ml',
    glyph: 'അ',
    label: 'Malayalam',
    fontFamily: "'Noto Sans Malayalam', 'Manjari', 'Noto Sans', sans-serif",
    bubbleFontSize: 66,
    bubbleY: 250
  },
  {
    id: 'en',
    glyph: 'A',
    label: 'English',
    fontFamily: "'Fredoka', 'Nunito', 'Noto Sans', sans-serif",
    bubbleFontSize: 88,
    bubbleY: 260
  },
  {
    id: 'ta',
    glyph: 'அ',
    label: 'Tamil',
    fontFamily: "'Noto Sans Tamil', 'Noto Sans', sans-serif",
    bubbleFontSize: 74,
    bubbleY: 254
  },
  {
    id: 'kn',
    glyph: 'ಅ',
    label: 'Kannada',
    fontFamily: "'Noto Sans Kannada', 'Noto Sans', sans-serif",
    bubbleFontSize: 78,
    bubbleY: 252
  },
  {
    id: 'te',
    glyph: 'అ',
    label: 'Telugu',
    fontFamily: "'Noto Sans Telugu', 'Noto Sans', sans-serif",
    bubbleFontSize: 78,
    bubbleY: 252
  },
  {
    id: 'hi',
    glyph: 'अ',
    label: 'Hindi',
    fontFamily: "'Noto Sans Devanagari', 'Noto Sans', sans-serif",
    bubbleFontSize: 82,
    bubbleY: 256
  },
  {
    id: 'ja',
    glyph: 'あ',
    label: 'Japanese',
    fontFamily: "'Noto Sans CJK JP', 'Hiragino Kaku Gothic ProN', 'Noto Sans', sans-serif",
    bubbleFontSize: 82,
    bubbleY: 258
  },
  {
    id: 'zh',
    glyph: '中',
    label: 'Chinese',
    fontFamily: "'Noto Sans CJK SC', 'PingFang SC', 'Noto Sans', sans-serif",
    bubbleFontSize: 84,
    bubbleY: 258
  },
  {
    id: 'ko',
    glyph: '한',
    label: 'Korean',
    fontFamily: "'Noto Sans CJK KR', 'Apple SD Gothic Neo', 'Noto Sans', sans-serif",
    bubbleFontSize: 82,
    bubbleY: 258
  },
  {
    id: 'ar',
    glyph: 'ع',
    label: 'Arabic',
    fontFamily: "'Noto Sans Arabic', 'Noto Sans', sans-serif",
    bubbleFontSize: 80,
    bubbleY: 242
  },
  {
    id: 'es',
    glyph: 'Ñ',
    label: 'Spanish',
    fontFamily: "'Fredoka', 'Nunito', 'Noto Sans', sans-serif",
    bubbleFontSize: 82,
    bubbleY: 262
  },
  {
    id: 'fr',
    glyph: 'É',
    label: 'French',
    fontFamily: "'Fredoka', 'Nunito', 'Noto Sans', sans-serif",
    bubbleFontSize: 82,
    bubbleY: 262
  },
  {
    id: 'ru',
    glyph: 'Я',
    label: 'Russian',
    fontFamily: "'Fredoka', 'Nunito', 'Noto Sans', sans-serif",
    bubbleFontSize: 86,
    bubbleY: 260
  },
  {
    id: 'star',
    glyph: '★',
    label: 'Star',
    fontFamily: "'Noto Sans Symbols 2', 'Noto Sans Symbols', 'DejaVu Sans', sans-serif",
    bubbleFontSize: 90,
    bubbleY: 260
  },
  {
    id: 'diamond',
    glyph: '◆',
    label: 'Diamond',
    fontFamily: "'Noto Sans Symbols 2', 'Noto Sans Symbols', 'DejaVu Sans', sans-serif",
    bubbleFontSize: 88,
    bubbleY: 256
  },
  {
    id: 'triangle',
    glyph: '▲',
    label: 'Triangle',
    fontFamily: "'Noto Sans Symbols 2', 'Noto Sans Symbols', 'DejaVu Sans', sans-serif",
    bubbleFontSize: 82,
    bubbleY: 254
  }
];

const iconUrlCache = new Map();

function getBubbleMetrics(preset) {
  const fSize = Number(preset?.bubbleFontSize) || Math.round((Number(preset?.fontSize) || 220) * 0.36);
  const bY = Number(preset?.bubbleY) || 256;
  return { fontSize: fSize, y: bY, x: 298 };
}

export function syncLanguageAppIcons(languages = []) {
  if (!Array.isArray(languages) || !languages.length) return APP_ICON_PRESETS;
  const symbolIds = new Set(['star', 'diamond', 'triangle']);
  let insertIdx = APP_ICON_PRESETS.findIndex((p) => symbolIds.has(p.id));
  if (insertIdx < 0) insertIdx = APP_ICON_PRESETS.length;

  languages.forEach((lang) => {
    const code = String(lang?.code || '').trim();
    const ic = lang?.icon;
    if (!code || !ic?.glyph) return;
    const existing = APP_ICON_PRESETS.find((p) => p.id === code);
    if (existing) {
      existing.glyph = ic.glyph;
      existing.label = lang.name || existing.label;
      if (ic.fontFamily) existing.fontFamily = ic.fontFamily;
      if (ic.bubbleFontSize) existing.bubbleFontSize = Number(ic.bubbleFontSize);
      if (ic.bubbleY) existing.bubbleY = Number(ic.bubbleY);
      iconUrlCache.delete(code);
    } else {
      APP_ICON_PRESETS.splice(insertIdx, 0, {
        id: code,
        glyph: ic.glyph,
        label: lang.name || code.toUpperCase(),
        fontFamily: ic.fontFamily || "'Fredoka', 'Nunito', 'Noto Sans', sans-serif",
        bubbleFontSize: Number(ic.bubbleFontSize) || Math.round((Number(ic.fontSize) || 220) * 0.36),
        bubbleY: Number(ic.bubbleY) || 256
      });
      insertIdx += 1;
    }
  });
  return APP_ICON_PRESETS;
}

export function getAppIconPreset(idOrGlyph) {
  if (!idOrGlyph) return APP_ICON_PRESETS[0];
  const found = APP_ICON_PRESETS.find((p) => p.id === idOrGlyph || p.glyph === idOrGlyph);
  return found || APP_ICON_PRESETS[0];
}

export function findPresetByGlyph(glyph) {
  if (!glyph) return null;
  return APP_ICON_PRESETS.find((p) => p.glyph === glyph) || null;
}

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildAppIconSvg(preset) {
  const p = preset || APP_ICON_PRESETS[0];
  const { fontSize, y, x } = getBubbleMetrics(p);
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">',
    `  <image href="${POLYGOT_SHELL_DATA_URL}" x="0" y="0" width="512" height="512" />`,
    `  <text x="${x}" y="${y}" text-anchor="middle" fill="#ffffff" font-family="${escapeXml(p.fontFamily)}" font-size="${fontSize}" font-weight="900">${escapeXml(p.glyph)}</text>`,
    '</svg>'
  ].join('\n');
}

export function getAppIconDataUrl(idOrGlyph) {
  const preset = getAppIconPreset(idOrGlyph);
  if (preset.id === DEFAULT_APP_ICON_ID) {
    return './assets/icons/polygot-icon.svg';
  }
  if (iconUrlCache.has(preset.id)) {
    return iconUrlCache.get(preset.id);
  }
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildAppIconSvg(preset))}`;
  iconUrlCache.set(preset.id, url);
  return url;
}

let cachedShellImgPromise = null;
function loadShellImage() {
  if (cachedShellImgPromise) return cachedShellImgPromise;
  cachedShellImgPromise = new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = POLYGOT_SHELL_DATA_URL;
  });
  return cachedShellImgPromise;
}

async function renderIconPngDataUrl(preset, size = 192) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const scale = size / 512;
    ctx.clearRect(0, 0, size, size);

    const shellImg = await loadShellImage();
    if (shellImg) {
      ctx.drawImage(shellImg, 0, 0, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(256 * scale, 256 * scale, 224 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#7c27f2';
      ctx.fill();
      ctx.lineWidth = 26 * scale;
      ctx.strokeStyle = '#c084fc';
      ctx.stroke();
    }

    const { fontSize, y, x } = getBubbleMetrics(preset);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `900 ${Math.round(fontSize * scale)}px ${preset.fontFamily}`;
    ctx.fillText(preset.glyph, x * scale, y * scale);

    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

export function applyDocumentAppIcon(idOrGlyph, { syncNative = false } = {}) {
  const preset = getAppIconPreset(idOrGlyph);
  if (typeof document !== 'undefined') {
    const svgHref = getAppIconDataUrl(preset.id);
    let svgLink = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
    if (!svgLink) {
      svgLink = document.createElement('link');
      svgLink.rel = 'icon';
      svgLink.type = 'image/svg+xml';
      document.head.appendChild(svgLink);
    }
    svgLink.href = svgHref;

    const pngLink = document.querySelector('link[rel="icon"][type="image/png"]');
    const touchLink = document.querySelector('link[rel="apple-touch-icon"]');
    if (preset.id === DEFAULT_APP_ICON_ID) {
      if (pngLink) pngLink.href = './assets/icons/polygot-192.png';
      if (touchLink) touchLink.href = './assets/icons/polygot-192.png';
    } else {
      renderIconPngDataUrl(preset, 192).then((pngDataUrl) => {
        if (!pngDataUrl) return;
        if (pngLink) pngLink.href = pngDataUrl;
        if (touchLink) touchLink.href = pngDataUrl;
      });
    }
  }

  if (
    syncNative &&
    typeof window !== 'undefined' &&
    window.AndroidAppIcon &&
    typeof window.AndroidAppIcon.setAppIcon === 'function'
  ) {
    try {
      window.AndroidAppIcon.setAppIcon(preset.id);
    } catch {
      // Ignore native bridge error on unsupported launcher
    }
  }
  return preset;
}
