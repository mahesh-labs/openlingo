/**
 * Universal Any-to-Any Course Matrix Synthesizer (13 Languages -> 156 Complete Courses).
 * Loads `courses/matrix/syllabus.json` and lazy-caches `courses/langs/<code>.json` packs
 * to synthesize any `(sourceLang -> targetLang)` course from Absolute Beginner to Mastery.
 */

import { getGitHubRawBase } from './config.js';

let syllabusCache = null;
const langPackCache = new Map();
const i18nPackCache = new Map();
let remoteMatrixSource = null; // { repo, branch } when synced live from GitHub

export async function loadMatrixSyllabus() {
  if (syllabusCache) return syllabusCache;
  const res = await fetch('./courses/matrix/syllabus.json');
  if (!res.ok) throw new Error(`Could not load course matrix syllabus (HTTP ${res.status}).`);
  syllabusCache = await res.json();
  return syllabusCache;
}

export async function syncMatrixFromGitHub(repo, branch) {
  const base = getGitHubRawBase(repo, branch);
  const res = await fetch(`${base}/courses/matrix/syllabus.json?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Could not fetch matrix syllabus from GitHub (HTTP ${res.status}).`);
  }
  const remoteSyllabus = await res.json();
  if (!Array.isArray(remoteSyllabus?.languages) || !Array.isArray(remoteSyllabus?.tiers)) {
    throw new Error('Remote syllabus.json is invalid.');
  }
  syllabusCache = remoteSyllabus;
  langPackCache.clear();
  i18nPackCache.clear();
  remoteMatrixSource = { repo, branch };
  return remoteSyllabus;
}

export function getMatrixLanguages() {
  return syllabusCache?.languages || [];
}

export function getLanguageMeta(code) {
  return getMatrixLanguages().find((l) => l.code === code) || null;
}

export function parseMatrixCourseId(courseId) {
  const parts = String(courseId || '').split('-');
  if (parts.length !== 2) return null;
  const [src, tgt] = parts;
  if (!src || !tgt || src === tgt) return null;
  const langs = getMatrixLanguages();
  if (!langs.some((l) => l.code === src) || !langs.some((l) => l.code === tgt)) return null;
  return { sourceCode: src, targetCode: tgt };
}

export async function loadLanguagePack(code) {
  if (langPackCache.has(code)) return langPackCache.get(code);
  if (remoteMatrixSource) {
    try {
      const base = getGitHubRawBase(remoteMatrixSource.repo, remoteMatrixSource.branch);
      const rRes = await fetch(`${base}/courses/langs/${encodeURIComponent(code)}.json?t=${Date.now()}`, { cache: 'no-store' });
      if (rRes.ok) {
        const pack = await rRes.json();
        langPackCache.set(code, pack);
        return pack;
      }
    } catch {
      // Fall back to bundled local pack
    }
  }
  const res = await fetch(`./courses/langs/${encodeURIComponent(code)}.json`);
  if (!res.ok) throw new Error(`Could not load language pack "${code}" (HTTP ${res.status}).`);
  const pack = await res.json();
  langPackCache.set(code, pack);
  return pack;
}

export async function loadLanguageI18n(code) {
  if (i18nPackCache.has(code)) return i18nPackCache.get(code);
  if (remoteMatrixSource) {
    try {
      const base = getGitHubRawBase(remoteMatrixSource.repo, remoteMatrixSource.branch);
      const rRes = await fetch(`${base}/courses/i18n/${encodeURIComponent(code)}.json?t=${Date.now()}`, { cache: 'no-store' });
      if (rRes.ok) {
        const pack = await rRes.json();
        i18nPackCache.set(code, pack);
        return pack;
      }
    } catch {
      // Fall back to local i18n pack
    }
  }
  try {
    const res = await fetch(`./courses/i18n/${encodeURIComponent(code)}.json`);
    if (res.ok) {
      const pack = await res.json();
      i18nPackCache.set(code, pack);
      return pack;
    }
  } catch {
    // Fall back to null
  }
  return null;
}

export async function buildMatrixCourse(sourceCode, targetCode) {
  const syllabus = await loadMatrixSyllabus();
  const srcMeta = syllabus.languages.find((l) => l.code === sourceCode);
  const tgtMeta = syllabus.languages.find((l) => l.code === targetCode);
  if (!srcMeta || !tgtMeta || sourceCode === targetCode) {
    throw new Error(`Invalid course pair: ${sourceCode}-${targetCode}`);
  }

  const [srcPack, tgtPack, srcI18n] = await Promise.all([
    loadLanguagePack(sourceCode),
    loadLanguagePack(targetCode),
    loadLanguageI18n(sourceCode)
  ]);

  const labels = Array.isArray(tgtMeta.levelLabels) && tgtMeta.levelLabels.length === 5
    ? tgtMeta.levelLabels
    : ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5'];

  const localizedSrcName = srcI18n?.langNames?.[sourceCode] || srcMeta.nativeName || srcMeta.name;
  const localizedTgtName = srcI18n?.langNames?.[targetCode] || tgtMeta.nativeName || tgtMeta.name;

  const sections = syllabus.tiers.map((tier, tIdx) => {
    const levelTag = labels[tIdx] || `Tier ${tIdx + 1}`;
    const localizedTier = srcI18n?.tiers?.[tier.id] || tier.tier;
    return {
      id: `sec-${tier.id}`,
      jlptLevel: levelTag,
      tier: localizedTier,
      title: `${levelTag} — ${localizedTier}`,
      description: tier.description,
      color: '#7c3aed',
      units: tier.units.map((unit) => {
        const locUnit = srcI18n?.units?.[unit.id];
        const unitTitle = locUnit?.title || unit.title;
        const unitSubtitle = locUnit?.subtitle || unit.subtitle;
        const unitGrammar =
          (sourceCode !== 'en' && srcI18n?.grammarNotes?.[unit.id]) ||
          tgtPack.grammarNotes?.[unit.id] ||
          `${unitTitle}: ${unitSubtitle}`;
        return {
          id: unit.id,
          title: unitTitle,
          subtitle: unitSubtitle,
          cefrLevel: levelTag,
          color: '#7c3aed',
          lessons: unit.lessons.map((lesson) => ({
            id: lesson.id,
            title: srcI18n?.lessons?.[lesson.id] || lesson.title,
            objective: unitSubtitle,
            grammarNote: unitGrammar,
            items: lesson.concepts
              .map((cid) => {
                const s = srcPack.items?.[cid];
                const t = tgtPack.items?.[cid];
                if (!s || !t) return null;
                return {
                  id: `${sourceCode}_${targetCode}_${cid}`,
                  conceptId: cid,
                  term: t.t,
                  reading: t.reading || t.t,
                  transliteration: t.r || '',
                  translation: s.t,
                  sourceTransliteration: s.r || '',
                  tags: [levelTag, unit.id],
                  example: {
                    term: t.x || '',
                    transliteration: t.xr || '',
                    translation: s.x || ''
                  }
                };
              })
              .filter(Boolean)
          }))
        };
      })
    };
  });

  const firstLvl = labels[0];
  const lastLvl = labels[labels.length - 1];
  const courseTitleTpl = srcI18n?.ui?.courseTitle || '{target} for {source} Speakers ({first} → {last})';
  const courseTitle = courseTitleTpl
    .replace('{target}', localizedTgtName)
    .replace('{source}', localizedSrcName)
    .replace('{first}', firstLvl)
    .replace('{last}', lastLvl);

  return {
    id: `${sourceCode}-${targetCode}`,
    version: syllabus.version || '3.0.0',
    _matrix: true,
    i18n: srcI18n || null,
    standardName: tgtMeta.standardName || 'Level',
    title: courseTitle,
    description: `${localizedSrcName} → ${localizedTgtName} (${firstLvl} → ${lastLvl})`,
    author: tgtPack.author || tgtMeta.author || 'Polygot Core Team',
    authorUrl: tgtPack.authorUrl || tgtMeta.authorUrl || '',
    discordChannelUrl: tgtPack.discordChannelUrl || tgtMeta.discordChannelUrl || '',
    license: 'CC-BY-SA-4.0',
    sourceLang: {
      code: srcMeta.code,
      name: srcMeta.name,
      localizedName: localizedSrcName,
      nativeName: srcMeta.nativeName,
      speechLocale: srcMeta.speechLocale,
      dir: srcMeta.dir || 'ltr'
    },
    targetLang: {
      code: tgtMeta.code,
      name: tgtMeta.name,
      localizedName: localizedTgtName,
      nativeName: tgtMeta.nativeName,
      speechLocale: tgtMeta.speechLocale,
      dir: tgtMeta.dir || 'ltr',
      usesTransliteration: Boolean(tgtMeta.usesTransliteration)
    },
    sections
  };
}
