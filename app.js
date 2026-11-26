import { RATINGS, createCardState, scheduleReview, formatIntervalLabel, isDue } from './src/srs.js';
import { generateLessonExercises, normalizeAnswer } from './src/exercises.js';
import { getScriptSetForCourse } from './src/scripts.js';
import { mountDrawBoard } from './src/drawboard.js';
import { APP_CONFIG } from './src/config.js';
import { uiIcon } from './src/icons.js';
import { normalizeRegistryEntries, fetchGitHubCatalog, fetchCourseFromGitHub } from './src/catalog.js';
import {
  getGoogleSession,
  signInWithGoogle,
  signOutGoogle,
  backupToGoogleDrive,
  restoreFromGoogleDrive
} from './src/googleSync.js';

const STORAGE_KEYS = {
  COURSES: 'openlingo_custom_courses_v2',
  GITHUB_COURSES: 'openlingo_github_courses_v1',
  PROGRESS: 'openlingo_progress_v2',
  SRS: 'openlingo_srs_v2',
  THEME: 'openlingo_theme_v1',
  SETTINGS: 'openlingo_sync_settings_v1',
  GUEST: 'openlingo_guest_mode_v1',
  SYNC_META: 'openlingo_sync_meta_v1',
  PROFILE: 'openlingo_profile_v1',
  PREFS: 'openlingo_prefs_v1',
  ENROLLED: 'openlingo_enrolled_courses_v1'
};

const AVATAR_PRESETS = ['あ', '語', 'Ñ', 'അ', 'A', '★', '◆', '▲'];

const state = {
  view: 'syllabus', // 'syllabus' | 'characters' | 'lesson' | 'placement' | 'guidebook' | 'flashcards' | 'studio' | 'profile' | 'settings' | 'backup'
  courses: [],
  enrolledCourseIds: [],
  activeCourseId: '',
  showAddCoursePicker: false,
  selectedSectionId: 'sec-n5',
  activeScriptTab: null,
  scriptDrill: null,
  drawSession: null, // { tabId, chars, index, guideMode, strokes, result }
  drawController: null,
  flashcardFilter: 'ALL',
  theme: 'dark', // 'dark' | 'light' | 'system'
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
  profile: {
    displayName: '',
    bio: '',
    avatarDataUrl: '',
    avatarEmoji: '',
    dailyGoalXp: 50
  },
  srs: {},
  showRomaji: true,
  audioRate: 0.9,
  autoSync: true,
  guidebookUnit: null,
  lessonSheet: null,
  lessonSession: null,
  placementSession: null,
  flashcardSession: { queue: [], index: 0, flipped: false },
  studioMessage: '',
  backupMessage: '',
  profileMessage: '',
  backupCodePreview: '',
  syncSettings: {
    githubRepo: APP_CONFIG.githubRepo,
    githubBranch: APP_CONFIG.githubBranch,
    googleClientId: APP_CONFIG.googleClientId
  },
  catalogEntries: [],
  catalogLoading: false,
  catalogStatus: '',
  googleBusy: false,
  syncingCloud: false,
  authError: '',
  guestMode: false,
  syncMeta: { lastSyncedAt: null, source: '' },
  audioToast: ''
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

function getCourseFlag(course) {
  const code = (course?.targetLang?.code || 'LN').toUpperCase();
  return code;
}

function getUnitSolidColor(unitColor) {
  // Keep Rich Purple as primary brand accent instead of legacy green course defaults
  if (!unitColor || unitColor.toLowerCase() === '#10b981' || unitColor.toLowerCase() === '#059669') {
    return '#7c3aed';
  }
  return unitColor;
}

function getEnrolledCourses() {
  return state.enrolledCourseIds
    .map((id) => state.courses.find((c) => c.id === id))
    .filter(Boolean);
}

function getAvailableCoursesToAdd() {
  return state.courses.filter((c) => !state.enrolledCourseIds.includes(c.id));
}

function getActiveCourse() {
  const enrolled = getEnrolledCourses();
  if (!enrolled.length) return null;
  return enrolled.find((c) => c.id === state.activeCourseId) || enrolled[0];
}

function enrollCourse(courseId, openPath = false) {
  const target = state.courses.find((c) => c.id === courseId);
  if (!target) return;
  if (!state.enrolledCourseIds.includes(courseId)) {
    state.enrolledCourseIds = [...state.enrolledCourseIds, courseId];
  }
  if (openPath || !state.activeCourseId || !state.enrolledCourseIds.includes(state.activeCourseId)) {
    state.activeCourseId = courseId;
    state.selectedSectionId = getSections(target)[0]?.id || 'all';
    state.flashcardFilter = 'ALL';
    state.activeScriptTab = null;
  }
  state.showAddCoursePicker = false;
  saveLocalState();
  autoBackupToGoogleDrive(false);
  if (openPath) state.view = 'syllabus';
  render();
}

function unenrollCourse(courseId) {
  state.enrolledCourseIds = state.enrolledCourseIds.filter((id) => id !== courseId);
  if (state.activeCourseId === courseId) {
    const remaining = getEnrolledCourses();
    state.activeCourseId = remaining[0]?.id || '';
    state.selectedSectionId = remaining[0] ? getSections(remaining[0])[0]?.id || 'all' : 'all';
  }
  saveLocalState();
  autoBackupToGoogleDrive(false);
  render();
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

const systemLightQuery =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: light)')
    : null;

function getEffectiveTheme() {
  if (state.theme === 'system') {
    return systemLightQuery && systemLightQuery.matches ? 'light' : 'dark';
  }
  return state.theme === 'light' ? 'light' : 'dark';
}

function applyTheme() {
  const effective = getEffectiveTheme();
  document.body.classList.toggle('theme-light', effective === 'light');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', effective === 'light' ? '#f5f3ff' : '#121024');
}

function setTheme(mode) {
  if (!['dark', 'light', 'system'].includes(mode)) return;
  state.theme = mode;
  localStorage.setItem(STORAGE_KEYS.THEME, state.theme);
  applyTheme();
  autoBackupToGoogleDrive(false);
  render();
}

function toggleTheme() {
  const order = ['dark', 'light', 'system'];
  const next = order[(order.indexOf(state.theme) + 1) % order.length];
  setTheme(next);
}

if (systemLightQuery && typeof systemLightQuery.addEventListener === 'function') {
  systemLightQuery.addEventListener('change', () => {
    if (state.theme === 'system') applyTheme();
  });
}

function getThemeIcon(mode = state.theme) {
  if (mode === 'light') return uiIcon('sun', 20);
  if (mode === 'system') return uiIcon('monitor', 20);
  return uiIcon('moon', 20);
}

function getDisplayName() {
  const custom = (state.profile?.displayName || '').trim();
  if (custom) return custom;
  const gUser = getGoogleSession()?.user;
  if (gUser?.name) return gUser.name;
  if (gUser?.email) return gUser.email.split('@')[0];
  return 'OpenLingo Learner';
}

function renderAvatarMarkup(sizeClass = 'sm') {
  const customPic = state.profile?.avatarDataUrl;
  const customEmoji = state.profile?.avatarEmoji;
  const googlePic = getGoogleSession()?.user?.picture;
  const name = getDisplayName();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'OL';

  if (customPic) {
    return `<div class="avatar-circle ${sizeClass}"><img src="${escapeHtml(customPic)}" alt="${escapeHtml(name)}" /></div>`;
  }
  if (customEmoji) {
    return `<div class="avatar-circle ${sizeClass}">${escapeHtml(customEmoji)}</div>`;
  }
  if (googlePic) {
    return `<div class="avatar-circle ${sizeClass}"><img src="${escapeHtml(googlePic)}" alt="${escapeHtml(name)}" referrerpolicy="no-referrer" /></div>`;
  }
  return `<div class="avatar-circle ${sizeClass}">${escapeHtml(initials)}</div>`;
}

function compressAvatarFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported or corrupted image file.'));
      img.onload = () => {
        const size = 160;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function getPlatformLabel() {
  if (window.AndroidBackup || window.AndroidGoogleAuth) return 'Android App';
  const ua = navigator.userAgent || '';
  if (/Linux/i.test(ua) && !/Android/i.test(ua) && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'Linux Desktop';
  }
  return 'Web PWA';
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
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') state.theme = savedTheme;
    const savedProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILE) || 'null');
    if (savedProfile && typeof savedProfile === 'object') {
      state.profile = { ...state.profile, ...savedProfile };
    }
    const savedPrefs = JSON.parse(localStorage.getItem(STORAGE_KEYS.PREFS) || 'null');
    if (savedPrefs && typeof savedPrefs === 'object') {
      if (typeof savedPrefs.showRomaji === 'boolean') state.showRomaji = savedPrefs.showRomaji;
      if (typeof savedPrefs.audioRate === 'number') state.audioRate = savedPrefs.audioRate;
      if (typeof savedPrefs.autoSync === 'boolean') state.autoSync = savedPrefs.autoSync;
    }
    const savedSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || 'null');
    if (savedSettings) {
      state.syncSettings = {
        githubRepo: savedSettings.githubRepo || APP_CONFIG.githubRepo,
        githubBranch: savedSettings.githubBranch || APP_CONFIG.githubBranch,
        googleClientId: APP_CONFIG.googleClientId || savedSettings.googleClientId || ''
      };
    }
    state.guestMode = localStorage.getItem(STORAGE_KEYS.GUEST) === 'true';
    const savedSyncMeta = JSON.parse(localStorage.getItem(STORAGE_KEYS.SYNC_META) || 'null');
    if (savedSyncMeta) state.syncMeta = savedSyncMeta;

    const rawEnrolled = localStorage.getItem(STORAGE_KEYS.ENROLLED);
    if (rawEnrolled !== null) {
      const parsed = JSON.parse(rawEnrolled);
      if (Array.isArray(parsed)) state.enrolledCourseIds = parsed;
    } else {
      // Legacy migration: returning users with completed lessons keep their active courses; new users start with 0 courses.
      const inferred = new Set();
      Object.keys(state.progress.completedLessons || {}).forEach((k) => {
        const cid = k.split(':')[0];
        if (cid) inferred.add(cid);
      });
      state.enrolledCourseIds = [...inferred];
    }
    if (state.enrolledCourseIds.length && !state.activeCourseId) {
      state.activeCourseId = state.enrolledCourseIds[0];
    }
  } catch {
    // Ignore storage errors
  }
  applyTheme();
}

function saveLocalState() {
  localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(state.progress));
  localStorage.setItem(STORAGE_KEYS.SRS, JSON.stringify(state.srs));
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(state.profile));
  localStorage.setItem(STORAGE_KEYS.ENROLLED, JSON.stringify(state.enrolledCourseIds));
  localStorage.setItem(
    STORAGE_KEYS.PREFS,
    JSON.stringify({
      showRomaji: state.showRomaji,
      audioRate: state.audioRate,
      autoSync: state.autoSync
    })
  );
  const custom = state.courses.filter((c) => c._custom);
  localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(custom));
  const ghSynced = state.courses.filter((c) => c._source === 'github');
  localStorage.setItem(STORAGE_KEYS.GITHUB_COURSES, JSON.stringify(ghSynced));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.syncSettings));
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

let currentAudioEl = null;
let cachedVoices = [];
let toastTimer = null;

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const refreshVoices = () => {
    cachedVoices = window.speechSynthesis.getVoices() || [];
  };
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

function showAudioToast(msg) {
  state.audioToast = msg;
  clearTimeout(toastTimer);
  const existing = document.getElementById('audio-toast');
  if (existing) {
    existing.textContent = msg;
    existing.style.display = 'block';
  } else {
    render();
  }
  toastTimer = setTimeout(() => {
    state.audioToast = '';
    const el = document.getElementById('audio-toast');
    if (el) el.style.display = 'none';
  }, 4000);
}

function cleanSpeechText(text) {
  return String(text || '')
    .replace(/[〜~]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function playOnlineTtsFallback(text, langCode) {
  if (currentAudioEl) {
    currentAudioEl.pause();
    currentAudioEl = null;
  }
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(langCode)}&q=${encodeURIComponent(text)}`;
  const audio = new Audio();
  audio.referrerPolicy = 'no-referrer';
  audio.playbackRate = state.audioRate || 0.9;
  audio.src = url;
  currentAudioEl = audio;
  audio.play().catch(() => {
    showAudioToast(`No offline "${langCode}" voice installed. Connect online or install a ${langCode.toUpperCase()} TTS voice in system settings.`);
  });
}

function speakText(text, locale) {
  const clean = cleanSpeechText(text);
  if (!clean) return;
  const fullLocale = locale || 'ja-JP';
  const langCode = fullLocale.split('-')[0].toLowerCase();

  // 1. Native Android TextToSpeech bridge (returns false if language pack isn't installed locally)
  if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
    try {
      const handled = window.AndroidTTS.speak(clean, fullLocale);
      if (handled !== false) return;
    } catch {
      // Fall through to online fallback
    }
  }

  // 2. Browser Web Speech API (only if a matching language voice is actually available!)
  if ('speechSynthesis' in window) {
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length) cachedVoices = voices;
    const match =
      cachedVoices.find((v) => v.lang && v.lang.toLowerCase() === fullLocale.toLowerCase()) ||
      cachedVoices.find((v) => v.lang && v.lang.toLowerCase().startsWith(langCode));

    if (match) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(clean);
      utter.voice = match;
      utter.lang = match.lang;
      utter.rate = state.audioRate || 0.9;
      window.speechSynthesis.speak(utter);
      return;
    }
  }

  // 3. Lightweight online TTS fallback (works on Linux Chromium & devices without local voice packs)
  playOnlineTtsFallback(clean, langCode);
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
  autoBackupToGoogleDrive(false);

  state.flashcardSession.flipped = false;
  if (rating === RATINGS.AGAIN) queue.push(item);
  state.flashcardSession.index += 1;
  render();
}

/* ---------- Progress Backup & Restore (Offline File + Copy/Paste Code) ---------- */
function buildBackupPayload() {
  return {
    app: 'OpenLingo',
    schemaVersion: 2,
    appVersion: APP_CONFIG.appVersion,
    exportedAt: new Date().toISOString(),
    enrolledCourseIds: state.enrolledCourseIds,
    activeCourseId: state.activeCourseId,
    theme: state.theme,
    showRomaji: state.showRomaji,
    audioRate: state.audioRate,
    autoSync: state.autoSync,
    profile: state.profile,
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

function restoreBackupPayload(rawText, sourceLabel = 'Local Backup', remoteTime = null) {
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

  if (data.theme === 'light' || data.theme === 'dark' || data.theme === 'system') {
    state.theme = data.theme;
    localStorage.setItem(STORAGE_KEYS.THEME, state.theme);
    applyTheme();
  }
  if (data.profile && typeof data.profile === 'object') {
    state.profile = { ...state.profile, ...data.profile };
  }
  if (typeof data.showRomaji === 'boolean') state.showRomaji = data.showRomaji;
  if (typeof data.audioRate === 'number') state.audioRate = data.audioRate;
  if (typeof data.autoSync === 'boolean') state.autoSync = data.autoSync;
  if (Array.isArray(data.enrolledCourseIds)) {
    state.enrolledCourseIds = data.enrolledCourseIds.filter((id) => state.courses.some((c) => c.id === id));
  } else {
    const inferred = new Set();
    Object.keys(state.progress.completedLessons || {}).forEach((k) => {
      const cid = k.split(':')[0];
      if (cid && state.courses.some((c) => c.id === cid)) inferred.add(cid);
    });
    if (data.activeCourseId && state.courses.some((c) => c.id === data.activeCourseId)) {
      inferred.add(data.activeCourseId);
    }
    if (inferred.size > 0) state.enrolledCourseIds = [...inferred];
  }
  if (data.activeCourseId && state.enrolledCourseIds.includes(data.activeCourseId)) {
    state.activeCourseId = data.activeCourseId;
  } else {
    state.activeCourseId = state.enrolledCourseIds[0] || '';
  }

  saveLocalState();
  recordSyncTimestamp(sourceLabel, remoteTime || data.exportedAt || new Date().toISOString());
  const doneCount = Object.keys(state.progress.completedLessons || {}).length;
  const srsCount = Object.keys(state.srs || {}).length;
  state.backupMessage = `Restored backup (${sourceLabel}): ${doneCount} completed lessons, ${state.progress.xp} XP, ${srsCount} flashcard records.`;
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

function recordSyncTimestamp(source = 'Google Drive', isoTime = null) {
  state.syncMeta = {
    lastSyncedAt: isoTime || new Date().toISOString(),
    source
  };
  try {
    localStorage.setItem(STORAGE_KEYS.SYNC_META, JSON.stringify(state.syncMeta));
  } catch {
    // Ignore storage errors
  }
}

function formatLastSynced(shortMode = false) {
  const iso = state.syncMeta?.lastSyncedAt;
  if (!iso) return 'Not synced yet';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return 'Not synced yet';
  const diffSec = Math.max(0, Math.round((Date.now() - dt.getTime()) / 1000));
  let when = '';
  if (diffSec < 60) when = 'Just now';
  else if (diffSec < 3600) when = `${Math.floor(diffSec / 60)}m ago`;
  else if (diffSec < 86400) when = `${Math.floor(diffSec / 3600)}h ago`;
  else when = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const clock = dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const src = state.syncMeta?.source ? ` · ${state.syncMeta.source}` : '';
  return shortMode ? `${when} (${clock})` : `${when} · ${clock}${src}`;
}

let autoBackupTimer = null;

function autoBackupToGoogleDrive(immediate = false) {
  if (!state.autoSync || !getGoogleSession()) return;
  clearTimeout(autoBackupTimer);
  const run = () => {
    backupToGoogleDrive(buildBackupPayload())
      .then((res) => {
        recordSyncTimestamp('Google Drive', res?.savedAt);
        showAudioToast(`☁️ Synced to Google Drive (${formatLastSynced(true)})`);
        const syncEl = document.getElementById('sync-status-label');
        if (syncEl) syncEl.textContent = `☁️ Last synced: ${formatLastSynced(true)}`;
        const mobSyncEl = document.getElementById('mobile-sync-strip');
        if (mobSyncEl) mobSyncEl.textContent = `☁️ Last synced: ${formatLastSynced(false)}`;
      })
      .catch(() => {
        // Silent fallback if temporarily offline; local progress is safe
      });
  };
  if (immediate) run();
  else autoBackupTimer = setTimeout(run, 1500);
}

async function syncFromCloudBeforeUi() {
  if (!getGoogleSession()) return;
  state.syncingCloud = true;
  render();
  try {
    const { text, modifiedTime } = await restoreFromGoogleDrive();
    restoreBackupPayload(text, 'Google Drive', modifiedTime);
  } catch {
    // No remote backup yet or offline — continue smoothly with local data
  } finally {
    state.syncingCloud = false;
    render();
  }
}

async function handleGoogleSignInAndSync() {
  state.googleBusy = true;
  state.authError = '';
  state.backupMessage = 'Opening Google Sign-In...';
  render();
  try {
    const session = await signInWithGoogle(
      state.syncSettings.googleClientId,
      APP_CONFIG.googleAndroidClientId
    );
    state.guestMode = false;
    localStorage.removeItem(STORAGE_KEYS.GUEST);

    // Sync FIRST from Google Drive before showing the main UI!
    state.syncingCloud = true;
    render();
    try {
      const { text, modifiedTime } = await restoreFromGoogleDrive();
      restoreBackupPayload(text, 'Google Drive', modifiedTime);
      showAudioToast(`Welcome back, ${session.user?.name || 'Learner'}! Synced from Google Drive.`);
    } catch {
      if (state.progress.xp > 0 || Object.keys(state.progress.completedLessons || {}).length > 0) {
        const res = await backupToGoogleDrive(buildBackupPayload()).catch(() => null);
        if (res) recordSyncTimestamp('Google Drive', res.savedAt);
      }
      state.backupMessage = `Signed in as ${session.user?.email || session.user?.name || 'Google user'}. Auto-sync to Google Drive is active!`;
      showAudioToast(`Welcome, ${session.user?.name || 'Learner'}! Auto-sync active.`);
    }
  } catch (err) {
    state.authError = err.message || 'Sign in failed.';
    state.backupMessage = `Google Sign-In: ${err.message}`;
  } finally {
    state.googleBusy = false;
    state.syncingCloud = false;
    render();
  }
}

function renderAuthGate() {
  const googleLogoSvg = `<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

  return `
    <div class="auth-screen">
      <div class="auth-card">
        <img src="./assets/icons/openlingo-icon.svg" alt="OpenLingo" style="width:76px;height:76px;border-radius:20px;margin:0 auto 14px;display:block;box-shadow:0 6px 0 var(--accent-lip);" />
        <h1 style="margin:0;font-size:32px;font-weight:700;">OpenLingo</h1>
        <p style="margin:8px 0 0;font-size:15px;color:var(--text-muted);">
          Free &amp; open-source language learning. Sign in with Google to sync your progress privately across desktop, web, and Android via your own Google Drive.
        </p>

        <div class="auth-pills">
          <span class="pill accent">JA · Japanese N5–N1</span>
          <span class="pill accent">ES · Spanish A1–C1</span>
          <span class="pill accent">ML · Malayalam S1–S5</span>
        </div>

        ${state.authError ? `<div class="draw-feedback retry" style="max-width:none;margin-bottom:14px;">${escapeHtml(state.authError)}</div>` : ''}

        <button class="google-btn" id="gate-google-signin-btn" ${state.googleBusy ? 'disabled' : ''}>
          ${googleLogoSvg}
          <span>${state.googleBusy ? 'Signing in & syncing...' : 'Continue with Google'}</span>
        </button>

        <button class="auth-skip-btn" id="gate-continue-offline-btn">
          Continue offline without signing in →
        </button>

        <div style="margin-top:18px;font-size:11px;color:var(--text-muted);">
          Zero servers · Your progress stays privately in your own Google Drive AppData &amp; device.
        </div>
      </div>
    </div>
  `;
}

function renderCourseOnboarding() {
  const googleSession = getGoogleSession();
  const greetingName = getDisplayName();
  return `
    <div class="auth-screen">
      <div class="onboarding-card">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <img src="./assets/icons/openlingo-icon.svg" alt="OpenLingo" style="width:46px;height:46px;border-radius:12px;display:block;box-shadow:0 6px 16px rgba(16,185,129,0.25);" />
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.05em;">Welcome, ${escapeHtml(greetingName)}</div>
            <h1 style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.01em;">Pick a course to start</h1>
          </div>
        </div>
        <p style="margin:6px 0 0;font-size:13px;color:var(--text-muted);">
          Choose your first language below. You can add or switch extra courses anytime from your <strong>Profile</strong> screen.
        </p>

        <div class="onboarding-course-grid">
          ${state.courses
            .map((c) => {
              const unitsCount = getAllUnits(c).length;
              const itemsCount = getAllItems(c).length;
              const sections = getSections(c);
              const firstLvl = sections[0]?.jlptLevel || '';
              const lastLvl = sections[sections.length - 1]?.jlptLevel || '';
              const lvlRange = firstLvl && lastLvl && firstLvl !== lastLvl ? `${firstLvl} → ${lastLvl}` : firstLvl || 'Full Course';
              return `
                <button type="button" class="onboarding-course-btn" data-onboarding-pick="${escapeHtml(c.id)}">
                  <div style="display:flex;align-items:center;gap:14px;min-width:0;">
                    <span class="lang-badge">${escapeHtml(getCourseFlag(c))}</span>
                    <div style="min-width:0;">
                      <div style="font-size:17px;font-weight:700;font-family:var(--font-display);">
                        ${escapeHtml(c.sourceLang.name)} → ${escapeHtml(c.targetLang.name)}
                        ${c.targetLang.nativeName ? `<span style="color:var(--accent-text);margin-left:4px;">(${escapeHtml(c.targetLang.nativeName)})</span>` : ''}
                      </div>
                      <div style="font-size:13px;color:var(--text-muted);margin-top:3px;">
                        ${escapeHtml(lvlRange)} · ${unitsCount} units · ${itemsCount} items
                      </div>
                    </div>
                  </div>
                  <span class="pill accent">Start ${uiIcon('arrowRight', 15)}</span>
                </button>
              `;
            })
            .join('')}
        </div>

        <div style="margin-top:18px;padding-top:14px;border-top:2px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;font-size:13px;color:var(--text-muted);">
          <span style="display:inline-flex;align-items:center;gap:6px;">${googleSession ? `${uiIcon('cloud', 16)} Signed in as ${escapeHtml(googleSession.user?.email || googleSession.user?.name || 'Google')}` : 'Offline Guest Mode'}</span>
          ${
            googleSession
              ? `<button type="button" class="btn btn-sm" id="onboarding-logout-btn">${uiIcon('logout', 16)} Log Out</button>`
              : `<button type="button" class="btn btn-sm" id="onboarding-signin-btn">${uiIcon('shield', 16)} Sign in with Google</button>`
          }
        </div>
      </div>
    </div>
  `;
}

/* ---------- Render Chrome ---------- */
function renderSidebar(course) {
  const ordered = getOrderedLessons(course);
  const doneCount = ordered.filter((e) => state.progress.completedLessons[e.key]).length;
  const dueCount = getDueCount(course);
  const googleSession = getGoogleSession();

  return `
    <aside class="sidebar">
      <div class="brand-row">
        <div class="brand">
          <img src="./assets/icons/openlingo-icon.svg" alt="OpenLingo" style="width:38px;height:38px;border-radius:10px;display:block;" />
          <div>
            <div class="brand-name">OpenLingo</div>
            <div class="brand-tag">v${escapeHtml(APP_CONFIG.appVersion)} · FOSS</div>
          </div>
        </div>
        <button class="icon-btn" data-toggle-theme title="Cycle theme (${escapeHtml(state.theme)})">${getThemeIcon()}</button>
      </div>

      <select id="course-select" class="course-picker" aria-label="Select active course">
        ${getEnrolledCourses()
          .map(
            (c) => `<option value="${escapeHtml(c.id)}" ${c.id === course.id ? 'selected' : ''}>[${escapeHtml(getCourseFlag(c))}] ${escapeHtml(c.sourceLang.name)} → ${escapeHtml(c.targetLang.name)}</option>`
          )
          .join('')}
        <option value="__add__">+ Add course (Profile)...</option>
      </select>

      <nav class="nav-list">
        <button class="nav-btn ${['syllabus', 'lesson', 'placement', 'guidebook'].includes(state.view) ? 'active' : ''}" data-nav="syllabus">
          ${uiIcon('map', 22)} <span>Learning Path</span>
        </button>
        <button class="nav-btn ${state.view === 'characters' ? 'active' : ''}" data-nav="characters">
          ${uiIcon('type', 22)} <span>Characters</span>
        </button>
        <button class="nav-btn ${state.view === 'flashcards' ? 'active' : ''}" data-nav="flashcards">
          ${uiIcon('layers', 22)} <span>Flashcards (${dueCount})</span>
        </button>
        <button class="nav-btn ${state.view === 'studio' ? 'active' : ''}" data-nav="studio">
          ${uiIcon('wrench', 22)} <span>Course Studio</span>
        </button>
        <button class="nav-btn ${state.view === 'profile' ? 'active' : ''}" data-nav="profile">
          ${uiIcon('user', 22)} <span>Profile</span>
        </button>
        <button class="nav-btn ${state.view === 'settings' || state.view === 'backup' ? 'active' : ''}" data-nav="settings">
          ${uiIcon('settings', 22)} <span>Settings</span>
        </button>
      </nav>

      <div class="sidebar-stats">
        <button class="sidebar-profile-btn" data-nav="profile" title="Open Profile">
          ${renderAvatarMarkup('sm')}
          <div style="min-width:0;flex:1;">
            <div style="font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(getDisplayName())}</div>
            <div style="font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${googleSession ? escapeHtml(googleSession.user?.email || 'Google Sync') : 'Offline Guest Mode'}
            </div>
          </div>
        </button>
        ${
          !googleSession
            ? `<button class="btn btn-primary btn-sm" id="sidebar-signin-btn" style="width:100%;">${uiIcon('shield', 16)} Sign in with Google</button>`
            : ''
        }
        <div id="sync-status-label" style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;justify-content:center;gap:5px;">${uiIcon('cloud', 14)} Last synced: ${escapeHtml(formatLastSynced(true))}</div>
        <div class="stat-row"><span>Streak</span><strong style="color:#f97316;">${uiIcon('flame', 16)} ${state.progress.streak}d</strong></div>
        <div class="stat-row"><span>Total XP</span><strong style="color:#eab308;">${uiIcon('zap', 16)} ${state.progress.xp} XP</strong></div>
        <div class="stat-row"><span>Lessons Done</span><strong>${doneCount}/${ordered.length}</strong></div>
        <div class="stat-row"><span>Cards Due</span><strong>${dueCount}</strong></div>
      </div>
    </aside>
  `;
}

function renderMobileTopbar(course) {
  return `
    <header class="mobile-topbar">
      <div style="display:flex;align-items:center;gap:6px;">
        <img src="./assets/icons/openlingo-icon.svg" alt="OpenLingo" style="width:28px;height:28px;border-radius:8px;display:block;" />
        <select id="mobile-course-select" class="course-picker" style="width:auto;padding:5px 8px;font-size:13px;font-weight:700;" aria-label="Select active course">
          ${getEnrolledCourses()
            .map(
              (c) => `<option value="${escapeHtml(c.id)}" ${c.id === course.id ? 'selected' : ''}>${escapeHtml(getCourseFlag(c))}</option>`
            )
            .join('')}
          <option value="__add__">+ Add...</option>
        </select>
      </div>
      <div class="mobile-hud-inline">
        <span style="color:#f97316;">${uiIcon('flame', 16)} ${state.progress.streak}</span>
        <span style="color:#eab308;">${uiIcon('zap', 16)} ${state.progress.xp}</span>
        <span style="color:#f43f5e;">${uiIcon('heart', 16)} ${state.progress.chillMode ? '∞' : state.progress.hearts}</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <button class="mobile-avatar-btn" data-nav="profile" title="Profile" aria-label="Profile">
          ${renderAvatarMarkup('xs')}
        </button>
        <button class="icon-btn" data-nav="settings" title="Settings" aria-label="Settings">${uiIcon('settings', 19)}</button>
      </div>
    </header>
    <button id="mobile-sync-strip" class="mobile-sync-strip" data-nav="settings">
      ${uiIcon('cloud', 14)} Last synced: ${escapeHtml(formatLastSynced(false))}
    </button>
  `;
}

function renderMobileNav(course) {
  const dueCount = getDueCount(course);
  return `
    <nav class="mobile-nav">
      <button class="nav-btn ${['syllabus', 'lesson', 'placement', 'guidebook'].includes(state.view) ? 'active' : ''}" data-nav="syllabus">
        ${uiIcon('map', 22)}<span>Path</span>
      </button>
      <button class="nav-btn ${state.view === 'characters' ? 'active' : ''}" data-nav="characters">
        ${uiIcon('type', 22)}<span>Script</span>
      </button>
      <button class="nav-btn ${state.view === 'flashcards' ? 'active' : ''}" data-nav="flashcards">
        ${uiIcon('layers', 22)}<span>Cards (${dueCount})</span>
      </button>
      <button class="nav-btn ${state.view === 'studio' ? 'active' : ''}" data-nav="studio">
        ${uiIcon('wrench', 22)}<span>Studio</span>
      </button>
      <button class="nav-btn ${state.view === 'profile' ? 'active' : ''}" data-nav="profile">
        ${uiIcon('user', 22)}<span>Profile</span>
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
        <span class="hud-chip" style="color:#f97316;">${uiIcon('flame', 18)} ${state.progress.streak}d</span>
        <span class="hud-chip" style="color:#eab308;">${uiIcon('zap', 18)} ${state.progress.xp} XP</span>
        <span class="hud-chip" style="color:#f43f5e;">${uiIcon('heart', 18)} ${state.progress.chillMode ? '∞' : `${state.progress.hearts}/5`}</span>
      </div>
      <div class="hud-progress-wrap">
        <div class="hud-progress-track"><div class="hud-progress-fill" style="width:${pct}%"></div></div>
        <span style="font-size:13px;font-weight:700;color:var(--text-muted);white-space:nowrap;">${doneCount}/${ordered.length} (${pct}%)</span>
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
    <div class="syllabus-top-bar">
      ${
        sections.length > 1
          ? `
            <select id="section-select" class="level-select" aria-label="Select level">
              ${sections
                .map((sec) => {
                  const secLessons = sec.units.flatMap((u) => u.lessons);
                  const secDone = secLessons.filter((l) => state.progress.completedLessons[`${course.id}:${l.id}`]).length;
                  return `<option value="${escapeHtml(sec.id)}" ${state.selectedSectionId === sec.id ? 'selected' : ''}>${escapeHtml(sec.jlptLevel)} · ${escapeHtml(sec.tier)} (${secDone}/${secLessons.length})</option>`;
                })
                .join('')}
              <option value="all" ${state.selectedSectionId === 'all' ? 'selected' : ''}>All Levels (${escapeHtml(sections[0].jlptLevel)} → ${escapeHtml(sections[sections.length - 1].jlptLevel)})</option>
            </select>
          `
          : ''
      }
      <div class="hud-metrics" style="margin-left:auto;">
        <span class="hud-chip" style="color:#f97316;">${uiIcon('flame', 17)} ${state.progress.streak}d</span>
        <span class="hud-chip" style="color:#eab308;">${uiIcon('zap', 17)} ${state.progress.xp} XP</span>
        <span class="hud-chip" style="color:#f43f5e;">${uiIcon('heart', 17)} ${state.progress.chillMode ? '∞' : `${state.progress.hearts}/5`}</span>
      </div>
    </div>

    ${visibleSections
      .map((sec) => {
        return sec.units
          .map((unit, uIdx) => {
            const unlocked = isUnitUnlocked(course, unit, statusByKey);
            const completed = isUnitCompleted(course, unit);
            const unitColor = getUnitSolidColor(unit.color || sec.color);
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
                  <button class="banner-btn" data-guidebook="${escapeHtml(unit.id)}">${uiIcon('book', 18)} Guidebook</button>
                  ${
                    !unlocked
                      ? `<button class="banner-btn" data-jump-quiz="${escapeHtml(unit.id)}">${uiIcon('target', 18)} Jump Here</button>`
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
                    const icon =
                      status === 'completed'
                        ? uiIcon('check', 34)
                        : status === 'locked'
                          ? uiIcon('lock', 30)
                          : uiIcon('play', 34);
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
                  <div class="trophy-node ${completed ? 'earned' : ''}" title="Complete all lessons in this unit to earn the trophy">${uiIcon('trophy', 36)}</div>
                  <div class="node-label">
                    <div class="node-meta">${completed ? 'Unit Mastered!' : 'Unit Trophy'}</div>
                  </div>
                </div>
              </div>
            </section>
          `;
          })
          .join('');
      })
      .join('')}
  `;
}

function openDrawSession(scriptSet, tabId, startGlyph = null) {
  const tab = scriptSet.tabs.find((t) => t.id === tabId) || scriptSet.tabs[0];
  const chars = tab.rows.flatMap((r) => r.chars);
  const idx = startGlyph ? Math.max(0, chars.findIndex((c) => c.glyph === startGlyph)) : 0;
  const target = chars[idx];
  const mastery = state.progress.charMastery[target.glyph] || 0;
  const guideMode = mastery >= 2 ? 'off' : mastery === 1 ? 'faint' : 'full';

  state.scriptDrill = null;
  state.drawSession = {
    mode: 'trace', // 'trace' | 'write-test' | 'word-write'
    tabId: tab.id,
    tabLabel: tab.label,
    speechLocale: scriptSet.speechLocale,
    items: chars.map((c) => ({ glyph: c.glyph, romaji: c.romaji, translation: '' })),
    index: idx,
    guideMode,
    strokes: [],
    result: null,
    passedCount: 0,
    completed: false
  };
  speakText(target.glyph, scriptSet.speechLocale);
  render();
}

function openRandomWriteTest(scriptSet, tabId) {
  const tab = scriptSet.tabs.find((t) => t.id === tabId) || scriptSet.tabs[0];
  const chars = tab.rows.flatMap((r) => r.chars);
  const sample = shuffle(chars).slice(0, Math.min(5, chars.length));

  state.scriptDrill = null;
  state.drawSession = {
    mode: 'write-test',
    tabId: tab.id,
    tabLabel: `${tab.label} — Random Write Test`,
    speechLocale: scriptSet.speechLocale,
    items: sample.map((c) => ({ glyph: c.glyph, romaji: c.romaji, translation: '' })),
    index: 0,
    guideMode: 'off', // Memory test! User can tap Peek if needed
    strokes: [],
    result: null,
    passedCount: 0,
    completed: false
  };
  speakText(sample[0].glyph, scriptSet.speechLocale);
  render();
}

function openWordWriteSession(course) {
  const allItems = getAllItems(course);
  // Pick a balanced mix of short words and full example sentences from the active course
  const words = shuffle(allItems.filter((it) => it.term.length <= 14)).slice(0, 4);
  const sentences = shuffle(allItems.filter((it) => it.example && it.example.term && it.example.term.length <= 24)).slice(0, 2);

  const combined = [
    ...words.map((it) => ({
      glyph: it.term,
      romaji: it.transliteration || '',
      translation: it.translation,
      kind: 'Word'
    })),
    ...sentences.map((it) => ({
      glyph: it.example.term,
      romaji: it.example.transliteration || '',
      translation: it.example.translation,
      kind: 'Sentence'
    }))
  ];

  if (!combined.length) return;
  state.scriptDrill = null;
  state.drawSession = {
    mode: 'word-write',
    tabId: 'words',
    tabLabel: `${course.targetLang.name} Word & Sentence Pad`,
    speechLocale: course.targetLang.speechLocale,
    items: combined,
    index: 0,
    guideMode: 'full',
    strokes: [],
    result: null,
    passedCount: 0,
    completed: false
  };
  speakText(combined[0].glyph, course.targetLang.speechLocale);
  render();
}

function renderCharactersView(course) {
  const scriptSet = getScriptSetForCourse(course);
  if (!state.activeScriptTab || !scriptSet.tabs.some((t) => t.id === state.activeScriptTab)) {
    state.activeScriptTab = scriptSet.tabs[0].id;
  }
  const activeTab = scriptSet.tabs.find((t) => t.id === state.activeScriptTab) || scriptSet.tabs[0];

  /* Duolingo-Style Character, Random Test & Word/Sentence Drawing Board */
  if (state.drawSession) {
    const ds = state.drawSession;
    const isWordMode = ds.mode === 'word-write';
    const isTestMode = ds.mode === 'write-test';

    if (ds.completed) {
      const pct = Math.round((ds.passedCount / ds.items.length) * 100);
      return `
        ${renderHudBar(course)}
        <section class="card" style="text-align:center;padding:38px 24px;">
          <div style="font-size:48px;margin-bottom:8px;">✍️</div>
          <h1 class="page-title">${isTestMode ? 'Writing Test Complete!' : 'Word & Sentence Practice Done!'}</h1>
          <p class="page-sub">${escapeHtml(ds.tabLabel)} · ${ds.passedCount}/${ds.items.length} passed (${pct}%) · +30 XP</p>
          <div style="display:flex;justify-content:center;gap:10px;margin-top:20px;flex-wrap:wrap;">
            <button class="btn btn-primary" id="close-draw-btn">Back to Characters</button>
            <button class="btn" id="restart-draw-mode-btn">Practice New Set</button>
          </div>
        </section>
      `;
    }

    const ch = ds.items[ds.index];
    const mastery = Math.min(3, state.progress.charMastery[ch.glyph] || 0);
    const guideLabels = { full: 'Guide: Trace', faint: 'Guide: Faint', off: 'Guide: Memory' };

    return `
      ${renderHudBar(course)}
      <div class="header-bar" style="margin-bottom:14px;">
        <div>
          <span class="pill accent">${escapeHtml(ds.tabLabel)} · ${ds.index + 1}/${ds.items.length}</span>
          <h1 class="page-title" style="margin-top:6px;">
            ${
              isTestMode
                ? `Write the character for "${escapeHtml(ch.romaji)}"`
                : isWordMode
                  ? `Write this ${escapeHtml(ch.kind || 'Word')}`
                  : `Draw "${escapeHtml(ch.glyph)}" (${escapeHtml(ch.romaji)})`
            }
          </h1>
          <p class="page-sub">
            ${
              isTestMode
                ? 'Memory test — listen and draw from memory (tap Guide to peek if stuck).'
                : isWordMode
                  ? `${escapeHtml(ch.translation)}${ch.romaji ? ` · ${escapeHtml(ch.romaji)}` : ''}`
                  : 'Complete 3 accurate passes (Trace → Faint → Memory) to master this character.'
            }
          </p>
        </div>
        <button class="btn btn-sm" id="close-draw-btn">← Chart</button>
      </div>

      <section class="card draw-studio">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;max-width:${isWordMode ? '540px' : '360px'};gap:10px;">
          <div style="display:flex;align-items:center;gap:12px;">
            ${
              isTestMode && !(ds.result && ds.result.passed) && ds.guideMode === 'off'
                ? `<div style="font-size:28px;font-weight:800;color:var(--accent);">"${escapeHtml(ch.romaji)}"</div>`
                : `<div style="font-size:${isWordMode ? '22px' : '38px'};font-weight:800;line-height:1.15;">${escapeHtml(ch.glyph)}</div>`
            }
            <div>
              ${!isTestMode ? `<div style="font-size:14px;font-weight:800;color:var(--accent);">${escapeHtml(isWordMode ? ch.translation : ch.romaji)}</div>` : ''}
              ${
                !isWordMode && !isTestMode
                  ? `<div style="display:flex;align-items:center;gap:8px;margin-top:3px;">
                      <div class="mastery-dots">
                        <span class="mastery-dot ${mastery >= 1 ? 'filled' : ''}"></span>
                        <span class="mastery-dot ${mastery >= 2 ? 'filled' : ''}"></span>
                        <span class="mastery-dot ${mastery >= 3 ? 'filled' : ''}"></span>
                      </div>
                      <span style="font-size:12px;color:var(--text-muted);">${mastery >= 3 ? 'Mastered!' : `${mastery}/3 passes`}</span>
                    </div>`
                  : ''
              }
            </div>
          </div>
          <button class="btn btn-sm" data-speak="${escapeHtml(ch.glyph)}" data-speak-locale="${escapeHtml(ds.speechLocale)}">🔊 Hear</button>
        </div>

        <div class="draw-canvas-wrap ${isWordMode ? 'wide' : ''}">
          <canvas id="char-draw-canvas"></canvas>
        </div>

        ${
          ds.result
            ? `<div class="draw-feedback ${ds.result.passed ? 'pass' : 'retry'}">${escapeHtml(ds.result.feedback)}</div>`
            : `<div style="font-size:12px;color:var(--text-muted);">${isWordMode ? 'Write across the ruled lines with your finger or mouse' : 'Draw inside the square with your finger or mouse'}</div>`
        }

        <div class="draw-toolbar">
          <button class="btn btn-sm" id="draw-undo-btn">↩ Undo</button>
          <button class="btn btn-sm" id="draw-clear-btn">🧹 Clear</button>
          <button class="btn btn-sm" id="draw-guide-btn">👁 ${escapeHtml(guideLabels[ds.guideMode])}</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 2fr 1fr;gap:8px;width:100%;max-width:${isWordMode ? '540px' : '360px'};">
          <button class="btn btn-sm" id="draw-prev-btn" ${ds.index <= 0 ? 'disabled' : ''}>← Prev</button>
          ${
            ds.result && ds.result.passed && !isTestMode && !isWordMode && mastery < 3
              ? `<button class="btn btn-primary" id="draw-repeat-btn">✍️ Repeat (Pass ${mastery + 1}/3)</button>`
              : ds.result && ds.result.passed
                ? `<button class="btn btn-primary" id="draw-next-btn">${ds.index >= ds.items.length - 1 ? 'Finish ✓' : 'Next →'}</button>`
                : `<button class="btn btn-primary" id="draw-check-btn">✓ Check Writing</button>`
          }
          <button class="btn btn-sm" id="draw-next-btn-side" ${!isTestMode && !isWordMode && ds.index >= ds.items.length - 1 ? 'disabled' : ''}>${ds.index >= ds.items.length - 1 ? 'Done' : 'Next →'}</button>
        </div>
      </section>
    `;
  }

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
        <p class="page-sub">Tap any character to draw &amp; master it in 3 passes, take a random Write Test, or write full words &amp; sentences.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" id="start-draw-mode-btn">✏️ Trace ${escapeHtml(activeTab.label.split(' ')[0])}</button>
        <button class="btn btn-sm" id="start-write-test-btn">🎲 Write Test (5)</button>
        <button class="btn btn-sm" id="start-word-write-btn">📝 Words &amp; Sentences</button>
        <button class="btn btn-sm" id="start-script-drill-btn">🎯 Quiz</button>
      </div>
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
  const repoUrl = `https://github.com/${state.syncSettings.githubRepo}/tree/${state.syncSettings.githubBranch}/courses`;
  const catalogList = state.catalogEntries.length
    ? state.catalogEntries
    : state.courses.map((c) => ({
        id: c.id,
        path: `courses/${c.id}/course.json`,
        title: c.title,
        targetLang: c.targetLang?.name || c.id,
        nativeName: c.targetLang?.nativeName || '',
        standard: c.standardName || '',
        version: c.version || '1.0.0',
        items: getAllItems(c).length
      }));

  return `
    ${renderHudBar(course)}
    <div class="header-bar">
      <div>
        <h1 class="page-title">Course Catalog &amp; Studio</h1>
        <p class="page-sub">Sync community courses live from GitHub, create local courses, or export open JSON for PRs.</p>
      </div>
      <button class="btn btn-sm" id="export-course-btn">⬇ Export Current JSON</button>
    </div>

    ${state.studioMessage ? `<div class="grammar-box">${escapeHtml(state.studioMessage)}</div>` : ''}

    <section class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
        <div>
          <h3 style="margin:0;">🌐 GitHub Community Course Catalog</h3>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
            Reads <code>courses/registry.json</code> directly from your GitHub repo so community PRs appear live.
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" id="sync-github-catalog-btn" ${state.catalogLoading ? 'disabled' : ''}>
            ${state.catalogLoading ? '⏳ Syncing...' : '🔄 Sync from GitHub'}
          </button>
          <a class="btn btn-sm" href="${escapeHtml(repoUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">Contribute on GitHub ↗</a>
        </div>
      </div>

      <form id="github-repo-form" class="form-grid" style="margin-bottom:12px;">
        <div>
          <label class="field-label">GitHub Repository (owner/repo)</label>
          <input class="input" name="githubRepo" value="${escapeHtml(state.syncSettings.githubRepo)}" placeholder="mahesh-labs/openlingo" required />
        </div>
        <div>
          <label class="field-label">Branch</label>
          <input class="input" name="githubBranch" value="${escapeHtml(state.syncSettings.githubBranch)}" placeholder="main" required />
        </div>
        <div style="display:flex;align-items:flex-end;">
          <button class="btn btn-sm" type="submit">Save Repo Source</button>
        </div>
      </form>

      ${state.catalogStatus ? `<div style="font-size:12px;color:var(--blue);margin-bottom:10px;font-weight:600;">${escapeHtml(state.catalogStatus)}</div>` : ''}

      <div style="display:grid;gap:10px;">
        ${catalogList
          .map((entry) => {
            const installed = state.courses.find((c) => c.id === entry.id);
            const hasUpdate = installed && entry.version && installed.version && installed.version !== entry.version;
            const badge = !installed
              ? 'Available on GitHub'
              : hasUpdate
                ? `Update: v${entry.version}`
                : installed._source === 'github'
                  ? `Synced v${installed.version || entry.version}`
                  : `Installed v${installed.version || entry.version}`;
            return `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:12px;border-radius:12px;background:var(--surface-elevated);border:1px solid var(--border);">
              <div>
                <div style="font-weight:700;font-size:14px;">${escapeHtml(entry.title || entry.id)} ${entry.nativeName ? `<span style="color:var(--accent);font-weight:600;">(${escapeHtml(entry.nativeName)})</span>` : ''}</div>
                <div style="font-size:12px;color:var(--text-muted);">
                  <code>${escapeHtml(entry.path)}</code>${entry.items ? ` · ${entry.items} items` : ''} · ${escapeHtml(badge)}
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${installed ? `<button class="btn btn-sm" data-switch-course="${escapeHtml(entry.id)}">Open</button>` : ''}
                <button class="btn btn-primary btn-sm" data-install-github="${escapeHtml(entry.id)}" ${state.catalogLoading ? 'disabled' : ''}>
                  ${installed ? (hasUpdate ? '⬆ Update' : '⬇ Pull Latest') : '⬇ Install'}
                </button>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    </section>

    <section class="card">
      <h3 style="margin-top:0;">Add a New Language Course (Local Draft)</h3>
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

function renderProfileView(course) {
  const googleSession = getGoogleSession();
  const displayName = getDisplayName();
  const completedLessonsCount = Object.keys(state.progress.completedLessons || {}).length;
  const enrolledCourses = getEnrolledCourses();
  const availableCourses = getAvailableCoursesToAdd();
  const totalLessonsAll = enrolledCourses.reduce((sum, c) => sum + getOrderedLessons(c).length, 0);
  const srsCount = Object.keys(state.srs || {}).length;
  const masteredChars = Object.values(state.progress.charMastery || {}).filter((v) => v >= 3).length;
  const goalXp = Number(state.profile.dailyGoalXp) || 50;

  return `
    ${renderHudBar(course)}
    <div class="header-bar">
      <div>
        <h1 class="page-title">Your Profile</h1>
        <p class="page-sub">Customize your learner profile, avatar, daily goals, and view progress across all languages.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-sm" data-nav="settings">${uiIcon('settings', 17)} Settings</button>
      </div>
    </div>

    ${state.profileMessage ? `<div class="grammar-box">${escapeHtml(state.profileMessage)}</div>` : ''}

    <section class="card">
      <div class="profile-hero">
        <div class="avatar-upload-wrap">
          ${renderAvatarMarkup('lg')}
          <button type="button" class="avatar-cam-btn" id="profile-avatar-upload-btn" title="Upload custom profile picture" aria-label="Upload custom profile picture">${uiIcon('camera', 17)}</button>
          <input type="file" id="profile-avatar-input" accept="image/*" style="display:none;" />
        </div>
        <div class="profile-hero-info">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <h2 style="margin:0;font-size:24px;font-weight:700;">${escapeHtml(displayName)}</h2>
            <span class="pill accent">${googleSession ? `${uiIcon('cloud', 15)} Synced Account` : 'Offline Mode'}</span>
          </div>
          <div style="font-size:14px;color:var(--text-muted);margin-top:4px;">
            ${googleSession ? escapeHtml(googleSession.user?.email || 'Connected to Google Drive') : 'Sign in with Google to sync your profile & progress across all devices.'}
          </div>
          ${state.profile.bio ? `<div style="font-size:14px;margin-top:6px;">${escapeHtml(state.profile.bio)}</div>` : ''}
          <div style="font-size:13px;color:var(--text-muted);margin-top:8px;display:inline-flex;align-items:center;gap:6px;">
            ${uiIcon('cloud', 15)} Last synced: <strong>${escapeHtml(formatLastSynced(false))}</strong>
          </div>
        </div>
      </div>

      <div style="margin-top:16px;padding-top:14px;border-top:2px solid var(--border);">
        <div class="field-label" style="margin-bottom:6px;">Custom Profile Picture or Emblem</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <button type="button" class="btn btn-primary btn-sm" id="profile-avatar-pick-btn">${uiIcon('camera', 16)} Upload Custom Photo</button>
          ${
            state.profile.avatarDataUrl || state.profile.avatarEmoji
              ? `<button type="button" class="btn btn-sm" id="profile-avatar-reset-btn">${uiIcon('refresh', 15)} ${googleSession?.user?.picture ? 'Use Google Photo' : 'Reset Avatar'}</button>`
              : ''
          }
        </div>
        <div class="avatar-presets">
          ${AVATAR_PRESETS.map(
            (em) =>
              `<button type="button" class="avatar-preset-btn ${!state.profile.avatarDataUrl && state.profile.avatarEmoji === em ? 'active' : ''}" data-avatar-emoji="${escapeHtml(em)}" title="Use ${escapeHtml(em)} emblem">${escapeHtml(em)}</button>`
          ).join('')}
        </div>
      </div>

      <form id="profile-edit-form" style="margin-top:16px;padding-top:14px;border-top:2px solid var(--border);">
        <div class="form-grid">
          <div>
            <label class="field-label">Display Name</label>
            <input class="input" name="displayName" value="${escapeHtml(state.profile.displayName || googleSession?.user?.name || '')}" placeholder="Your name" maxlength="40" />
          </div>
          <div>
            <label class="field-label">Learning Goal / Bio</label>
            <input class="input" name="bio" value="${escapeHtml(state.profile.bio || '')}" placeholder="e.g. Preparing for JLPT N5 & Spanish A2" maxlength="90" />
          </div>
        </div>
        <div style="margin-bottom:14px;">
          <div class="field-label">Daily XP Goal</div>
          <div class="segmented-control">
            ${[20, 50, 100, 150]
              .map(
                (xp) =>
                  `<button type="button" class="seg-btn ${goalXp === xp ? 'active' : ''}" data-daily-goal="${xp}">${xp} XP</button>`
              )
              .join('')}
          </div>
        </div>
        <button class="btn btn-primary btn-sm" type="submit">${uiIcon('save', 16)} Save Profile</button>
      </form>
    </section>

    <section class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <h3 style="margin:0;">${uiIcon('user', 20)} Current Account</h3>
          <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">
            ${googleSession ? `Signed in as ${escapeHtml(googleSession.user?.email || googleSession.user?.name || 'Google User')}` : 'Using local device storage only'}
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${
            googleSession
              ? `
                <button class="btn btn-primary btn-sm" id="google-backup-btn" ${state.googleBusy ? 'disabled' : ''}>${uiIcon('cloud', 16)} Sync Now</button>
                <button class="btn btn-danger btn-sm" id="profile-logout-btn">${uiIcon('logout', 16)} Log Out</button>
              `
              : `<button class="btn btn-primary btn-sm" id="google-signin-btn" ${state.googleBusy ? 'disabled' : ''}>${uiIcon('shield', 16)} Sign in with Google</button>`
          }
        </div>
      </div>
    </section>

    <section class="card">
      <h3 style="margin-top:0;">${uiIcon('trophy', 20)} Learning Overview</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card-label">Current Streak</div>
          <div class="stat-card-value" style="color:#f97316;">${uiIcon('flame', 22)} ${state.progress.streak} days</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Total XP</div>
          <div class="stat-card-value" style="color:#eab308;">${uiIcon('zap', 22)} ${state.progress.xp} XP</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Lessons Done</div>
          <div class="stat-card-value">${completedLessonsCount} / ${totalLessonsAll}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Flashcards</div>
          <div class="stat-card-value">${srsCount} tracked</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Characters</div>
          <div class="stat-card-value">${masteredChars} mastered</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Hearts Mode</div>
          <div class="stat-card-value" style="color:#f43f5e;">${uiIcon('heart', 22)} ${state.progress.chillMode ? 'Unlimited' : `${state.progress.hearts}/5`}</div>
        </div>
      </div>
    </section>

    <section class="card" id="profile-courses-section">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
        <div>
          <h3 style="margin:0;">${uiIcon('book', 20)} Active Courses (${enrolledCourses.length})</h3>
          <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">
            Switch between your active courses or add new languages to learn.
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-sm" id="toggle-add-course-btn">
          ${state.showAddCoursePicker ? `${uiIcon('x', 16)} Close` : `${uiIcon('plus', 16)} Add Course`}
        </button>
      </div>

      ${
        state.showAddCoursePicker
          ? `
            <div class="add-course-panel" style="margin-bottom:14px;">
              <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--accent-text);">Available Courses to Add</div>
              ${
                availableCourses.length
                  ? availableCourses
                      .map((c) => {
                        const unitsCount = getAllUnits(c).length;
                        const itemsCount = getAllItems(c).length;
                        return `
                          <div class="add-course-row">
                            <div style="display:flex;align-items:center;gap:12px;min-width:0;">
                              <span class="lang-badge">${escapeHtml(getCourseFlag(c))}</span>
                              <div>
                                <div style="font-weight:700;font-size:15px;font-family:var(--font-display);">
                                  ${escapeHtml(c.sourceLang.name)} → ${escapeHtml(c.targetLang.name)}
                                  ${c.targetLang.nativeName ? `<span style="color:var(--accent-text);">(${escapeHtml(c.targetLang.nativeName)})</span>` : ''}
                                </div>
                                <div style="font-size:12px;color:var(--text-muted);">${unitsCount} units · ${itemsCount} items</div>
                              </div>
                            </div>
                            <button type="button" class="btn btn-primary btn-sm" data-enroll-course="${escapeHtml(c.id)}">${uiIcon('plus', 15)} Add</button>
                          </div>
                        `;
                      })
                      .join('')
                  : `
                    <div style="font-size:14px;color:var(--text-muted);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                      <span>You've added all built-in courses! Want more languages?</span>
                      <button type="button" class="btn btn-sm" data-nav="studio">${uiIcon('wrench', 15)} Open Course Studio</button>
                    </div>
                  `
              }
            </div>
          `
          : ''
      }

      <div style="display:grid;gap:10px;">
        ${enrolledCourses
          .map((c) => {
            const ordered = getOrderedLessons(c);
            const done = ordered.filter((e) => state.progress.completedLessons[e.key]).length;
            const pct = ordered.length ? Math.round((done / ordered.length) * 100) : 0;
            return `
              <div class="course-progress-item">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <span class="lang-badge">${escapeHtml(getCourseFlag(c))}</span>
                    <strong style="font-family:var(--font-display);font-size:16px;">${escapeHtml(c.sourceLang.name)} → ${escapeHtml(c.targetLang.name)}</strong>
                    <span style="font-size:13px;color:var(--text-muted);">${done}/${ordered.length} lessons (${pct}%)</span>
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-sm ${c.id === course.id ? 'btn-primary' : ''}" data-switch-course="${escapeHtml(c.id)}">${c.id === course.id ? 'Active' : `Continue ${uiIcon('arrowRight', 14)}`}</button>
                    <button type="button" class="btn btn-sm" data-unenroll-course="${escapeHtml(c.id)}" title="Remove from active courses">Remove</button>
                  </div>
                </div>
                <div class="mini-progress-track">
                  <div class="mini-progress-fill" style="width:${pct}%;"></div>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    </section>
  `;
}

function renderSettingsView(course) {
  const completedLessonsCount = Object.keys(state.progress.completedLessons || {}).length;
  const srsCount = Object.keys(state.srs || {}).length;
  const masteredChars = Object.values(state.progress.charMastery || {}).filter((v) => v >= 3).length;
  const customCount = state.courses.filter((c) => c._custom).length;
  const googleSession = getGoogleSession();
  const platformLabel = getPlatformLabel();
  const hintLabel = course.targetLang?.usesTransliteration === false ? 'Show Pronunciation Guide' : 'Show Transliteration (Romaji / Phonetics)';

  return `
    ${renderHudBar(course)}
    <div class="header-bar">
      <div>
        <h1 class="page-title">Settings</h1>
        <p class="page-sub">Account, appearance, learning preferences, cloud sync &amp; backup data.</p>
      </div>
      <span class="pill accent">v${escapeHtml(APP_CONFIG.appVersion)} · ${escapeHtml(platformLabel)}</span>
    </div>

    ${state.backupMessage ? `<div class="grammar-box">${escapeHtml(state.backupMessage)}</div>` : ''}

    <section class="card">
      <h3 style="margin-top:0;">${uiIcon('user', 20)} Account &amp; Session</h3>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:14px;border-radius:16px;background:var(--surface-elevated);border:2px solid var(--border);margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:12px;min-width:0;">
          ${renderAvatarMarkup('md')}
          <div style="min-width:0;">
            <div style="font-weight:700;font-size:16px;font-family:var(--font-display);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(getDisplayName())}</div>
            <div style="font-size:13px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${googleSession ? escapeHtml(googleSession.user?.email || 'Signed in with Google') : 'Not signed in · Local Guest Mode'}
            </div>
            <div style="font-size:12px;color:var(--accent-text);margin-top:3px;display:inline-flex;align-items:center;gap:5px;">
              ${uiIcon('cloud', 14)} Last synced: ${escapeHtml(formatLastSynced(false))}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-sm" data-nav="profile">Edit Profile</button>
          ${
            googleSession
              ? `<button class="btn btn-danger btn-sm" id="google-signout-btn">${uiIcon('logout', 16)} Log Out</button>`
              : `<button class="btn btn-primary btn-sm" id="google-signin-btn" ${state.googleBusy ? 'disabled' : ''}>${uiIcon('shield', 16)} ${state.googleBusy ? 'Signing in...' : 'Sign in with Google'}</button>`
          }
        </div>
      </div>
      ${
        googleSession
          ? `
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button class="btn btn-primary btn-sm" id="google-backup-btn" ${state.googleBusy ? 'disabled' : ''}>${uiIcon('cloud', 16)} Backup to Google Drive</button>
              <button class="btn btn-sm" id="google-restore-btn" ${state.googleBusy ? 'disabled' : ''}>${uiIcon('download', 16)} Restore from Google Drive</button>
            </div>
          `
          : !APP_CONFIG.googleClientId
            ? `
              <form id="google-client-form" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:10px;">
                <div style="flex:1;min-width:220px;">
                  <label class="field-label">Google OAuth 2.0 Web Client ID</label>
                  <input class="input" name="googleClientId" value="${escapeHtml(state.syncSettings.googleClientId)}" placeholder="123456789-xxxx.apps.googleusercontent.com" />
                </div>
                <button class="btn btn-sm" type="submit">Save Client ID</button>
              </form>
            `
            : ''
      }
    </section>

    <section class="card">
      <h3 style="margin-top:0;">${uiIcon('palette', 20)} Appearance</h3>
      <div class="settings-list">
        <div class="settings-row">
          <div>
            <div class="settings-row-title">Theme</div>
            <div class="settings-row-desc">Choose Light, Dark, or automatically match your device's system theme.</div>
          </div>
          <div class="segmented-control" role="group" aria-label="Theme mode">
            <button type="button" class="seg-btn ${state.theme === 'light' ? 'active' : ''}" data-set-theme="light">${uiIcon('sun', 15)} Light</button>
            <button type="button" class="seg-btn ${state.theme === 'dark' ? 'active' : ''}" data-set-theme="dark">${uiIcon('moon', 15)} Dark</button>
            <button type="button" class="seg-btn ${state.theme === 'system' ? 'active' : ''}" data-set-theme="system">${uiIcon('monitor', 15)} System</button>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <h3 style="margin-top:0;">${uiIcon('sliders', 20)} Learning &amp; Audio Preferences</h3>
      <div class="settings-list">
        <div class="settings-row">
          <div>
            <div class="settings-row-title">${escapeHtml(hintLabel)}</div>
            <div class="settings-row-desc">Display reading/romanization hints beneath foreign scripts in lessons and flashcards.</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="settings-toggle-romaji" ${state.showRomaji ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-row-title">Unlimited Hearts (Chill Mode)</div>
            <div class="settings-row-desc">Practice freely without losing hearts on mistakes during lessons.</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="settings-toggle-chill" ${state.progress.chillMode ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-row-title">Auto-Sync to Google Drive</div>
            <div class="settings-row-desc">Automatically back up progress to your private Drive AppData after lessons, flashcards, and profile changes.</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="settings-toggle-autosync" ${state.autoSync ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="settings-row">
          <div>
            <div class="settings-row-title">Audio Playback Speed</div>
            <div class="settings-row-desc">Adjust pronunciation speed for flashcards, lessons, and character drills.</div>
          </div>
          <div class="segmented-control" role="group" aria-label="Audio playback speed">
            <button type="button" class="seg-btn ${state.audioRate === 0.75 ? 'active' : ''}" data-set-audio-rate="0.75">0.75× Slow</button>
            <button type="button" class="seg-btn ${state.audioRate === 0.9 ? 'active' : ''}" data-set-audio-rate="0.9">0.9× Normal</button>
            <button type="button" class="seg-btn ${state.audioRate === 1.1 ? 'active' : ''}" data-set-audio-rate="1.1">1.1× Fast</button>
          </div>
        </div>
      </div>
    </section>

    <section class="card" id="settings-backup-section">
      <h3 style="margin-top:0;">${uiIcon('save', 20)} Backup &amp; Restore Data</h3>
      <div class="stats-grid" style="margin-bottom:14px;">
        <div class="stat-card">
          <div class="stat-card-label">Lessons Done</div>
          <div class="stat-card-value">${completedLessonsCount}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">XP / Streak</div>
          <div class="stat-card-value">${state.progress.xp} XP · ${state.progress.streak}d</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Flashcards</div>
          <div class="stat-card-value">${srsCount}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Chars / Custom</div>
          <div class="stat-card-value">${masteredChars} / ${customCount}</div>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <div class="settings-row-title" style="margin-bottom:4px;">1. Portable Backup File (.json)</div>
        <div class="settings-row-desc" style="margin-bottom:10px;">
          Includes your progress, flashcards, profile picture, theme, and custom courses. Works 100% offline.
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <button class="btn btn-primary btn-sm" id="save-backup-file-btn">${uiIcon('download', 16)} Export Backup File</button>
          <button class="btn btn-sm" id="open-backup-file-btn">${uiIcon('upload', 16)} Restore from File</button>
          <input type="file" id="web-backup-file-input" accept=".json,.txt,application/json,text/plain" style="display:none;" />
        </div>
      </div>

      <div style="padding-top:14px;border-top:2px solid var(--border);">
        <div class="settings-row-title" style="margin-bottom:4px;">2. Copy &amp; Paste Backup Code (<code>OL1:...</code>)</div>
        <div class="settings-row-desc" style="margin-bottom:10px;">
          Move progress between devices quickly by pasting a single-line backup code.
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
          <button class="btn btn-primary btn-sm" id="copy-backup-code-btn">${uiIcon('copy', 16)} Generate &amp; Copy Code</button>
          <button class="btn btn-sm" id="show-backup-code-btn">${uiIcon('eye', 16)} Show Code Below</button>
        </div>
        ${
          state.backupCodePreview
            ? `<textarea id="backup-code-output" rows="3" readonly style="margin-bottom:12px;font-family:monospace;font-size:12px;">${escapeHtml(state.backupCodePreview)}</textarea>`
            : ''
        }
        <label class="field-label">Paste Backup Code (OL1:...) or JSON to Restore</label>
        <textarea id="restore-code-input" rows="3" placeholder="Paste your OL1:... backup code or openlingo-backup.json contents here..." style="font-family:monospace;font-size:12px;"></textarea>
        <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <button class="btn btn-primary btn-sm" id="restore-code-btn">${uiIcon('refresh', 16)} Restore from Pasted Text</button>
          <button class="btn btn-danger btn-sm" id="reset-progress-btn">${uiIcon('trash', 16)} Reset Local Progress</button>
        </div>
      </div>
    </section>

    <section class="card">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <img src="./assets/icons/openlingo-icon.svg" alt="OpenLingo" style="width:42px;height:42px;border-radius:11px;display:block;" />
        <div>
          <h3 style="margin:0;">About OpenLingo</h3>
          <div style="font-size:12px;color:var(--text-muted);">Free &amp; Open-Source Cross-Platform Language Learning</div>
        </div>
      </div>
      <div class="settings-list">
        <div class="settings-row">
          <div class="settings-row-title">App Version</div>
          <span class="pill accent">v${escapeHtml(APP_CONFIG.appVersion)}</span>
        </div>
        <div class="settings-row">
          <div class="settings-row-title">Platform</div>
          <span class="pill">${escapeHtml(platformLabel)}</span>
        </div>
        <div class="settings-row">
          <div class="settings-row-title">App Origin / Sync Mode</div>
          <span class="pill">${escapeHtml(window.location.origin)}</span>
        </div>
        <div class="settings-row">
          <div class="settings-row-title">Links</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <a class="btn btn-sm" href="https://github.com/${escapeHtml(APP_CONFIG.githubRepo)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">GitHub</a>
            <a class="btn btn-sm" href="https://github.com/${escapeHtml(APP_CONFIG.githubRepo)}/releases" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">Releases</a>
            <a class="btn btn-sm" href="./privacy.html" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">Privacy Policy</a>
          </div>
        </div>
      </div>
    </section>
  `;
}

/* ---------- Events ---------- */
function switchCourse(newId) {
  if (newId === '__add__') {
    state.view = 'profile';
    state.showAddCoursePicker = true;
    render();
    return;
  }
  if (!state.enrolledCourseIds.includes(newId) && state.courses.some((c) => c.id === newId)) {
    state.enrolledCourseIds = [...state.enrolledCourseIds, newId];
    saveLocalState();
    autoBackupToGoogleDrive(false);
  }
  state.activeCourseId = newId;
  const nextCourse = getActiveCourse();
  if (!nextCourse) return;
  const nextSections = getSections(nextCourse);
  state.selectedSectionId = nextSections[0]?.id || 'all';
  state.flashcardFilter = 'ALL';
  state.activeScriptTab = null;
  state.scriptDrill = null;
  state.drawSession = null;
  state.drawController = null;
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
      state.drawSession = null;
      state.drawController = null;
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

  const romajiToggle = document.getElementById('settings-toggle-romaji') || document.getElementById('toggle-romaji');
  if (romajiToggle) {
    romajiToggle.addEventListener('change', (e) => {
      state.showRomaji = e.target.checked;
      saveLocalState();
      autoBackupToGoogleDrive(false);
      render();
    });
  }

  const chillToggle = document.getElementById('settings-toggle-chill') || document.getElementById('toggle-chill');
  if (chillToggle) {
    chillToggle.addEventListener('change', (e) => {
      state.progress.chillMode = e.target.checked;
      saveLocalState();
      autoBackupToGoogleDrive(false);
      render();
    });
  }

  const autoSyncToggle = document.getElementById('settings-toggle-autosync');
  if (autoSyncToggle) {
    autoSyncToggle.addEventListener('change', (e) => {
      state.autoSync = e.target.checked;
      saveLocalState();
      render();
    });
  }

  document.querySelectorAll('[data-set-theme]').forEach((btn) => {
    btn.addEventListener('click', () => setTheme(btn.dataset.setTheme));
  });

  document.querySelectorAll('[data-set-audio-rate]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.audioRate = Number(btn.dataset.setAudioRate) || 0.9;
      saveLocalState();
      autoBackupToGoogleDrive(false);
      render();
    });
  });

  /* Profile Events */
  const avatarInput = document.getElementById('profile-avatar-input');
  const avatarUploadBtn = document.getElementById('profile-avatar-upload-btn');
  const avatarPickBtn = document.getElementById('profile-avatar-pick-btn');
  if (avatarUploadBtn && avatarInput) {
    avatarUploadBtn.addEventListener('click', () => avatarInput.click());
  }
  if (avatarPickBtn && avatarInput) {
    avatarPickBtn.addEventListener('click', () => avatarInput.click());
  }
  if (avatarInput) {
    avatarInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await compressAvatarFile(file);
        state.profile.avatarDataUrl = dataUrl;
        state.profile.avatarEmoji = '';
        state.profileMessage = 'Updated custom profile picture!';
        saveLocalState();
        autoBackupToGoogleDrive(false);
        render();
      } catch (err) {
        state.profileMessage = `Could not update photo: ${err.message}`;
        render();
      }
    });
  }

  const avatarResetBtn = document.getElementById('profile-avatar-reset-btn');
  if (avatarResetBtn) {
    avatarResetBtn.addEventListener('click', () => {
      state.profile.avatarDataUrl = '';
      state.profile.avatarEmoji = '';
      state.profileMessage = 'Avatar reset.';
      saveLocalState();
      autoBackupToGoogleDrive(false);
      render();
    });
  }

  document.querySelectorAll('[data-avatar-emoji]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.profile.avatarDataUrl = '';
      state.profile.avatarEmoji = btn.dataset.avatarEmoji;
      state.profileMessage = `Avatar updated to ${btn.dataset.avatarEmoji}`;
      saveLocalState();
      autoBackupToGoogleDrive(false);
      render();
    });
  });

  document.querySelectorAll('[data-daily-goal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.profile.dailyGoalXp = Number(btn.dataset.dailyGoal) || 50;
      saveLocalState();
      autoBackupToGoogleDrive(false);
      render();
    });
  });

  const profileForm = document.getElementById('profile-edit-form');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(profileForm);
      state.profile.displayName = String(fd.get('displayName') || '').trim();
      state.profile.bio = String(fd.get('bio') || '').trim();
      state.profileMessage = 'Profile saved!';
      saveLocalState();
      autoBackupToGoogleDrive(false);
      render();
    });
  }

  const toggleAddCourseBtn = document.getElementById('toggle-add-course-btn');
  if (toggleAddCourseBtn) {
    toggleAddCourseBtn.addEventListener('click', () => {
      state.showAddCoursePicker = !state.showAddCoursePicker;
      render();
    });
  }

  document.querySelectorAll('[data-enroll-course]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = btn.dataset.enrollCourse;
      const target = state.courses.find((c) => c.id === cid);
      state.profileMessage = target ? `Added "${target.sourceLang.name} → ${target.targetLang.name}" to your active courses!` : '';
      enrollCourse(cid, false);
    });
  });

  document.querySelectorAll('[data-unenroll-course]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cid = btn.dataset.unenrollCourse;
      const target = state.courses.find((c) => c.id === cid);
      const label = target ? `${target.sourceLang.name} → ${target.targetLang.name}` : cid;
      if (!confirm(`Remove "${label}" from your active courses? (Your saved lesson progress will be kept if you re-add it later.)`)) return;
      state.profileMessage = `Removed "${label}" from active courses.`;
      unenrollCourse(cid);
    });
  });

  const sectionSelect = document.getElementById('section-select');
  if (sectionSelect) {
    sectionSelect.addEventListener('change', (e) => {
      state.selectedSectionId = e.target.value;
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

  /* Characters Tab & Drawing Board Events */
  document.querySelectorAll('[data-script-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeScriptTab = btn.dataset.scriptTab;
      state.drawSession = null;
      render();
    });
  });

  document.querySelectorAll('[data-char-tap]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const glyph = btn.dataset.charTap;
      openDrawSession(getScriptSetForCourse(course), state.activeScriptTab, glyph);
    });
  });

  const startDrawModeBtn = document.getElementById('start-draw-mode-btn');
  if (startDrawModeBtn) {
    startDrawModeBtn.addEventListener('click', () => {
      openDrawSession(getScriptSetForCourse(course), state.activeScriptTab, null);
    });
  }

  const startWriteTestBtn = document.getElementById('start-write-test-btn');
  if (startWriteTestBtn) {
    startWriteTestBtn.addEventListener('click', () => {
      openRandomWriteTest(getScriptSetForCourse(course), state.activeScriptTab);
    });
  }

  const startWordWriteBtn = document.getElementById('start-word-write-btn');
  if (startWordWriteBtn) {
    startWordWriteBtn.addEventListener('click', () => {
      openWordWriteSession(course);
    });
  }

  if (state.view === 'characters' && state.drawSession) {
    const ds = state.drawSession;
    const isWordMode = ds.mode === 'word-write';
    const isTestMode = ds.mode === 'write-test';

    const closeDrawBtn = document.getElementById('close-draw-btn');
    if (closeDrawBtn) {
      closeDrawBtn.addEventListener('click', () => {
        state.drawSession = null;
        state.drawController = null;
        render();
      });
    }

    const restartDrawBtn = document.getElementById('restart-draw-mode-btn');
    if (restartDrawBtn) {
      restartDrawBtn.addEventListener('click', () => {
        if (isWordMode) openWordWriteSession(course);
        else openRandomWriteTest(getScriptSetForCourse(course), state.activeScriptTab);
      });
    }

    if (!ds.completed) {
      const ch = ds.items[ds.index];
      const canvasWrap = document.querySelector('.draw-canvas-wrap');
      if (canvasWrap) {
        state.drawController = mountDrawBoard(canvasWrap, {
          glyph: ch.glyph,
          width: isWordMode ? 520 : 280,
          height: isWordMode ? 170 : 280,
          ruled: isWordMode,
          guideMode: ds.guideMode,
          strokes: ds.strokes,
          onStrokesChange: (updated) => {
            ds.strokes = updated;
          }
        });
        if (ds.result && state.drawController) {
          state.drawController.showOverlay();
        }
      }

      const undoBtn = document.getElementById('draw-undo-btn');
      if (undoBtn) {
        undoBtn.addEventListener('click', () => {
          ds.result = null;
          state.drawController?.undo();
          render();
        });
      }

      const clearBtn = document.getElementById('draw-clear-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          ds.strokes = [];
          ds.result = null;
          state.drawController?.clear();
          render();
        });
      }

      const guideBtn = document.getElementById('draw-guide-btn');
      if (guideBtn) {
        guideBtn.addEventListener('click', () => {
          const order = ['full', 'faint', 'off'];
          ds.guideMode = order[(order.indexOf(ds.guideMode) + 1) % order.length];
          state.drawController?.setGuide(ds.guideMode);
          render();
        });
      }

      const checkBtn = document.getElementById('draw-check-btn');
      if (checkBtn) {
        checkBtn.addEventListener('click', () => {
          if (!state.drawController) return;
          const res = state.drawController.evaluate();
          ds.result = res;
          if (res.passed) {
            ds.passedCount += 1;
            if (!isWordMode) {
              state.progress.charMastery[ch.glyph] = Math.min(3, (state.progress.charMastery[ch.glyph] || 0) + 1);
            }
            state.progress.xp += isWordMode ? 10 : 5;
            recordStudyActivity();
            saveLocalState();
            autoBackupToGoogleDrive(false);
            speakText(ch.glyph, ds.speechLocale);
          }
          render();
        });
      }

      const repeatBtn = document.getElementById('draw-repeat-btn');
      if (repeatBtn) {
        repeatBtn.addEventListener('click', () => {
          const nextMastery = state.progress.charMastery[ch.glyph] || 0;
          ds.guideMode = nextMastery >= 2 ? 'off' : nextMastery === 1 ? 'faint' : 'full';
          ds.strokes = [];
          ds.result = null;
          speakText(ch.glyph, ds.speechLocale);
          render();
        });
      }

      const stepItem = (delta) => {
        const nextIdx = ds.index + delta;
        if (nextIdx < 0) return;
        if (nextIdx >= ds.items.length) {
          if (isTestMode || isWordMode) {
            ds.completed = true;
            state.progress.xp += 30;
            recordStudyActivity();
            saveLocalState();
            render();
          }
          return;
        }
        ds.index = nextIdx;
        const nextCh = ds.items[nextIdx];
        if (isTestMode) {
          ds.guideMode = 'off';
        } else if (isWordMode) {
          ds.guideMode = 'full';
        } else {
          const nextMastery = state.progress.charMastery[nextCh.glyph] || 0;
          ds.guideMode = nextMastery >= 2 ? 'off' : nextMastery === 1 ? 'faint' : 'full';
        }
        ds.strokes = [];
        ds.result = null;
        speakText(nextCh.glyph, ds.speechLocale);
        render();
      };

      const prevBtn = document.getElementById('draw-prev-btn');
      if (prevBtn) prevBtn.addEventListener('click', () => stepItem(-1));
      const nextBtn = document.getElementById('draw-next-btn');
      if (nextBtn) nextBtn.addEventListener('click', () => stepItem(1));
      const nextSideBtn = document.getElementById('draw-next-btn-side');
      if (nextSideBtn) nextSideBtn.addEventListener('click', () => stepItem(1));
    }
  }

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
          autoBackupToGoogleDrive(true);
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
        autoBackupToGoogleDrive(true);
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

  /* GitHub Community Course Catalog Events */
  const ghRepoForm = document.getElementById('github-repo-form');
  if (ghRepoForm) {
    ghRepoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(ghRepoForm);
      state.syncSettings.githubRepo = String(fd.get('githubRepo')).trim();
      state.syncSettings.githubBranch = String(fd.get('githubBranch')).trim() || 'main';
      saveLocalState();
      state.catalogStatus = `Saved GitHub source: ${state.syncSettings.githubRepo} (${state.syncSettings.githubBranch})`;
      render();
    });
  }

  const syncCatalogBtn = document.getElementById('sync-github-catalog-btn');
  if (syncCatalogBtn) {
    syncCatalogBtn.addEventListener('click', async () => {
      state.catalogLoading = true;
      state.catalogStatus = `Fetching courses/registry.json from ${state.syncSettings.githubRepo}...`;
      render();
      try {
        const result = await fetchGitHubCatalog(state.syncSettings.githubRepo, state.syncSettings.githubBranch);
        state.catalogEntries = result.entries;
        state.catalogStatus = `Synced ${result.entries.length} courses from github.com/${result.repo} (${result.branch}).`;
      } catch (err) {
        state.catalogStatus = `Sync error: ${err.message}`;
      } finally {
        state.catalogLoading = false;
        render();
      }
    });
  }

  document.querySelectorAll('[data-switch-course]').forEach((btn) => {
    btn.addEventListener('click', () => switchCourse(btn.dataset.switchCourse));
  });

  document.querySelectorAll('[data-install-github]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.installGithub;
      const entry =
        state.catalogEntries.find((e) => e.id === id) ||
        { id, path: `courses/${id}/course.json` };
      state.catalogLoading = true;
      state.catalogStatus = `Downloading ${id} from GitHub...`;
      render();
      try {
        const downloaded = await fetchCourseFromGitHub(
          entry,
          state.syncSettings.githubRepo,
          state.syncSettings.githubBranch
        );
        const idx = state.courses.findIndex((c) => c.id === downloaded.id);
        if (idx >= 0) state.courses[idx] = downloaded;
        else state.courses.push(downloaded);
        if (!state.enrolledCourseIds.includes(downloaded.id)) {
          state.enrolledCourseIds = [...state.enrolledCourseIds, downloaded.id];
        }
        saveLocalState();
        state.studioMessage = `Installed "${downloaded.title}" (v${downloaded.version || '1.0.0'}) from GitHub — saved offline on this device!`;
        state.catalogStatus = `Successfully pulled ${downloaded.id} (${getAllItems(downloaded).length} items).`;
      } catch (err) {
        state.catalogStatus = `Download failed: ${err.message}`;
      } finally {
        state.catalogLoading = false;
        render();
      }
    });
  });

  /* Google Sign-In & Drive AppData Sync Events */
  const googleClientForm = document.getElementById('google-client-form');
  if (googleClientForm) {
    googleClientForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(googleClientForm);
      state.syncSettings.googleClientId = String(fd.get('googleClientId')).trim();
      saveLocalState();
      state.backupMessage = state.syncSettings.googleClientId
        ? 'Saved Google OAuth Client ID. Click "Sign in with Google" to connect your Drive!'
        : 'Cleared Google OAuth Client ID.';
      render();
    });
  }

  const googleSignInBtn = document.getElementById('google-signin-btn');
  if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', handleGoogleSignInAndSync);
  }

  const sidebarSignInBtn = document.getElementById('sidebar-signin-btn');
  if (sidebarSignInBtn) {
    sidebarSignInBtn.addEventListener('click', handleGoogleSignInAndSync);
  }

  const doSignOut = () => {
    signOutGoogle();
    state.guestMode = false;
    localStorage.removeItem(STORAGE_KEYS.GUEST);
    state.backupMessage = 'Signed out of Google. Your local device progress remains intact.';
    render();
  };

  const googleSignOutBtn = document.getElementById('google-signout-btn');
  if (googleSignOutBtn) googleSignOutBtn.addEventListener('click', doSignOut);

  const profileLogoutBtn = document.getElementById('profile-logout-btn');
  if (profileLogoutBtn) profileLogoutBtn.addEventListener('click', doSignOut);

  const sidebarSignOutBtn = document.getElementById('sidebar-signout-btn');
  if (sidebarSignOutBtn) sidebarSignOutBtn.addEventListener('click', doSignOut);

  const googleBackupBtn = document.getElementById('google-backup-btn');
  if (googleBackupBtn) {
    googleBackupBtn.addEventListener('click', async () => {
      state.googleBusy = true;
      state.backupMessage = 'Uploading progress to your private Google Drive AppData...';
      render();
      try {
        const res = await backupToGoogleDrive(buildBackupPayload());
        recordSyncTimestamp('Google Drive', res.savedAt);
        state.backupMessage = `Backed up to your Google Drive (${formatLastSynced(false)}).`;
      } catch (err) {
        state.backupMessage = `Google Drive backup failed: ${err.message}`;
      } finally {
        state.googleBusy = false;
        render();
      }
    });
  }

  const googleRestoreBtn = document.getElementById('google-restore-btn');
  if (googleRestoreBtn) {
    googleRestoreBtn.addEventListener('click', async () => {
      state.googleBusy = true;
      state.backupMessage = 'Downloading backup from your Google Drive...';
      render();
      try {
        const { text, modifiedTime } = await restoreFromGoogleDrive();
        state.googleBusy = false;
        restoreBackupPayload(text, 'Google Drive', modifiedTime);
      } catch (err) {
        state.googleBusy = false;
        state.backupMessage = `Google Drive restore failed: ${err.message}`;
        render();
      }
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
      if (!state.enrolledCourseIds.includes(newCourse.id)) {
        state.enrolledCourseIds = [...state.enrolledCourseIds, newCourse.id];
      }
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
      state.enrolledCourseIds = [];
      state.activeCourseId = '';
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
        if (!state.enrolledCourseIds.includes(parsed.id)) {
          state.enrolledCourseIds = [...state.enrolledCourseIds, parsed.id];
        }
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
  const accent = getUnitSolidColor(sheet.unit.color || sheet.unit._section?.color);
  return `
    <div id="sheet-backdrop" class="sheet-backdrop">
      <div class="lesson-sheet">
        <div class="sheet-handle"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
          <span class="pill accent">${escapeHtml(sheet.unit.cefrLevel || 'Lesson')} · ${escapeHtml(sheet.unit.title)}</span>
          <span class="pill">${sheet.lesson.items.length} items</span>
        </div>
        <h2 style="margin:6px 0 4px;font-size:22px;">${escapeHtml(sheet.lesson.title)}</h2>
        <p style="margin:0 0 16px;font-size:14px;color:var(--text-muted);">${escapeHtml(sheet.lesson.objective || '')}</p>
        <div style="display:grid;gap:10px;">
          <button class="btn btn-primary" style="width:100%;padding:14px;" data-start-lesson="${escapeHtml(sheet.unit.id)}|${escapeHtml(sheet.lesson.id)}">
            ${uiIcon('play', 18)} ${done ? 'PRACTICE AGAIN (+25 XP)' : 'START LESSON (+25 XP)'}
          </button>
          <button class="btn" style="width:100%;" data-guidebook="${escapeHtml(sheet.unit.id)}">${uiIcon('book', 18)} Open Unit Guidebook</button>
        </div>
      </div>
    </div>
  `;
}

function render() {
  if (!state.courses.length) return;

  // Cloud pre-sync screen: pull latest Google Drive progress BEFORE loading main UI
  if (state.syncingCloud) {
    document.getElementById('app').innerHTML = `
      <div class="auth-screen">
        <div class="auth-card">
          <div class="auth-logo">☁️</div>
          <h1 style="margin:0;font-size:22px;font-weight:800;">Syncing your progress...</h1>
          <p style="margin:8px 0 0;font-size:14px;color:var(--text-muted);">
            Loading your latest lessons, streak, and flashcards from Google Drive.
          </p>
        </div>
      </div>
    `;
    return;
  }

  // Startup Sign in with Google gate (across Web, Desktop, and Android Mobile)
  if (!getGoogleSession() && !state.guestMode) {
    document.getElementById('app').innerHTML = renderAuthGate();
    const gateSignIn = document.getElementById('gate-google-signin-btn');
    if (gateSignIn) gateSignIn.addEventListener('click', handleGoogleSignInAndSync);
    const gateSkip = document.getElementById('gate-continue-offline-btn');
    if (gateSkip) {
      gateSkip.addEventListener('click', () => {
        state.guestMode = true;
        localStorage.setItem(STORAGE_KEYS.GUEST, 'true');
        render();
      });
    }
    return;
  }

  // New user onboarding: start with 0 courses and ask which course to begin
  if (getEnrolledCourses().length === 0) {
    document.getElementById('app').innerHTML = renderCourseOnboarding();
    document.querySelectorAll('[data-onboarding-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        enrollCourse(btn.dataset.onboardingPick, true);
      });
    });
    const onbSignIn = document.getElementById('onboarding-signin-btn');
    if (onbSignIn) onbSignIn.addEventListener('click', handleGoogleSignInAndSync);
    const onbLogout = document.getElementById('onboarding-logout-btn');
    if (onbLogout) {
      onbLogout.addEventListener('click', () => {
        signOutGoogle();
        state.guestMode = false;
        localStorage.removeItem(STORAGE_KEYS.GUEST);
        render();
      });
    }
    return;
  }

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
  else if (state.view === 'profile') mainContent = renderProfileView(course);
  else if (state.view === 'settings' || state.view === 'backup') mainContent = renderSettingsView(course);

  document.getElementById('app').innerHTML = `
    ${renderSidebar(course)}
    ${renderMobileTopbar(course)}
    <main class="main">${mainContent}</main>
    ${renderMobileNav(course)}
    ${renderLessonSheet(course)}
    <div id="audio-toast" style="display:${state.audioToast ? 'block' : 'none'};position:fixed;bottom:78px;left:50%;transform:translateX(-50%);background:var(--surface-elevated);color:var(--text);border:1px solid var(--border);padding:10px 16px;border-radius:12px;font-size:12px;font-weight:600;z-index:60;box-shadow:0 8px 24px rgba(0,0,0,0.4);max-width:90vw;text-align:center;">${escapeHtml(state.audioToast)}</div>
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
      const normalized = normalizeRegistryEntries(reg);
      if (normalized.length) {
        state.catalogEntries = normalized;
        courseManifestUrls = normalized.map((e) => `./${e.path}`);
      }
    }
  } catch {
    // Fallback to built-in course list
  }

  const loadedCourses = await Promise.all(courseManifestUrls.map(loadCourseManifest));
  state.courses = loadedCourses;

  try {
    const ghCourses = JSON.parse(localStorage.getItem(STORAGE_KEYS.GITHUB_COURSES) || '[]');
    ghCourses.forEach((c) => {
      const idx = state.courses.findIndex((x) => x.id === c.id);
      if (idx >= 0) state.courses[idx] = c;
      else state.courses.push(c);
    });
    const customCourses = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]');
    customCourses.forEach((c) => {
      const idx = state.courses.findIndex((x) => x.id === c.id);
      if (idx >= 0) state.courses[idx] = c;
      else state.courses.push(c);
    });
  } catch {
    // Ignore storage errors
  }

  const active = getActiveCourse();
  state.selectedSectionId = active?.sections?.[0]?.id || 'all';

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  if (getGoogleSession()) {
    await syncFromCloudBeforeUi();
  } else {
    render();
  }
}

init();
