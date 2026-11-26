/**
 * Universal Any-to-Any Course Matrix Synthesizer (13 Languages -> 156 Complete Courses).
 * Loads `courses/matrix/syllabus.json` and lazy-caches `courses/langs/<code>.json` packs
 * to synthesize any `(sourceLang -> targetLang)` course from Absolute Beginner to Mastery.
 */

import { getGitHubRawBase } from './config.js';

let syllabusCache = null;
const langPackCache = new Map();
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

export async function buildMatrixCourse(sourceCode, targetCode) {
  const syllabus = await loadMatrixSyllabus();
  const srcMeta = syllabus.languages.find((l) => l.code === sourceCode);
  const tgtMeta = syllabus.languages.find((l) => l.code === targetCode);
  if (!srcMeta || !tgtMeta || sourceCode === targetCode) {
    throw new Error(`Invalid course pair: ${sourceCode}-${targetCode}`);
  }

  const [srcPack, tgtPack] = await Promise.all([
    loadLanguagePack(sourceCode),
    loadLanguagePack(targetCode)
  ]);

  const labels = Array.isArray(tgtMeta.levelLabels) && tgtMeta.levelLabels.length === 5
    ? tgtMeta.levelLabels
    : ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5'];

  const sections = syllabus.tiers.map((tier, tIdx) => {
    const levelTag = labels[tIdx] || `Tier ${tIdx + 1}`;
    return {
      id: `sec-${tier.id}`,
      jlptLevel: levelTag,
      tier: tier.tier,
      title: `${levelTag} — ${tier.title}`,
      description: tier.description,
      color: '#7c3aed',
      units: tier.units.map((unit) => {
        const unitGrammar =
          tgtPack.grammarNotes?.[unit.id] ||
          `${unit.title}: ${unit.subtitle}`;
        return {
          id: unit.id,
          title: unit.title,
          subtitle: unit.subtitle,
          cefrLevel: levelTag,
          color: '#7c3aed',
          lessons: unit.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            objective: lesson.objective,
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

  return {
    id: `${sourceCode}-${targetCode}`,
    version: syllabus.version || '3.0.0',
    _matrix: true,
    standardName: tgtMeta.standardName || 'Level',
    title: `${tgtMeta.name} for ${srcMeta.name} Speakers (${firstLvl} → ${lastLvl})`,
    description: `Complete ${srcMeta.name} → ${tgtMeta.name} curriculum from absolute beginner (${firstLvl}) to super advanced mastery (${lastLvl}).`,
    license: 'CC-BY-SA-4.0',
    sourceLang: {
      code: srcMeta.code,
      name: srcMeta.name,
      nativeName: srcMeta.nativeName,
      speechLocale: srcMeta.speechLocale,
      dir: srcMeta.dir || 'ltr'
    },
    targetLang: {
      code: tgtMeta.code,
      name: tgtMeta.name,
      nativeName: tgtMeta.nativeName,
      speechLocale: tgtMeta.speechLocale,
      dir: tgtMeta.dir || 'ltr',
      usesTransliteration: Boolean(tgtMeta.usesTransliteration)
    },
    sections
  };
}
