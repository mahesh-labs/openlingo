import { RATINGS, createCardState, scheduleReview, formatIntervalLabel, isDue } from './src/srs.js';
import { generateLessonExercises, normalizeAnswer } from './src/exercises.js';
import { getScriptSetForCourse } from './src/scripts.js';

const STORAGE_KEYS = {
  COURSES: 'openlingo_custom_courses_v2',
  PROGRESS: 'openlingo_progress_v2',
  SRS: 'openlingo_srs_v2',
  THEME: 'openlingo_theme_v1'
};

const state = {
  view: 'syllabus', // 'syllabus' | 'characters' | 'lesson' | 'placement' | 'guidebook' | 'flashcards' | 'studio' | 'backup'
  courses: [],
  activeCourseId: 'en-ja',
  selectedSectionId: 'sec-n5',
  activeScriptTab: null,
  scriptDrill: null,
  flashcardFilter: 'ALL',
  theme: 'dark',
  progress: {
    completedLessons: {},
    unlockedUnits: {},
    charMastery: {},
    xp: 0,
    streak: 1,
    lastActiveDay: null,
    hearts: 5,
    chillMode: false
  },
  srs: {},
  showRomaji: true,
  guidebookUnit: null,
  lessonSheet: null,
  lessonSession: null,
  placementSession: null,
  flashcardSession: { queue: [], index: 0, flipped: false },
  studioMessage: '',
  backupMessage: '',
  backupCodePreview: ''
};

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getActiveCourse() {
  return state.courses.find((c) => c.id === state.activeCourseId) || state.courses[0];
}

function getStandardLabel(course) {
  return course.standardName || (course.targetLang?.code === 'ja' ? 'JLPT' : 'Level');
}

function getSections(course) {
  if (Array.isArray(course.sections) && course.sections.length) return course.sections;
  return [
    {
      id: 'sec-default',
      jlptLevel: 'Core',
      tier: 'Course',
      title: course.title,
      description: course.description || '',
      color: '#10b981',
      units: course.units || []
    }
  ];
}

function getAllUnits(course) {
  return getSections(course).flatMap((sec) =>
    sec.units.map((u) => ({ ...u, _section: sec }))
  );
}

function getOrderedLessons(course) {
  const list = [];
  getAllUnits(course).forEach((unit) => {
    unit.lessons.forEach((lesson) => {
      list.push({ unit, lesson, key: `${course.id}:${lesson.id}` });
    });
  });
  return list;
}

function getAllItems(course) {
  return getAllUnits(course).flatMap((u) =>
    u.lessons.flatMap((l) => l.items.map((it) => ({ ...it, _level: u._section.jlptLevel || u.cefrLevel || 'Core' })))
  );
}

function applyTheme() {
  document.body.classList.toggle('theme-light', state.theme === 'light');
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem(STORAGE_KEYS.THEME, state.theme);
  applyTheme();
  render();
}

function loadLocalState() {
  try {
    const savedProgress = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROGRESS) || 'null');
    if (savedProgress) {
      state.progress = {
        ...state.progress,
        ...savedProgress,
        charMastery: savedProgress.charMastery || {}
      };
    }
    const savedSrs = JSON.parse(localStorage.getItem(STORAGE_KEYS.SRS) || 'null');
    if (savedSrs) state.srs = savedSrs;
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme === 'light' || savedTheme === 'dark') state.theme = savedTheme;
  } catch {
    // Ignore storage errors
  }
  applyTheme();
}

function saveLocalState() {
  localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(state.progress));
  localStorage.setItem(STORAGE_KEYS.SRS, JSON.stringify(state.srs));
  const custom = state.courses.filter((c) => c._custom);
  localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(custom));
}

function recordStudyActivity() {
  const today = new Date().toISOString().slice(0, 10);
  if (state.progress.lastActiveDay !== today) {
    if (state.progress.lastActiveDay) {
      const prev = new Date(state.progress.lastActiveDay);
      const curr = new Date(today);
      const diffDays = Math.round((curr - prev) / 86400000);
      state.progress.streak = diffDays === 1 ? state.progress.streak + 1 : 1;
    } else {
      state.progress.streak = 1;
    }
    state.progress.lastActiveDay = today;
  }
}

function speakText(text, locale) {
  if (!text) return;
  if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
    window.AndroidTTS.speak(text, locale || 'ja-JP');
    return;
  }
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = locale || 'ja-JP';
  utter.rate = 0.9;
  window.speechSynthesis.speak(utter);
}

function computeUnlockMap(course) {
  const ordered = getOrderedLessons(course);
  const completed = state.progress.completedLessons;
  const unlockedUnits = state.progress.unlockedUnits;

  const statusByKey = {};
  let firstCurrentKey = null;

  ordered.forEach((entry, idx) => {
    const isDone = Boolean(completed[entry.key]);
    const prevDone = idx === 0 || Boolean(completed[ordered[idx - 1].key]);
    const unitJumpUnlocked = Boolean(unlockedUnits[`${course.id}:${entry.unit.id}`]);
    const prevInUnitDone =
      entry.unit.lessons[0].id === entry.lesson.id ||
      Boolean(completed[ordered[idx - 1].key]);

    if (isDone) {
      statusByKey[entry.key] = 'completed';
    } else if (prevDone || (unitJumpUnlocked && prevInUnitDone)) {
      if (!firstCurrentKey) {
        statusByKey[entry.key] = 'current';
        firstCurrentKey = entry.key;
      } else {
        statusByKey[entry.key] = 'unlocked';
      }
    } else {
      statusByKey[entry.key] = 'locked';
    }
  });

  return statusByKey;
}

function isUnitUnlocked(course, unit, statusByKey) {
  return unit.lessons.some((l) => statusByKey[`${course.id}:${l.id}`] !== 'locked');
}

function isUnitCompleted(course, unit) {
  return unit.lessons.every((l) => Boolean(state.progress.completedLessons[`${course.id}:${l.id}`]));
}

function getDueCount(course) {
  return getAllItems(course).filter((item) => isDue(state.srs[item.id])).length;
}

/* ---------- Jump-Ahead Placement Quiz ---------- */
function openPlacementQuiz(course, unitId) {
  const allUnits = getAllUnits(course);
  const targetIdx = allUnits.findIndex((u) => u.id === unitId);
  if (targetIdx < 0) return;
  const targetUnit = allUnits[targetIdx];

  // Sample 5 questions from the previous unit(s) + target unit to verify readiness
  const priorUnits = allUnits.slice(Math.max(0, targetIdx - 2), targetIdx);
  const candidateItems = [
    ...priorUnits.flatMap((u) => u.lessons.flatMap((l) => l.items)),
    ...targetUnit.lessons.flatMap((l) => l.items)
  ];
  const allCourseItems = getAllItems(course);
  const selected = shuffle(candidateItems).slice(0, Math.min(5, candidateItems.length));

  const questions = selected.map((item, idx) => {
    const distractors = shuffle(allCourseItems.filter((x) => x.id !== item.id)).slice(0, 3);
    const reverse = idx % 2 === 1;
    return {
      item,
      reverse,
      promptLabel: reverse ? 'Select the matching expression' : 'Choose the English meaning',
      promptMain: reverse ? item.translation : item.term,
      promptSub: !reverse && item.reading && item.reading !== item.term ? item.reading : '',
      correctId: item.id,
      options: shuffle([item, ...distractors]).map((o) => ({
        id: o.id,
        label: reverse ? o.term : o.translation,
        sub: reverse ? o.transliteration || '' : ''
      }))
    };
  });

  state.placementSession = {
    unit: targetUnit,
    questions,
    index: 0,
    correctCount: 0,
    showIntro: true,
    answered: false,
    wasCorrect: false,
    selectedId: null,
    passed: false
  };
  state.view = 'placement';
  render();
}

function unlockUnitDirectly(course, unitId) {
  state.progress.unlockedUnits[`${course.id}:${unitId}`] = true;
  saveLocalState();
  state.placementSession = null;
  state.view = 'syllabus';
  render();
}

/* ---------- Script / Character Drill ---------- */
function startScriptDrill(scriptSet, tabId) {
  const tab = scriptSet.tabs.find((t) => t.id === tabId) || scriptSet.tabs[0];
  const allChars = tab.rows.flatMap((r) => r.chars);
  const picked = shuffle(allChars).slice(0, Math.min(8, allChars.length));

  const questions = picked.map((ch, idx) => {
    const distractors = shuffle(allChars.filter((c) => c.glyph !== ch.glyph)).slice(0, 3);
    const askGlyph = idx % 2 === 1;
    return {
      ch,
      askGlyph,
      promptLabel: askGlyph ? 'Pick the matching character' : 'Pick the matching sound',
      promptMain: askGlyph ? ch.romaji : ch.glyph,
      correctGlyph: ch.glyph,
      options: shuffle([ch, ...distractors]).map((o) => ({
        glyph: o.glyph,
        label: askGlyph ? o.glyph : o.romaji
      }))
    };
  });

  state.scriptDrill = {
    tabId: tab.id,
    tabLabel: tab.label,
    speechLocale: scriptSet.speechLocale,
    questions,
    index: 0,
    correctCount: 0,
    answered: false,
    wasCorrect: false,
    selectedGlyph: null
  };
  render();
}

/* ---------- Lesson & Flashcards ---------- */
function startLesson(unitId, lessonId) {
  const course = getActiveCourse();
  const unit = getAllUnits(course).find((u) => u.id === unitId);
  const lesson = unit?.lessons.find((l) => l.id === lessonId);
  if (!lesson) return;

  const sameTierItems = unit._section
    ? unit._section.units.flatMap((u) => u.lessons.flatMap((l) => l.items))
    : getAllItems(course);

  const exercises = generateLessonExercises(lesson, sameTierItems);
  state.lessonSession = {
    unit,
    lesson,
    exercises,
    index: 0,
    correctCount: 0,
    answered: false,
    wasCorrect: false,
    selectedId: null,
    typedValue: '',
    showIntro: true
  };
  if (state.progress.hearts <= 0) state.progress.hearts = 5;
  state.view = 'lesson';
  render();
}

function openGuidebook(unitId) {
  const course = getActiveCourse();
  const unit = getAllUnits(course).find((u) => u.id === unitId);
  if (!unit) return;
  state.guidebookUnit = unit;
  state.view = 'guidebook';
  render();
}

function openFlashcards(filter = state.flashcardFilter) {
  const course = getActiveCourse();
  state.flashcardFilter = filter;
  let items = getAllItems(course);
  if (filter !== 'ALL') {
    items = items.filter((it) => it._level === filter);
  }
  const due = items.filter((item) => isDue(state.srs[item.id]));
  const queue = due.length > 0 ? due : items;

  state.flashcardSession = { queue: [...queue], index: 0, flipped: false };
  state.view = 'flashcards';
  render();
}

function rateCurrentFlashcard(rating) {
  const { queue, index } = state.flashcardSession;
  const item = queue[index];
  if (!item) return;

  const current = state.srs[item.id] || createCardState(item.id);
  state.srs[item.id] = scheduleReview(current, rating);
  state.progress.xp += rating >= RATINGS.GOOD ? 5 : 2;
  recordStudyActivity();
  saveLocalState();

  state.flashcardSession.flipped = false;
  if (rating === RATINGS.AGAIN) queue.push(item);
  state.flashcardSession.index += 1;
  render();
}

/* ---------- Progress Backup & Restore (Offline File + Copy/Paste Code) ---------- */
function buildBackupPayload() {
  return {
    app: 'OpenLingo',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    activeCourseId: state.activeCourseId,
    theme: state.theme,
    progress: state.progress,
    srs: state.srs,
    customCourses: state.courses.filter((c) => c._custom)
  };
}

function encodeBackupCode(payload) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return 'OL1:' + btoa(binary);
}

function decodeBackupInput(rawInput) {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) throw new Error('Backup text is empty.');
  if (trimmed.startsWith('OL1:')) {
    const binary = atob(trimmed.slice(4).replace(/\s+/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  return JSON.parse(trimmed);
}

function restoreBackupPayload(rawText) {
  const data = decodeBackupInput(rawText);
  if (!data || typeof data !== 'object' || (!data.progress && !data.srs)) {
    throw new Error('Not a valid OpenLingo backup file or code.');
  }

  state.progress = {
    completedLessons: {},
    unlockedUnits: {},
    charMastery: {},
    xp: 0,
    streak: 1,
    lastActiveDay: null,
    hearts: 5,
    chillMode: false,
    ...(data.progress || {})
  };
  state.srs = data.srs && typeof data.srs === 'object' ? data.srs : {};

  if (Array.isArray(data.customCourses)) {
    data.customCourses.forEach((c) => {
      c._custom = true;
      const idx = state.courses.findIndex((x) => x.id === c.id);
      if (idx >= 0) state.courses[idx] = c;
      else state.courses.push(c);
    });
  }

  if (data.theme === 'light' || data.theme === 'dark') {
    state.theme = data.theme;
    localStorage.setItem(STORAGE_KEYS.THEME, state.theme);
    applyTheme();
  }
  if (data.activeCourseId && state.courses.some((c) => c.id === data.activeCourseId)) {
    state.activeCourseId = data.activeCourseId;
  }

  saveLocalState();
  const doneCount = Object.keys(state.progress.completedLessons || {}).length;
  const srsCount = Object.keys(state.srs || {}).length;
  state.backupMessage = `Restored backup: ${doneCount} completed lessons, ${state.progress.xp} XP, ${srsCount} flashcard records.`;
  render();
}

function exportJsonFile(filename, jsonString) {
  if (window.AndroidBackup && typeof window.AndroidBackup.saveBackup === 'function') {
    window.AndroidBackup.saveBackup(filename, jsonString);
    return;
  }
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  state.backupMessage = `Downloaded ${filename}.`;
  render();
}

async function copyTextSafe(text) {
  if (window.AndroidBackup && typeof window.AndroidBackup.copyToClipboard === 'function') {
    window.AndroidBackup.copyToClipboard(text);
    return true;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    document.body.removeChild(ta);
    return false;
  }
}

window.onAndroidBackupSaved = (ok, msg) => {
  state.backupMessage = msg || (ok ? 'Backup saved.' : 'Backup action cancelled.');
  render();
};

window.onAndroidBackupLoaded = (base64Payload) => {
  try {
    const binary = atob(base64Payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const text = new TextDecoder().decode(bytes);
    restoreBackupPayload(text);
  } catch (err) {
    state.backupMessage = `Restore failed: ${err.message}`;
    render();
  }
};

/* ---------- Render Chrome ---------- */
function renderSidebar(course) {
  const ordered = getOrderedLessons(course);
  const doneCount = ordered.filter((e) => state.progress.completedLessons[e.key]).length;
  const dueCount = getDueCount(course);
  const hintLabel = course.targetLang?.usesTransliteration === false ? 'Show pronunciation guide' : 'Show transliteration';

  return `
    <aside class="sidebar">
      <div class="brand-row">
        <div class="brand">
          <div class="brand-mark">あ</div>
          <div>
            <div class="brand-name">OpenLingo</div>
            <div class="brand-tag">FOSS Cross-Platform</div>
          </div>
        </div>
        <button class="icon-btn" data-toggle-theme title="Toggle Light/Dark theme">${state.theme === 'light' ? '🌙' : '☀️'}</button>
      </div>

      <select id="course-select" class="course-picker" aria-label="Select course">
        ${state.courses
          .map(
            (c) => `<option value="${escapeHtml(c.id)}" ${c.id === course.id ? 'selected' : ''}>${escapeHtml(c.sourceLang.name)} → ${escapeHtml(c.targetLang.name)}</option>`
          )
          .join('')}
      </select>

      <nav class="nav-list">
        <button class="nav-btn ${['syllabus', 'lesson', 'placement', 'guidebook'].includes(state.view) ? 'active' : ''}" data-nav="syllabus">
          🗺️ Learning Path
        </button>
        <button class="nav-btn ${state.view === 'characters' ? 'active' : ''}" data-nav="characters">
          あ Characters
        </button>
        <button class="nav-btn ${state.view === 'flashcards' ? 'active' : ''}" data-nav="flashcards">
          🗂️ Flashcards (${dueCount})
        </button>
        <button class="nav-btn ${state.view === 'studio' ? 'active' : ''}" data-nav="studio">
          🛠️ Course Studio
        </button>
        <button class="nav-btn ${state.view === 'backup' ? 'active' : ''}" data-nav="backup">
          💾 Backup &amp; Restore
        </button>
      </nav>

      <div class="sidebar-stats">
        <div class="stat-row"><span>Streak</span><strong>🔥 ${state.progress.streak}d</strong></div>
        <div class="stat-row"><span>Total XP</span><strong>⚡ ${state.progress.xp} XP</strong></div>
        <div class="stat-row"><span>Lessons Done</span><strong>${doneCount}/${ordered.length}</strong></div>
        <div class="stat-row"><span>Cards Due</span><strong>${dueCount}</strong></div>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted);cursor:pointer;margin-top:4px;">
          <input type="checkbox" id="toggle-romaji" ${state.showRomaji ? 'checked' : ''} />
          ${escapeHtml(hintLabel)}
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted);cursor:pointer;">
          <input type="checkbox" id="toggle-chill" ${state.progress.chillMode ? 'checked' : ''} />
          Unlimited Hearts
        </label>
      </div>
    </aside>
  `;
}

function renderMobileTopbar(course) {
  const shortCodes = { ja: '🇯🇵 JA', es: '🇪🇸 ES', ml: '🇮🇳 ML' };
  return `
    <header class="mobile-topbar">
      <select id="mobile-course-select" class="course-picker" style="width:auto;padding:6px 8px;font-size:12px;font-weight:800;" aria-label="Select course">
        ${state.courses
          .map(
            (c) => `<option value="${escapeHtml(c.id)}" ${c.id === course.id ? 'selected' : ''}>${escapeHtml(shortCodes[c.targetLang.code] || c.targetLang.name)}</option>`
          )
          .join('')}
      </select>
      <div class="mobile-hud-inline">
        <span style="color:#f97316;">🔥 ${state.progress.streak}</span>
        <span style="color:#eab308;">⚡ ${state.progress.xp}</span>
        <span style="color:#f43f5e;">❤️ ${state.progress.chillMode ? '∞' : state.progress.hearts}</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <button class="icon-btn" data-nav="backup" title="Backup & Restore" style="width:32px;height:32px;font-size:14px;">💾</button>
        <button class="icon-btn" data-toggle-theme title="Toggle theme" style="width:32px;height:32px;font-size:14px;">${state.theme === 'light' ? '🌙' : '☀️'}</button>
      </div>
    </header>
  `;
}

function renderMobileNav(course) {
  const dueCount = getDueCount(course);
  return `
    <nav class="mobile-nav">
      <button class="nav-btn ${['syllabus', 'lesson', 'placement', 'guidebook'].includes(state.view) ? 'active' : ''}" data-nav="syllabus">
        <span>🗺️</span><span>Path</span>
      </button>
      <button class="nav-btn ${state.view === 'characters' ? 'active' : ''}" data-nav="characters">
        <span>あ</span><span>Script</span>
      </button>
      <button class="nav-btn ${state.view === 'flashcards' ? 'active' : ''}" data-nav="flashcards">
        <span>🗂️</span><span>Cards (${dueCount})</span>
      </button>
      <button class="nav-btn ${state.view === 'studio' ? 'active' : ''}" data-nav="studio">
        <span>🛠️</span><span>Studio</span>
      </button>
    </nav>
  `;
}

function renderHudBar(course) {
  const ordered = getOrderedLessons(course);
  const doneCount = ordered.filter((e) => state.progress.completedLessons[e.key]).length;
  const pct = ordered.length ? Math.round((doneCount / ordered.length) * 100) : 0;

  return `
    <div class="hud-bar">
      <div class="hud-metrics">
        <span class="hud-chip" style="color:#f97316;">🔥 ${state.progress.streak} day streak</span>
        <span class="hud-chip" style="color:#eab308;">⚡ ${state.progress.xp} XP</span>
        <span class="hud-chip" style="color:#f43f5e;">❤️ ${state.progress.chillMode ? '∞' : `${state.progress.hearts}/5`}</span>
      </div>
      <div class="hud-progress-wrap">
        <div class="hud-progress-track"><div class="hud-progress-fill" style="width:${pct}%"></div></div>
        <span style="font-size:12px;font-weight:700;color:var(--text-muted);white-space:nowrap;">${doneCount}/${ordered.length} (${pct}%)</span>
      </div>
    </div>
  `;
}

/* ---------- Render Views ---------- */
function renderSyllabusView(course) {
  const sections = getSections(course);
  const statusByKey = computeUnlockMap(course);

  if (state.selectedSectionId !== 'all' && !sections.some((s) => s.id === state.selectedSectionId)) {
    state.selectedSectionId = sections[0].id;
  }

  const visibleSections =
    state.selectedSectionId === 'all'
      ? sections
      : sections.filter((s) => s.id === state.selectedSectionId);

  const offsets = ['center', 'offset-left', 'center', 'offset-right'];

  return `
    ${renderHudBar(course)}

    <div class="header-bar syllabus-desktop-header" style="margin-bottom:14px;">
      <div>
        <h1 class="page-title">${escapeHtml(course.title)}</h1>
        <p class="page-sub">${escapeHtml(course.description || '')}</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span class="pill accent">${escapeHtml(course.targetLang.nativeName || course.targetLang.name)}</span>
        <span class="pill">${getAllItems(course).length} items</span>
      </div>
    </div>

    ${
      sections.length > 1
        ? `
      <div class="tier-bar">
        ${sections
          .map((sec) => {
            const secLessons = sec.units.flatMap((u) => u.lessons);
            const secDone = secLessons.filter((l) => state.progress.completedLessons[`${course.id}:${l.id}`]).length;
            const secPct = secLessons.length ? Math.round((secDone / secLessons.length) * 100) : 0;
            const isActive = state.selectedSectionId === sec.id;
            return `
              <button class="tier-pill ${isActive ? 'active' : ''}" style="--tier-color:${escapeHtml(sec.color || '#10b981')}" data-select-section="${escapeHtml(sec.id)}">
                <div class="tier-pill-top">
                  <span>${escapeHtml(sec.jlptLevel)}</span>
                  <span style="font-size:11px;color:var(--text-muted);">${secDone}/${secLessons.length}</span>
                </div>
                <div class="tier-pill-sub">${escapeHtml(sec.tier)}</div>
                <div class="tier-mini-bar"><div class="tier-mini-fill" style="width:${secPct}%;background:${escapeHtml(sec.color || '#10b981')};"></div></div>
              </button>
            `;
          })
          .join('')}
        <button class="tier-pill ${state.selectedSectionId === 'all' ? 'active' : ''}" style="--tier-color:#38bdf8" data-select-section="all">
          <div class="tier-pill-top"><span>ALL</span><span>${escapeHtml(sections[0].jlptLevel)}→${escapeHtml(sections[sections.length - 1].jlptLevel)}</span></div>
          <div class="tier-pill-sub">Full Path</div>
          <div class="tier-mini-bar"><div class="tier-mini-fill" style="width:100%;background:#38bdf8;"></div></div>
        </button>
      </div>
    `
        : ''
    }

    ${visibleSections
      .map((sec) => {
        const secIndex = sections.findIndex((s) => s.id === sec.id) + 1;
        return `
        <div class="section-header" style="--sec-color:${escapeHtml(sec.color || '#10b981')}">
          <div>
            <h2>Section ${secIndex}: ${escapeHtml(sec.title)}</h2>
            <p>${escapeHtml(sec.description || '')}</p>
          </div>
          <span class="pill" style="border-color:${escapeHtml(sec.color || '#10b981')};color:${escapeHtml(sec.color || '#10b981')};">${escapeHtml(sec.tier)} · ${escapeHtml(sec.jlptLevel)}</span>
        </div>

        ${sec.units
          .map((unit, uIdx) => {
            const unlocked = isUnitUnlocked(course, unit, statusByKey);
            const completed = isUnitCompleted(course, unit);
            const unitColor = unit.color || sec.color || '#10b981';
            const doneInUnit = unit.lessons.filter((l) => state.progress.completedLessons[`${course.id}:${l.id}`]).length;

            return `
            <section class="unit-section">
              <div class="unit-banner ${unlocked ? '' : 'locked-banner'}" style="background:${escapeHtml(unitColor)};">
                <div>
                  <div class="unit-kicker">${escapeHtml(sec.jlptLevel)} · Unit ${uIdx + 1} · ${doneInUnit}/${unit.lessons.length} complete</div>
                  <h3 class="unit-banner-title">${escapeHtml(unit.title)}</h3>
                  <p class="unit-banner-sub">${escapeHtml(unit.subtitle || '')}</p>
                </div>
                <div class="unit-banner-actions">
                  <button class="banner-btn" data-guidebook="${escapeHtml(unit.id)}">📖 Guidebook</button>
                  ${
                    !unlocked
                      ? `<button class="banner-btn" data-jump-quiz="${escapeHtml(unit.id)}">🎯 Jump Here</button>`
                      : ''
                  }
                </div>
              </div>

              <div class="path-track">
                ${unit.lessons
                  .map((lesson, lIdx) => {
                    const key = `${course.id}:${lesson.id}`;
                    const status = statusByKey[key] || 'locked';
                    const offsetClass = offsets[(uIdx * 2 + lIdx) % offsets.length];
                    const icon = status === 'completed' ? '✓' : status === 'locked' ? '🔒' : '★';
                    return `
                    <div class="path-node-wrap ${offsetClass}">
                      ${status === 'current' ? `<div class="path-start-bubble">START</div>` : ''}
                      <button
                        class="lesson-node status-${status}"
                        style="--node-color:${escapeHtml(unitColor)}"
                        ${status === 'locked' ? `disabled title="Complete previous lesson or take the Jump Here placement quiz"` : `data-open-sheet="${escapeHtml(unit.id)}|${escapeHtml(lesson.id)}"`}
                      >${icon}</button>
                      <div class="node-label">
                        <div class="node-title">${escapeHtml(lesson.title)}</div>
                        <div class="node-meta">${status === 'completed' ? 'Completed · Tap to practice' : status === 'locked' ? 'Locked' : `${lesson.items.length} items · Ready`}</div>
                      </div>
                    </div>
                  `;
                  })
                  .join('')}

                <div class="path-node-wrap">
                  <div class="trophy-node ${completed ? 'earned' : ''}" title="Complete all lessons in this unit to earn the trophy">🏆</div>
                  <div class="node-label">
                    <div class="node-meta">${completed ? 'Unit Mastered!' : 'Unit Trophy'}</div>
                  </div>
                </div>
              </div>
            </section>
          `;
          })
          .join('')}
      `;
      })
      .join('')}
  `;
}

function renderCharactersView(course) {
  const scriptSet = getScriptSetForCourse(course);
  if (!state.activeScriptTab || !scriptSet.tabs.some((t) => t.id === state.activeScriptTab)) {
    state.activeScriptTab = scriptSet.tabs[0].id;
  }
  const activeTab = scriptSet.tabs.find((t) => t.id === state.activeScriptTab) || scriptSet.tabs[0];

  if (state.scriptDrill) {
    const d = state.scriptDrill;
    if (d.index >= d.questions.length) {
      const pct = Math.round((d.correctCount / d.questions.length) * 100);
      return `
        ${renderHudBar(course)}
        <section class="card" style="text-align:center;padding:38px 24px;">
          <div style="font-size:48px;margin-bottom:8px;">✨</div>
          <h1 class="page-title">Script Drill Complete!</h1>
          <p class="page-sub">${escapeHtml(d.tabLabel)} · ${d.correctCount}/${d.questions.length} (${pct}%) · +20 XP</p>
          <div style="display:flex;justify-content:center;gap:10px;margin-top:20px;flex-wrap:wrap;">
            <button class="btn btn-primary" id="close-script-drill">Back to Character Chart</button>
            <button class="btn" id="retry-script-drill">Practice Another 8</button>
          </div>
        </section>
      `;
    }

    const q = d.questions[d.index];
    const pct = Math.round((d.index / d.questions.length) * 100);
    return `
      <div class="header-bar" style="margin-bottom:12px;">
        <div>
          <h1 class="page-title" style="font-size:20px;">${escapeHtml(d.tabLabel)} Drill</h1>
          <p class="page-sub">Question ${d.index + 1} of ${d.questions.length}</p>
        </div>
        <button class="btn btn-sm" id="close-script-drill">✕ Exit Drill</button>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <section class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="pill">${escapeHtml(q.promptLabel)}</span>
          <button class="btn btn-sm" data-speak-locale="${escapeHtml(d.speechLocale)}" data-speak="${escapeHtml(q.ch.glyph)}">🔊 Listen</button>
        </div>
        <div class="prompt-main" style="font-size:46px;margin:16px 0;">${escapeHtml(q.promptMain)}</div>
        <div class="options-grid">
          ${q.options
            .map((opt) => {
              let cls = 'option-btn';
              if (d.answered) {
                if (opt.glyph === q.correctGlyph) cls += ' correct';
                else if (opt.glyph === d.selectedGlyph) cls += ' wrong';
              }
              return `
              <button class="${cls}" style="align-items:center;text-align:center;font-size:${q.askGlyph ? '26px' : '17px'};" data-script-opt="${escapeHtml(opt.glyph)}" ${d.answered ? 'disabled' : ''}>
                ${escapeHtml(opt.label)}
              </button>
            `;
            })
            .join('')}
        </div>
        ${
          d.answered
            ? `
          <div style="margin-top:18px;padding:14px;border-radius:12px;background:${d.wasCorrect ? 'var(--accent-soft)' : 'rgba(244,63,94,0.14)'};display:flex;justify-content:space-between;align-items:center;gap:12px;">
            <div><strong>${d.wasCorrect ? 'Correct!' : 'Review:'}</strong> ${escapeHtml(q.ch.glyph)} = ${escapeHtml(q.ch.romaji)}</div>
            <button class="btn btn-primary btn-sm" id="next-script-q">Continue →</button>
          </div>
        `
            : ''
        }
      </section>
    `;
  }

  const allTabChars = activeTab.rows.flatMap((r) => r.chars);
  const masteredCount = allTabChars.filter((c) => (state.progress.charMastery[c.glyph] || 0) >= 3).length;

  return `
    ${renderHudBar(course)}
    <div class="header-bar">
      <div>
        <h1 class="page-title">${escapeHtml(scriptSet.title)}</h1>
        <p class="page-sub">${escapeHtml(scriptSet.subtitle)}</p>
      </div>
      <button class="btn btn-primary" id="start-script-drill-btn">🎯 Practice ${escapeHtml(activeTab.label.split(' ')[0])} (8 Qs)</button>
    </div>

    <div class="filter-row">
      ${scriptSet.tabs
        .map(
          (t) => `<button class="filter-chip ${t.id === activeTab.id ? 'active' : ''}" data-script-tab="${escapeHtml(t.id)}">${escapeHtml(t.label)}</button>`
        )
        .join('')}
    </div>

    <div class="grammar-box" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
      <span>${escapeHtml(activeTab.note)}</span>
      <span class="pill accent">${masteredCount}/${allTabChars.length} mastered</span>
    </div>

    <section class="card">
      ${activeTab.rows
        .map(
          (row) => `
        <div class="char-group-title">${escapeHtml(row.group)}</div>
        <div class="char-grid">
          ${row.chars
            .map((ch) => {
              const lvl = Math.min(3, state.progress.charMastery[ch.glyph] || 0);
              const pct = Math.round((lvl / 3) * 100);
              return `
              <button class="char-tile ${lvl >= 3 ? 'mastered' : ''}" data-char-tap="${escapeHtml(ch.glyph)}" data-speak-locale="${escapeHtml(scriptSet.speechLocale)}">
                <span class="char-glyph">${escapeHtml(ch.glyph)}</span>
                <span class="char-romaji">${escapeHtml(ch.romaji)}</span>
                <div class="char-bar"><div class="char-bar-fill" style="width:${pct}%"></div></div>
              </button>
            `;
            })
            .join('')}
        </div>
      `
        )
        .join('')}
    </section>
  `;
}

function renderPlacementView(course) {
  const p = state.placementSession;
  if (!p) return renderSyllabusView(course);

  if (p.showIntro) {
    return `
      ${renderHudBar(course)}
      <section class="card" style="text-align:center;padding:34px 24px;">
        <span class="pill accent">Jump-Ahead Placement Test</span>
        <h1 class="page-title" style="margin-top:12px;">Jump to ${escapeHtml(p.unit.title)}?</h1>
        <p class="page-sub" style="max-width:520px;margin:8px auto 20px;">
          Pass this short ${p.questions.length}-question test with at least <strong>80% accuracy</strong> to prove you're ready and unlock <strong>${escapeHtml(p.unit._section?.jlptLevel || '')} · ${escapeHtml(p.unit.title)}</strong> immediately (+40 XP).
        </p>
        <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-primary" id="start-placement-btn">Start Placement Quiz →</button>
          <button class="btn" data-nav="syllabus">Cancel</button>
        </div>
        <div style="margin-top:18px;">
          <button class="btn btn-sm" id="skip-placement-btn" style="opacity:0.8;">Skip Quiz &amp; Unlock Now (Free Explore)</button>
        </div>
      </section>
    `;
  }

  if (p.index >= p.questions.length) {
    const pct = Math.round((p.correctCount / p.questions.length) * 100);
    const passed = pct >= 80;
    return `
      ${renderHudBar(course)}
      <section class="card" style="text-align:center;padding:38px 24px;">
        <div style="font-size:52px;margin-bottom:8px;">${passed ? '🎉' : '📚'}</div>
        <h1 class="page-title">${passed ? 'Placement Passed — Unit Unlocked!' : 'Almost There!'}</h1>
        <p class="page-sub">You scored ${p.correctCount}/${p.questions.length} (${pct}%)${passed ? ' · +40 XP earned' : ' · 80% required to jump ahead'}</p>
        <div style="display:flex;justify-content:center;gap:10px;margin-top:22px;flex-wrap:wrap;">
          ${
            passed
              ? `<button class="btn btn-primary" data-nav="syllabus">Go to Unlocked Unit →</button>`
              : `<button class="btn btn-primary" id="retry-placement-btn">Try Again</button>
                 <button class="btn" data-nav="syllabus">Back to Path</button>`
          }
        </div>
      </section>
    `;
  }

  const q = p.questions[p.index];
  const pct = Math.round((p.index / p.questions.length) * 100);

  return `
    <div class="header-bar" style="margin-bottom:12px;">
      <div>
        <h1 class="page-title" style="font-size:20px;">Placement Test: ${escapeHtml(p.unit.title)}</h1>
        <p class="page-sub">Question ${p.index + 1} of ${p.questions.length} · Score 80%+ to unlock</p>
      </div>
      <button class="btn btn-sm" data-nav="syllabus">✕ Cancel</button>
    </div>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    <section class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="pill">${escapeHtml(q.promptLabel)}</span>
        ${!q.reverse ? `<button class="btn btn-sm" data-speak="${escapeHtml(q.item.term)}">🔊 Audio</button>` : ''}
      </div>
      <div class="prompt-main">${escapeHtml(q.promptMain)}</div>
      ${q.promptSub ? `<div class="prompt-sub">${escapeHtml(q.promptSub)}</div>` : ''}

      <div class="options-grid">
        ${q.options
          .map((opt) => {
            let cls = 'option-btn';
            if (p.answered) {
              if (opt.id === q.correctId) cls += ' correct';
              else if (opt.id === p.selectedId) cls += ' wrong';
            }
            return `
            <button class="${cls}" data-place-opt="${escapeHtml(opt.id)}" ${p.answered ? 'disabled' : ''}>
              <span>${escapeHtml(opt.label)}</span>
              ${state.showRomaji && opt.sub ? `<span style="font-size:12px;color:var(--text-muted);font-weight:500;">${escapeHtml(opt.sub)}</span>` : ''}
            </button>
          `;
          })
          .join('')}
      </div>

      ${
        p.answered
          ? `
        <div style="margin-top:18px;padding:14px;border-radius:12px;background:${p.wasCorrect ? 'var(--accent-soft)' : 'rgba(244,63,94,0.14)'};display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div>
            <strong>${p.wasCorrect ? 'Correct!' : 'Incorrect'}</strong>
            <div style="font-size:13px;color:var(--text-muted);">${escapeHtml(q.item.term)} — ${escapeHtml(q.item.translation)}</div>
          </div>
          <button class="btn btn-primary btn-sm" id="next-place-btn">Continue →</button>
        </div>
      `
          : ''
      }
    </section>
  `;
}

function renderGuidebookView(course) {
  const unit = state.guidebookUnit;
  if (!unit) return renderSyllabusView(course);

  return `
    ${renderHudBar(course)}
    <div class="header-bar">
      <div>
        <span class="pill accent">${escapeHtml(unit.cefrLevel || unit._section?.jlptLevel || 'Guidebook')}</span>
        <h1 class="page-title" style="margin-top:6px;">${escapeHtml(unit.title)} — Guidebook</h1>
        <p class="page-sub">${escapeHtml(unit.subtitle || '')}</p>
      </div>
      <button class="btn btn-sm" data-nav="syllabus">← Back to Path</button>
    </div>

    ${unit.lessons
      .map(
        (lesson) => `
      <section class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          <h3 style="margin:0;">${escapeHtml(lesson.title)}</h3>
          <button class="btn btn-primary btn-sm" data-start-lesson="${escapeHtml(unit.id)}|${escapeHtml(lesson.id)}">Practice Lesson</button>
        </div>
        ${lesson.grammarNote ? `<div class="grammar-box"><strong>Grammar Tip:</strong> ${escapeHtml(lesson.grammarNote)}</div>` : ''}
        <div style="display:grid;gap:8px;">
          ${lesson.items
            .map(
              (item) => `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;background:var(--surface-elevated);border:1px solid var(--border);border-radius:10px;">
              <div>
                <div style="font-size:17px;font-weight:700;">${escapeHtml(item.term)} ${item.reading && item.reading !== item.term ? `<span style="font-size:13px;color:var(--blue);font-weight:500;">(${escapeHtml(item.reading)})</span>` : ''}</div>
                ${state.showRomaji && item.transliteration ? `<div style="font-size:12px;color:var(--text-muted);">${escapeHtml(item.transliteration)}</div>` : ''}
                <div style="font-size:13px;font-weight:600;margin-top:2px;">${escapeHtml(item.translation)}</div>
                ${item.example ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${escapeHtml(item.example.term)} — ${escapeHtml(item.example.translation)}</div>` : ''}
              </div>
              <button class="btn btn-sm" data-speak="${escapeHtml(item.term)}">🔊</button>
            </div>
          `
            )
            .join('')}
        </div>
      </section>
    `
      )
      .join('')}
  `;
}

function renderLessonView(course) {
  const session = state.lessonSession;
  if (!session) return renderSyllabusView(course);

  if (session.showIntro) {
    return `
      ${renderHudBar(course)}
      <div class="header-bar">
        <div>
          <span class="pill accent">${escapeHtml(session.unit.cefrLevel || 'Lesson')}</span>
          <h1 class="page-title" style="margin-top:6px;">${escapeHtml(session.lesson.title)}</h1>
          <p class="page-sub">${escapeHtml(session.unit.title)} · ${session.lesson.items.length} items</p>
        </div>
        <button class="btn btn-sm" data-nav="syllabus">← Back to Path</button>
      </div>

      ${session.lesson.grammarNote ? `<div class="grammar-box"><strong>Grammar Note:</strong> ${escapeHtml(session.lesson.grammarNote)}</div>` : ''}

      <section class="card">
        <h3 style="margin-top:0;">Key Vocabulary &amp; Expressions</h3>
        <div style="display:grid;gap:10px;margin-bottom:18px;">
          ${session.lesson.items
            .map(
              (item) => `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px;background:var(--surface-elevated);border:1px solid var(--border);border-radius:10px;">
              <div>
                <div style="font-size:18px;font-weight:700;">${escapeHtml(item.term)} ${item.reading && item.reading !== item.term ? `<span style="font-size:13px;color:var(--blue);font-weight:500;">(${escapeHtml(item.reading)})</span>` : ''}</div>
                ${state.showRomaji && item.transliteration ? `<div style="font-size:13px;color:var(--blue);">${escapeHtml(item.transliteration)}</div>` : ''}
                <div style="font-size:13px;color:var(--text-muted);">${escapeHtml(item.translation)}</div>
              </div>
              <button class="btn btn-sm" data-speak="${escapeHtml(item.term)}">🔊 Listen</button>
            </div>
          `
            )
            .join('')}
        </div>
        <button class="btn btn-primary" id="begin-drills-btn">Begin Interactive Drills (${session.exercises.length}) →</button>
      </section>
    `;
  }

  if (session.index >= session.exercises.length) {
    const accuracy = Math.round((session.correctCount / session.exercises.length) * 100);
    return `
      ${renderHudBar(course)}
      <section class="card" style="text-align:center;padding:40px 24px;">
        <div style="font-size:52px;margin-bottom:8px;">🏆</div>
        <h1 class="page-title">Lesson Complete!</h1>
        <p class="page-sub">${escapeHtml(session.lesson.title)} · ${accuracy}% accuracy · +25 XP</p>
        <p style="font-size:13px;color:var(--text-muted);max-width:460px;margin:12px auto 22px;">
          The next lesson on your path is now unlocked, and all ${session.lesson.items.length} items are synced to your Spaced Repetition flashcards.
        </p>
        <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-primary" data-nav="syllabus">Continue Learning Path →</button>
          <button class="btn" data-nav="flashcards">Review Flashcards</button>
        </div>
      </section>
    `;
  }

  const ex = session.exercises[session.index];
  const pct = Math.round((session.index / session.exercises.length) * 100);

  return `
    <div class="header-bar" style="margin-bottom:12px;">
      <div>
        <h1 class="page-title" style="font-size:20px;">${escapeHtml(session.lesson.title)}</h1>
        <p class="page-sub">Exercise ${session.index + 1} of ${session.exercises.length}</p>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <span class="hud-chip" style="color:#f43f5e;">❤️ ${state.progress.chillMode ? '∞' : `${state.progress.hearts}/5`}</span>
        <button class="btn btn-sm" data-nav="syllabus">✕ Exit</button>
      </div>
    </div>

    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>

    <section class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <span class="pill">${escapeHtml(ex.promptLabel)}</span>
        ${ex.type === 'mc-to-source' ? `<button class="btn btn-sm" data-speak="${escapeHtml(ex.item.term)}">🔊 Audio</button>` : ''}
      </div>

      <div class="prompt-main">${escapeHtml(ex.promptMain)}</div>
      ${ex.promptSub ? `<div class="prompt-sub">${escapeHtml(ex.promptSub)}</div>` : ''}
      ${state.showRomaji && ex.type === 'mc-to-source' && ex.promptHint ? `<div style="font-size:14px;color:var(--text-muted);">${escapeHtml(ex.promptHint)}</div>` : ''}

      ${
        ex.type === 'type-recall'
          ? `
        <form id="type-answer-form" style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;">
          <input class="input" id="type-answer-input" placeholder="Type your answer in ${escapeHtml(course.targetLang.name)}..." value="${escapeHtml(session.typedValue)}" ${session.answered ? 'disabled' : ''} autocomplete="off" />
          ${!session.answered ? `<button class="btn btn-primary" type="submit">Check Answer</button>` : ''}
        </form>
      `
          : `
        <div class="options-grid">
          ${ex.options
            .map((opt) => {
              let cls = 'option-btn';
              if (session.answered) {
                if (opt.id === ex.correctId) cls += ' correct';
                else if (opt.id === session.selectedId) cls += ' wrong';
              }
              return `
              <button class="${cls}" data-option-id="${escapeHtml(opt.id)}" ${session.answered ? 'disabled' : ''}>
                <span>${escapeHtml(opt.label)}</span>
                ${state.showRomaji && opt.sub ? `<span style="font-size:12px;color:var(--text-muted);font-weight:500;">${escapeHtml(opt.sub)}</span>` : ''}
              </button>
            `;
            })
            .join('')}
        </div>
      `
      }

      ${
        session.answered
          ? `
        <div style="margin-top:18px;padding:14px;border-radius:12px;background:${session.wasCorrect ? 'var(--accent-soft)' : 'rgba(244,63,94,0.14)'};display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
          <div>
            <strong>${session.wasCorrect ? 'Nicely done!' : 'Keep practicing!'}</strong>
            <div style="font-size:13px;color:var(--text-muted);">
              ${escapeHtml(ex.item.term)} (${escapeHtml(ex.item.transliteration || '')}) — ${escapeHtml(ex.item.translation)}
            </div>
          </div>
          <button class="btn btn-primary btn-sm" id="next-exercise-btn">Continue →</button>
        </div>
      `
          : ''
      }
    </section>
  `;
}

function renderFlashcardsView(course) {
  const sections = getSections(course);
  const filters = ['ALL', ...sections.map((s) => s.jlptLevel).filter(Boolean)];
  const { queue, index, flipped } = state.flashcardSession;
  const item = queue[index];
  const stdLabel = getStandardLabel(course);

  const filterBar = `
    <div class="filter-row">
      ${filters
        .map(
          (f) => `<button class="filter-chip ${state.flashcardFilter === f ? 'active' : ''}" data-fc-filter="${escapeHtml(f)}">${escapeHtml(f === 'ALL' ? 'All Levels' : `${stdLabel} ${f}`)}</button>`
        )
        .join('')}
    </div>
  `;

  if (!item) {
    return `
      ${renderHudBar(course)}
      <div class="header-bar">
        <div>
          <h1 class="page-title">Spaced Repetition Flashcards</h1>
          <p class="page-sub">${escapeHtml(course.title)}</p>
        </div>
      </div>
      ${filterBar}
      <section class="card" style="text-align:center;padding:36px 24px;">
        <div style="font-size:40px;margin-bottom:8px;">✅</div>
        <h2>Review Session Complete</h2>
        <p class="page-sub">All queued flashcards reviewed and scheduled by permanent item ID.</p>
        <div style="margin-top:18px;">
          <button class="btn btn-primary" id="restart-flashcards-btn">Review Full Deck</button>
        </div>
      </section>
    `;
  }

  const cardState = state.srs[item.id] || createCardState(item.id);

  return `
    ${renderHudBar(course)}
    <div class="header-bar">
      <div>
        <h1 class="page-title">Spaced Repetition Flashcards</h1>
        <p class="page-sub">Card ${index + 1} of ${queue.length} · Tap card to reveal meaning</p>
      </div>
      <button class="btn btn-sm" data-speak="${escapeHtml(item.term)}">🔊 Pronounce</button>
    </div>

    ${filterBar}

    <section class="card flashcard" id="flashcard-box">
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <span class="pill accent">${escapeHtml(item._level || 'Core')}</span>
        <span class="pill">${flipped ? 'Meaning' : escapeHtml(course.targetLang.name)}</span>
      </div>
      <div class="prompt-main">${escapeHtml(item.term)}</div>
      ${item.reading && item.reading !== item.term ? `<div class="prompt-sub">${escapeHtml(item.reading)}</div>` : ''}
      ${state.showRomaji && item.transliteration ? `<div style="color:var(--text-muted);font-size:15px;">${escapeHtml(item.transliteration)}</div>` : ''}

      ${
        flipped
          ? `
        <hr style="width:60%;border:none;border-top:1px solid var(--border);margin:18px 0;" />
        <div style="font-size:22px;font-weight:800;color:var(--accent);">${escapeHtml(item.translation)}</div>
        ${
          item.example
            ? `<div style="margin-top:12px;font-size:13px;color:var(--text-muted);max-width:480px;">
                <div>${escapeHtml(item.example.term)}</div>
                <div>${escapeHtml(item.example.translation)}</div>
              </div>`
            : ''
        }
      `
          : `<p style="margin-top:24px;font-size:13px;color:var(--text-muted);">Click anywhere on this card to flip</p>`
      }
    </section>

    ${
      flipped
        ? `
      <div class="rating-row">
        <button class="rating-btn" data-rate="${RATINGS.AGAIN}">Again<span>${formatIntervalLabel(cardState, RATINGS.AGAIN)}</span></button>
        <button class="rating-btn" data-rate="${RATINGS.HARD}">Hard<span>${formatIntervalLabel(cardState, RATINGS.HARD)}</span></button>
        <button class="rating-btn" data-rate="${RATINGS.GOOD}" style="border-color:var(--accent);">Good<span>${formatIntervalLabel(cardState, RATINGS.GOOD)}</span></button>
        <button class="rating-btn" data-rate="${RATINGS.EASY}">Easy<span>${formatIntervalLabel(cardState, RATINGS.EASY)}</span></button>
      </div>
    `
        : ''
    }
  `;
}

function renderStudioView(course) {
  const allUnits = getAllUnits(course);
  return `
    ${renderHudBar(course)}
    <div class="header-bar">
      <div>
        <h1 class="page-title">Community Course Studio</h1>
        <p class="page-sub">Add a new language course, append vocabulary items, or export open JSON.</p>
      </div>
      <button class="btn btn-sm" id="export-course-btn">⬇ Export Current JSON</button>
    </div>

    ${state.studioMessage ? `<div class="grammar-box">${escapeHtml(state.studioMessage)}</div>` : ''}

    <section class="card">
      <h3 style="margin-top:0;">Add a New Language Course</h3>
      <form id="create-course-form">
        <div class="form-grid">
          <div>
            <label class="field-label">Course ID (e.g. en-ko, en-fr)</label>
            <input class="input" name="id" placeholder="en-ko" required />
          </div>
          <div>
            <label class="field-label">Target Language Name</label>
            <input class="input" name="targetName" placeholder="Korean" required />
          </div>
          <div>
            <label class="field-label">Native Script Name</label>
            <input class="input" name="nativeName" placeholder="한국어" />
          </div>
          <div>
            <label class="field-label">Speech Locale (BCP-47)</label>
            <input class="input" name="speechLocale" placeholder="ko-KR" required />
          </div>
        </div>
        <button class="btn btn-primary btn-sm" type="submit">+ Create Course</button>
      </form>
    </section>

    <section class="card">
      <h3 style="margin-top:0;">Add Item to "${escapeHtml(course.title)}"</h3>
      <form id="add-item-form">
        <div class="form-grid">
          <div>
            <label class="field-label">Target Lesson</label>
            <select class="input" name="lessonRef">
              ${allUnits
                .flatMap((u) =>
                  u.lessons.map(
                    (l) => `<option value="${escapeHtml(u.id)}|${escapeHtml(l.id)}">[${escapeHtml(u._section.jlptLevel)}] ${escapeHtml(u.title)} — ${escapeHtml(l.title)}</option>`
                  )
                )
                .join('')}
            </select>
          </div>
          <div>
            <label class="field-label">Term (Target Script)</label>
            <input class="input" name="term" placeholder="ありがとう" required />
          </div>
          <div>
            <label class="field-label">Transliteration / Guide</label>
            <input class="input" name="transliteration" placeholder="arigatou" />
          </div>
          <div>
            <label class="field-label">English Translation</label>
            <input class="input" name="translation" placeholder="Thank you" required />
          </div>
        </div>
        <button class="btn btn-primary btn-sm" type="submit">+ Add Item to Syllabus</button>
      </form>
    </section>

    <section class="card">
      <h3 style="margin-top:0;">Import Course JSON</h3>
      <textarea id="import-json-text" rows="5" placeholder='Paste a valid OpenLingo course JSON object here...'></textarea>
      <div style="margin-top:10px;">
        <button class="btn btn-sm" id="import-course-btn">Import JSON Course</button>
      </div>
    </section>
  `;
}

function renderBackupView(course) {
  const completedLessonsCount = Object.keys(state.progress.completedLessons || {}).length;
  const srsCount = Object.keys(state.srs || {}).length;
  const masteredChars = Object.values(state.progress.charMastery || {}).filter((v) => v >= 3).length;
  const customCount = state.courses.filter((c) => c._custom).length;
  const isAndroidNative = Boolean(window.AndroidBackup);

  return `
    ${renderHudBar(course)}
    <div class="header-bar">
      <div>
        <h1 class="page-title">Backup &amp; Restore Progress</h1>
        <p class="page-sub">100% offline, server-free backup for your lessons, streak, XP, flashcards, and custom courses.</p>
      </div>
      <span class="pill accent">${isAndroidNative ? 'Android Files Ready' : 'Web / Desktop Ready'}</span>
    </div>

    ${state.backupMessage ? `<div class="grammar-box">${escapeHtml(state.backupMessage)}</div>` : ''}

    <section class="card">
      <h3 style="margin-top:0;">Current Device Progress</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;">
        <div style="padding:12px;border-radius:10px;background:var(--surface-elevated);border:1px solid var(--border);">
          <div style="font-size:12px;color:var(--text-muted);">Completed Lessons</div>
          <div style="font-size:20px;font-weight:800;">${completedLessonsCount}</div>
        </div>
        <div style="padding:12px;border-radius:10px;background:var(--surface-elevated);border:1px solid var(--border);">
          <div style="font-size:12px;color:var(--text-muted);">Total XP / Streak</div>
          <div style="font-size:20px;font-weight:800;">${state.progress.xp} XP · ${state.progress.streak}d</div>
        </div>
        <div style="padding:12px;border-radius:10px;background:var(--surface-elevated);border:1px solid var(--border);">
          <div style="font-size:12px;color:var(--text-muted);">Flashcards Tracked</div>
          <div style="font-size:20px;font-weight:800;">${srsCount}</div>
        </div>
        <div style="padding:12px;border-radius:10px;background:var(--surface-elevated);border:1px solid var(--border);">
          <div style="font-size:12px;color:var(--text-muted);">Characters / Custom</div>
          <div style="font-size:20px;font-weight:800;">${masteredChars} / ${customCount}</div>
        </div>
      </div>
    </section>

    <section class="card">
      <h3 style="margin-top:0;">1. Document File Backup (.json)</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-top:0;">
        Save a portable JSON file to your phone's Downloads, Google Drive, or computer—and restore it anytime with zero internet or account required.
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <button class="btn btn-primary" id="save-backup-file-btn">⬇ Save Backup File</button>
        <button class="btn" id="open-backup-file-btn">⬆ Restore from File</button>
        <input type="file" id="web-backup-file-input" accept=".json,.txt,application/json,text/plain" style="display:none;" />
      </div>
    </section>

    <section class="card">
      <h3 style="margin-top:0;">2. Copy &amp; Paste Backup Code</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-top:0;">
        Generate a compact single-line backup code (<code>OL1:...</code>) to move progress between your phone and desktop browser via notes or chat.
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
        <button class="btn btn-primary btn-sm" id="copy-backup-code-btn">📋 Generate &amp; Copy Backup Code</button>
        <button class="btn btn-sm" id="show-backup-code-btn">👁 Show Code Below</button>
      </div>
      ${
        state.backupCodePreview
          ? `<textarea id="backup-code-output" rows="3" readonly style="margin-bottom:14px;font-family:monospace;font-size:12px;">${escapeHtml(state.backupCodePreview)}</textarea>`
          : ''
      }
      <label class="field-label">Paste Backup Code (OL1:...) or JSON to Restore</label>
      <textarea id="restore-code-input" rows="3" placeholder="Paste your OL1:... backup code or openlingo-backup.json contents here..." style="font-family:monospace;font-size:12px;"></textarea>
      <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <button class="btn btn-primary btn-sm" id="restore-code-btn">🔄 Restore from Pasted Text</button>
        <button class="btn btn-sm" id="reset-progress-btn" style="color:var(--danger);">🗑 Reset Local Progress</button>
      </div>
    </section>
  `;
}

/* ---------- Events ---------- */
function switchCourse(newId) {
  state.activeCourseId = newId;
  const nextCourse = getActiveCourse();
  const nextSections = getSections(nextCourse);
  state.selectedSectionId = nextSections[0]?.id || 'all';
  state.flashcardFilter = 'ALL';
  state.activeScriptTab = null;
  state.scriptDrill = null;
  state.placementSession = null;
  state.lessonSession = null;
  state.view = 'syllabus';
  render();
}

function attachEvents(course) {
  document.querySelectorAll('[data-toggle-theme]').forEach((btn) => {
    btn.addEventListener('click', toggleTheme);
  });

  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.nav;
      state.scriptDrill = null;
      if (target === 'flashcards') openFlashcards();
      else {
        state.view = target;
        state.studioMessage = '';
        render();
      }
    });
  });

  const select = document.getElementById('course-select');
  if (select) select.addEventListener('change', (e) => switchCourse(e.target.value));
  const mSelect = document.getElementById('mobile-course-select');
  if (mSelect) mSelect.addEventListener('change', (e) => switchCourse(e.target.value));

  const romajiToggle = document.getElementById('toggle-romaji');
  if (romajiToggle) {
    romajiToggle.addEventListener('change', (e) => {
      state.showRomaji = e.target.checked;
      render();
    });
  }

  const chillToggle = document.getElementById('toggle-chill');
  if (chillToggle) {
    chillToggle.addEventListener('change', (e) => {
      state.progress.chillMode = e.target.checked;
      saveLocalState();
      render();
    });
  }

  document.querySelectorAll('[data-select-section]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedSectionId = btn.dataset.selectSection;
      render();
    });
  });

  document.querySelectorAll('[data-guidebook]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.lessonSheet = null;
      openGuidebook(btn.dataset.guidebook);
    });
  });

  document.querySelectorAll('[data-jump-quiz]').forEach((btn) => {
    btn.addEventListener('click', () => openPlacementQuiz(course, btn.dataset.jumpQuiz));
  });

  document.querySelectorAll('[data-open-sheet]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [unitId, lessonId] = btn.dataset.openSheet.split('|');
      const unit = getAllUnits(course).find((u) => u.id === unitId);
      const lesson = unit?.lessons.find((l) => l.id === lessonId);
      if (!lesson) return;
      state.lessonSheet = { unit, lesson };
      render();
    });
  });

  const sheetBackdrop = document.getElementById('sheet-backdrop');
  if (sheetBackdrop) {
    sheetBackdrop.addEventListener('click', (e) => {
      if (e.target === sheetBackdrop) {
        state.lessonSheet = null;
        render();
      }
    });
  }

  document.querySelectorAll('[data-start-lesson]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.lessonSheet = null;
      const [unitId, lessonId] = btn.dataset.startLesson.split('|');
      startLesson(unitId, lessonId);
    });
  });

  document.querySelectorAll('[data-speak]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakText(btn.dataset.speak, btn.dataset.speakLocale || course.targetLang.speechLocale);
    });
  });

  /* Characters Tab Events */
  document.querySelectorAll('[data-script-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeScriptTab = btn.dataset.scriptTab;
      render();
    });
  });

  document.querySelectorAll('[data-char-tap]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const glyph = btn.dataset.charTap;
      speakText(glyph, btn.dataset.speakLocale || course.targetLang.speechLocale);
      state.progress.charMastery[glyph] = Math.min(3, (state.progress.charMastery[glyph] || 0) + 1);
      saveLocalState();
      render();
    });
  });

  const startScriptBtn = document.getElementById('start-script-drill-btn');
  if (startScriptBtn) {
    startScriptBtn.addEventListener('click', () => {
      startScriptDrill(getScriptSetForCourse(course), state.activeScriptTab);
    });
  }

  const closeScriptBtn = document.getElementById('close-script-drill');
  if (closeScriptBtn) {
    closeScriptBtn.addEventListener('click', () => {
      state.scriptDrill = null;
      render();
    });
  }

  const retryScriptBtn = document.getElementById('retry-script-drill');
  if (retryScriptBtn) {
    retryScriptBtn.addEventListener('click', () => {
      startScriptDrill(getScriptSetForCourse(course), state.activeScriptTab);
    });
  }

  document.querySelectorAll('[data-script-opt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const d = state.scriptDrill;
      const q = d.questions[d.index];
      d.answered = true;
      d.selectedGlyph = btn.dataset.scriptOpt;
      d.wasCorrect = d.selectedGlyph === q.correctGlyph;
      if (d.wasCorrect) {
        d.correctCount += 1;
        state.progress.charMastery[q.ch.glyph] = Math.min(3, (state.progress.charMastery[q.ch.glyph] || 0) + 1);
      }
      speakText(q.ch.glyph, d.speechLocale);
      saveLocalState();
      render();
    });
  });

  const nextScriptQ = document.getElementById('next-script-q');
  if (nextScriptQ) {
    nextScriptQ.addEventListener('click', () => {
      const d = state.scriptDrill;
      d.index += 1;
      d.answered = false;
      d.selectedGlyph = null;
      if (d.index >= d.questions.length) {
        state.progress.xp += 20;
        recordStudyActivity();
        saveLocalState();
      }
      render();
    });
  }

  /* Placement Quiz Events */
  const startPlaceBtn = document.getElementById('start-placement-btn');
  if (startPlaceBtn) {
    startPlaceBtn.addEventListener('click', () => {
      state.placementSession.showIntro = false;
      render();
    });
  }

  const skipPlaceBtn = document.getElementById('skip-placement-btn');
  if (skipPlaceBtn) {
    skipPlaceBtn.addEventListener('click', () => {
      unlockUnitDirectly(course, state.placementSession.unit.id);
    });
  }

  const retryPlaceBtn = document.getElementById('retry-placement-btn');
  if (retryPlaceBtn) {
    retryPlaceBtn.addEventListener('click', () => {
      openPlacementQuiz(course, state.placementSession.unit.id);
    });
  }

  document.querySelectorAll('[data-place-opt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = state.placementSession;
      const q = p.questions[p.index];
      p.answered = true;
      p.selectedId = btn.dataset.placeOpt;
      p.wasCorrect = p.selectedId === q.correctId;
      if (p.wasCorrect) p.correctCount += 1;
      render();
    });
  });

  const nextPlaceBtn = document.getElementById('next-place-btn');
  if (nextPlaceBtn) {
    nextPlaceBtn.addEventListener('click', () => {
      const p = state.placementSession;
      p.index += 1;
      p.answered = false;
      p.selectedId = null;
      if (p.index >= p.questions.length) {
        const pct = Math.round((p.correctCount / p.questions.length) * 100);
        if (pct >= 80) {
          state.progress.unlockedUnits[`${course.id}:${p.unit.id}`] = true;
          state.progress.xp += 40;
          recordStudyActivity();
          saveLocalState();
        }
      }
      render();
    });
  }

  /* Lesson Runner Events */
  const beginDrills = document.getElementById('begin-drills-btn');
  if (beginDrills) {
    beginDrills.addEventListener('click', () => {
      state.lessonSession.showIntro = false;
      render();
    });
  }

  document.querySelectorAll('[data-option-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const session = state.lessonSession;
      const ex = session.exercises[session.index];
      session.answered = true;
      session.selectedId = btn.dataset.optionId;
      session.wasCorrect = session.selectedId === ex.correctId;
      if (session.wasCorrect) {
        session.correctCount += 1;
      } else if (!state.progress.chillMode) {
        state.progress.hearts = Math.max(0, state.progress.hearts - 1);
      }
      render();
    });
  });

  const typeForm = document.getElementById('type-answer-form');
  if (typeForm) {
    typeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('type-answer-input');
      const session = state.lessonSession;
      const ex = session.exercises[session.index];
      session.typedValue = input.value;
      session.answered = true;
      session.wasCorrect = ex.acceptedAnswers.includes(normalizeAnswer(input.value));
      if (session.wasCorrect) {
        session.correctCount += 1;
      } else if (!state.progress.chillMode) {
        state.progress.hearts = Math.max(0, state.progress.hearts - 1);
      }
      render();
    });
  }

  const nextEx = document.getElementById('next-exercise-btn');
  if (nextEx) {
    nextEx.addEventListener('click', () => {
      const session = state.lessonSession;
      session.index += 1;
      session.answered = false;
      session.selectedId = null;
      session.typedValue = '';

      if (session.index >= session.exercises.length) {
        const key = `${course.id}:${session.lesson.id}`;
        state.progress.completedLessons[key] = true;
        state.progress.xp += 25;
        state.progress.hearts = 5;
        recordStudyActivity();
        session.lesson.items.forEach((item) => {
          if (!state.srs[item.id]) state.srs[item.id] = createCardState(item.id);
        });
        saveLocalState();
      }
      render();
    });
  }

  /* Flashcard Events */
  document.querySelectorAll('[data-fc-filter]').forEach((btn) => {
    btn.addEventListener('click', () => openFlashcards(btn.dataset.fcFilter));
  });

  const flashcardBox = document.getElementById('flashcard-box');
  if (flashcardBox) {
    flashcardBox.addEventListener('click', () => {
      state.flashcardSession.flipped = !state.flashcardSession.flipped;
      render();
    });
  }

  document.querySelectorAll('[data-rate]').forEach((btn) => {
    btn.addEventListener('click', () => rateCurrentFlashcard(Number(btn.dataset.rate)));
  });

  const restartCards = document.getElementById('restart-flashcards-btn');
  if (restartCards) {
    restartCards.addEventListener('click', () => {
      let items = getAllItems(course);
      if (state.flashcardFilter !== 'ALL') {
        items = items.filter((it) => it._level === state.flashcardFilter);
      }
      state.flashcardSession = { queue: [...items], index: 0, flipped: false };
      render();
    });
  }

  /* Course Studio Events */
  const createCourseForm = document.getElementById('create-course-form');
  if (createCourseForm) {
    createCourseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(createCourseForm);
      const id = String(fd.get('id')).trim().toLowerCase();
      const targetName = String(fd.get('targetName')).trim();
      const nativeName = String(fd.get('nativeName')).trim() || targetName;
      const speechLocale = String(fd.get('speechLocale')).trim();

      const newCourse = {
        id,
        version: '0.1.0',
        title: `${targetName} for English Speakers`,
        description: `Community-created open-source syllabus for learning ${targetName}.`,
        license: 'CC-BY-SA-4.0',
        _custom: true,
        sourceLang: { code: 'en', name: 'English', dir: 'ltr' },
        targetLang: { code: id.split('-')[1] || id, name: targetName, nativeName, speechLocale, dir: 'ltr', usesTransliteration: true },
        sections: [
          {
            id: 'sec-starter',
            jlptLevel: 'A0',
            tier: 'Beginner',
            title: 'Starter Basics',
            description: `First phrases in ${targetName}`,
            color: '#10b981',
            units: [
              {
                id: 'unit-1',
                title: 'Starter Basics',
                subtitle: 'First words & greetings',
                cefrLevel: 'A0',
                color: '#10b981',
                lessons: [
                  {
                    id: 'u1-l1',
                    title: 'Lesson 1',
                    objective: `Learn your first ${targetName} phrases.`,
                    grammarNote: 'Add a short grammar note for learners here.',
                    items: [{ id: `${id}_hello`, term: 'Hello (edit me)', transliteration: 'hello', translation: 'Hello', tags: ['greeting'] }]
                  }
                ]
              }
            ]
          }
        ]
      };

      state.courses.push(newCourse);
      state.activeCourseId = newCourse.id;
      state.selectedSectionId = 'sec-starter';
      state.studioMessage = `Created new course "${newCourse.title}". Add items below or export its JSON!`;
      saveLocalState();
      render();
    });
  }

  const addItemForm = document.getElementById('add-item-form');
  if (addItemForm) {
    addItemForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(addItemForm);
      const [unitId, lessonId] = String(fd.get('lessonRef')).split('|');
      const unit = getAllUnits(course).find((u) => u.id === unitId);
      const lesson = unit?.lessons.find((l) => l.id === lessonId);
      if (!lesson) return;

      const term = String(fd.get('term')).trim();
      const transliteration = String(fd.get('transliteration')).trim();
      const translation = String(fd.get('translation')).trim();
      lesson.items.push({
        id: `${course.id}_${Date.now()}`,
        term,
        reading: term,
        transliteration,
        translation,
        tags: ['community']
      });
      course._custom = true;
      state.studioMessage = `Added "${term}" (${translation}) to ${lesson.title}.`;
      saveLocalState();
      render();
    });
  }

  const exportBtn = document.getElementById('export-course-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const clean = { ...course };
      delete clean._custom;
      exportJsonFile(`${course.id}-course.json`, JSON.stringify(clean, null, 2));
    });
  }

  /* Backup & Restore Events */
  const saveBackupFileBtn = document.getElementById('save-backup-file-btn');
  if (saveBackupFileBtn) {
    saveBackupFileBtn.addEventListener('click', () => {
      const dateStr = new Date().toISOString().slice(0, 10);
      const payload = JSON.stringify(buildBackupPayload(), null, 2);
      exportJsonFile(`openlingo-backup-${dateStr}.json`, payload);
    });
  }

  const openBackupFileBtn = document.getElementById('open-backup-file-btn');
  const webFileInput = document.getElementById('web-backup-file-input');
  if (openBackupFileBtn) {
    openBackupFileBtn.addEventListener('click', () => {
      if (window.AndroidBackup && typeof window.AndroidBackup.openBackup === 'function') {
        window.AndroidBackup.openBackup();
      } else if (webFileInput) {
        webFileInput.click();
      }
    });
  }
  if (webFileInput) {
    webFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          restoreBackupPayload(String(reader.result || ''));
        } catch (err) {
          state.backupMessage = `Restore failed: ${err.message}`;
          render();
        }
      };
      reader.readAsText(file);
    });
  }

  const copyBackupCodeBtn = document.getElementById('copy-backup-code-btn');
  if (copyBackupCodeBtn) {
    copyBackupCodeBtn.addEventListener('click', async () => {
      const code = encodeBackupCode(buildBackupPayload());
      state.backupCodePreview = code;
      const copied = await copyTextSafe(code);
      state.backupMessage = copied
        ? 'Backup code copied to clipboard! Paste it on another device or save it in your notes.'
        : 'Backup code generated below — select and copy it manually.';
      render();
    });
  }

  const showBackupCodeBtn = document.getElementById('show-backup-code-btn');
  if (showBackupCodeBtn) {
    showBackupCodeBtn.addEventListener('click', () => {
      state.backupCodePreview = encodeBackupCode(buildBackupPayload());
      state.backupMessage = 'Backup code ready below.';
      render();
    });
  }

  const restoreCodeBtn = document.getElementById('restore-code-btn');
  if (restoreCodeBtn) {
    restoreCodeBtn.addEventListener('click', () => {
      const raw = document.getElementById('restore-code-input')?.value || '';
      try {
        restoreBackupPayload(raw);
      } catch (err) {
        state.backupMessage = `Restore failed: ${err.message}`;
        render();
      }
    });
  }

  const resetProgressBtn = document.getElementById('reset-progress-btn');
  if (resetProgressBtn) {
    resetProgressBtn.addEventListener('click', () => {
      if (!confirm('Reset all local progress and flashcard history on this device?')) return;
      state.progress = {
        completedLessons: {},
        unlockedUnits: {},
        charMastery: {},
        xp: 0,
        streak: 1,
        lastActiveDay: null,
        hearts: 5,
        chillMode: false
      };
      state.srs = {};
      state.backupCodePreview = '';
      saveLocalState();
      state.backupMessage = 'Local progress cleared. You can restore anytime from a backup file or code.';
      render();
    });
  }

  const importBtn = document.getElementById('import-course-btn');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const raw = document.getElementById('import-json-text').value;
      try {
        const parsed = JSON.parse(raw);
        if (!parsed.id || (!Array.isArray(parsed.units) && !Array.isArray(parsed.sections))) {
          throw new Error('Missing id or units/sections');
        }
        parsed._custom = true;
        const existingIdx = state.courses.findIndex((c) => c.id === parsed.id);
        if (existingIdx >= 0) state.courses[existingIdx] = parsed;
        else state.courses.push(parsed);
        state.activeCourseId = parsed.id;
        state.selectedSectionId = getSections(parsed)[0]?.id || 'all';
        state.studioMessage = `Imported course "${parsed.title || parsed.id}" successfully.`;
        saveLocalState();
        render();
      } catch (err) {
        state.studioMessage = `Invalid JSON: ${err.message}`;
        render();
      }
    });
  }
}

function renderLessonSheet(course) {
  const sheet = state.lessonSheet;
  if (!sheet) return '';
  const done = Boolean(state.progress.completedLessons[`${course.id}:${sheet.lesson.id}`]);
  const accent = sheet.unit.color || sheet.unit._section?.color || '#10b981';
  return `
    <div id="sheet-backdrop" class="sheet-backdrop">
      <div class="lesson-sheet">
        <div class="sheet-handle"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
          <span class="pill accent" style="border-color:${escapeHtml(accent)};color:${escapeHtml(accent)};">${escapeHtml(sheet.unit.cefrLevel || 'Lesson')} · ${escapeHtml(sheet.unit.title)}</span>
          <span class="pill">${sheet.lesson.items.length} items</span>
        </div>
        <h2 style="margin:6px 0 4px;font-size:20px;">${escapeHtml(sheet.lesson.title)}</h2>
        <p style="margin:0 0 16px;font-size:13px;color:var(--text-muted);">${escapeHtml(sheet.lesson.objective || '')}</p>
        <div style="display:grid;gap:10px;">
          <button class="btn btn-primary" style="width:100%;padding:13px;background:${escapeHtml(accent)};border-color:${escapeHtml(accent)};" data-start-lesson="${escapeHtml(sheet.unit.id)}|${escapeHtml(sheet.lesson.id)}">
            ${done ? 'PRACTICE AGAIN (+25 XP)' : 'START LESSON (+25 XP)'}
          </button>
          <button class="btn" style="width:100%;" data-guidebook="${escapeHtml(sheet.unit.id)}">📖 Open Unit Guidebook</button>
        </div>
      </div>
    </div>
  `;
}

function render() {
  const course = getActiveCourse();
  if (!course) return;

  let mainContent = '';
  if (state.view === 'syllabus') mainContent = renderSyllabusView(course);
  else if (state.view === 'characters') mainContent = renderCharactersView(course);
  else if (state.view === 'placement') mainContent = renderPlacementView(course);
  else if (state.view === 'guidebook') mainContent = renderGuidebookView(course);
  else if (state.view === 'lesson') mainContent = renderLessonView(course);
  else if (state.view === 'flashcards') mainContent = renderFlashcardsView(course);
  else if (state.view === 'studio') mainContent = renderStudioView(course);
  else if (state.view === 'backup') mainContent = renderBackupView(course);

  document.getElementById('app').innerHTML = `
    ${renderSidebar(course)}
    ${renderMobileTopbar(course)}
    <main class="main">${mainContent}</main>
    ${renderMobileNav(course)}
    ${renderLessonSheet(course)}
  `;
  attachEvents(course);
}

async function loadCourseManifest(manifestUrl) {
  const res = await fetch(manifestUrl);
  const course = await res.json();
  if (Array.isArray(course.sectionFiles) && course.sectionFiles.length) {
    const loadedSections = await Promise.all(
      course.sectionFiles.map((fileUrl) => fetch(fileUrl).then((r) => r.json()))
    );
    course.sections = loadedSections;
  }
  return course;
}

async function init() {
  loadLocalState();

  let courseManifestUrls = [
    './courses/en-ja/course.json',
    './courses/en-es/course.json',
    './courses/en-ml/course.json'
  ];
  try {
    const regRes = await fetch('./courses/registry.json');
    if (regRes.ok) {
      const reg = await regRes.json();
      if (Array.isArray(reg.courses) && reg.courses.length) {
        courseManifestUrls = reg.courses;
      }
    }
  } catch {
    // Fallback to built-in course list
  }

  const loadedCourses = await Promise.all(courseManifestUrls.map(loadCourseManifest));
  state.courses = loadedCourses;
  const active = getActiveCourse();
  state.selectedSectionId = active?.sections?.[0]?.id || 'all';

  try {
    const customCourses = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]');
    customCourses.forEach((c) => {
      const idx = state.courses.findIndex((x) => x.id === c.id);
      if (idx >= 0) state.courses[idx] = c;
      else state.courses.push(c);
    });
  } catch {
    // Ignore storage errors
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  render();
}

init();
