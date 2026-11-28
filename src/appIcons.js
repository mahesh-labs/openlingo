export const DEFAULT_APP_ICON_ID = 'ml';

export const APP_ICON_PRESETS = [
  {
    id: 'ml',
    glyph: 'അ',
    label: 'Malayalam',
    isDefault: true,
    fontFamily: "'Noto Sans Malayalam', 'Manjari', 'Noto Sans', sans-serif",
    fontSize: 184,
    y: 298
  },
  {
    id: 'en',
    glyph: 'A',
    label: 'English',
    fontFamily: "'Fredoka', 'Nunito', 'Noto Sans', sans-serif",
    fontSize: 248,
    y: 332
  },
  {
    id: 'ta',
    glyph: 'அ',
    label: 'Tamil',
    fontFamily: "'Noto Sans Tamil', 'Noto Sans', sans-serif",
    fontSize: 204,
    y: 318
  },
  {
    id: 'kn',
    glyph: 'ಅ',
    label: 'Kannada',
    fontFamily: "'Noto Sans Kannada', 'Noto Sans', sans-serif",
    fontSize: 216,
    y: 310
  },
  {
    id: 'te',
    glyph: 'అ',
    label: 'Telugu',
    fontFamily: "'Noto Sans Telugu', 'Noto Sans', sans-serif",
    fontSize: 216,
    y: 310
  },
  {
    id: 'hi',
    glyph: 'अ',
    label: 'Hindi',
    fontFamily: "'Noto Sans Devanagari', 'Noto Sans', sans-serif",
    fontSize: 224,
    y: 322
  },
  {
    id: 'ja',
    glyph: 'あ',
    label: 'Japanese',
    fontFamily: "'Noto Sans CJK JP', 'Hiragino Kaku Gothic ProN', 'Noto Sans', sans-serif",
    fontSize: 232,
    y: 328
  },
  {
    id: 'zh',
    glyph: '中',
    label: 'Chinese',
    fontFamily: "'Noto Sans CJK SC', 'PingFang SC', 'Noto Sans', sans-serif",
    fontSize: 234,
    y: 328
  },
  {
    id: 'ko',
    glyph: '한',
    label: 'Korean',
    fontFamily: "'Noto Sans CJK KR', 'Apple SD Gothic Neo', 'Noto Sans', sans-serif",
    fontSize: 230,
    y: 328
  },
  {
    id: 'ar',
    glyph: 'ع',
    label: 'Arabic',
    fontFamily: "'Noto Sans Arabic', 'Noto Sans', sans-serif",
    fontSize: 214,
    y: 266
  },
  {
    id: 'es',
    glyph: 'Ñ',
    label: 'Spanish',
    fontFamily: "'Fredoka', 'Nunito', 'Noto Sans', sans-serif",
    fontSize: 234,
    y: 336
  },
  {
    id: 'fr',
    glyph: 'É',
    label: 'French',
    fontFamily: "'Fredoka', 'Nunito', 'Noto Sans', sans-serif",
    fontSize: 232,
    y: 340
  },
  {
    id: 'ru',
    glyph: 'Я',
    label: 'Russian',
    fontFamily: "'Fredoka', 'Nunito', 'Noto Sans', sans-serif",
    fontSize: 242,
    y: 332
  },
  {
    id: 'star',
    glyph: '★',
    label: 'Star',
    fontFamily: "'Noto Sans Symbols 2', 'Noto Sans Symbols', 'DejaVu Sans', sans-serif",
    fontSize: 240,
    y: 326
  },
  {
    id: 'diamond',
    glyph: '◆',
    label: 'Diamond',
    fontFamily: "'Noto Sans Symbols 2', 'Noto Sans Symbols', 'DejaVu Sans', sans-serif",
    fontSize: 224,
    y: 310
  },
  {
    id: 'triangle',
    glyph: '▲',
    label: 'Triangle',
    fontFamily: "'Noto Sans Symbols 2', 'Noto Sans Symbols', 'DejaVu Sans', sans-serif",
    fontSize: 214,
    y: 302
  }
];

const iconUrlCache = new Map();

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
      if (ic.fontSize) existing.fontSize = Number(ic.fontSize);
      if (ic.y) existing.y = Number(ic.y);
      iconUrlCache.delete(code);
    } else {
      APP_ICON_PRESETS.splice(insertIdx, 0, {
        id: code,
        glyph: ic.glyph,
        label: lang.name || code.toUpperCase(),
        fontFamily: ic.fontFamily || "'Fredoka', 'Nunito', 'Noto Sans', sans-serif",
        fontSize: Number(ic.fontSize) || 224,
        y: Number(ic.y) || 322
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
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">',
    '  <circle cx="256" cy="272" r="222" fill="#4c1d95" />',
    '  <circle cx="256" cy="240" r="218" fill="#7c3aed" stroke="#a78bfa" stroke-width="26" />',
    `  <text x="256" y="${p.y}" text-anchor="middle" fill="#ffffff" font-family="${escapeXml(p.fontFamily)}" font-size="${p.fontSize}" font-weight="900">${escapeXml(p.glyph)}</text>`,
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

function renderIconPngDataUrl(preset, size = 192) {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      const scale = size / 512;
      ctx.clearRect(0, 0, size, size);

      // Bottom 3D lip
      ctx.beginPath();
      ctx.arc(256 * scale, 272 * scale, 222 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#4c1d95';
      ctx.fill();

      // Main circular face + lavender ring border
      ctx.beginPath();
      ctx.arc(256 * scale, 240 * scale, 218 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#7c3aed';
      ctx.fill();
      ctx.lineWidth = 26 * scale;
      ctx.strokeStyle = '#a78bfa';
      ctx.stroke();

      // Bold white centered glyph
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = `900 ${Math.round(preset.fontSize * scale)}px ${preset.fontFamily}`;
      ctx.fillText(preset.glyph, 256 * scale, preset.y * scale);

      resolve(canvas.toDataURL('image/png'));
    } catch {
      resolve(null);
    }
  });
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
