import { RATINGS, createCardState, scheduleReview, formatIntervalLabel, isDue } from './src/srs.js';
import { generateLessonExercises, normalizeAnswer } from './src/exercises.js';
import { getScriptSetForCourse } from './src/scripts.js';
import { mountDrawBoard } from './src/drawboard.js';
import { APP_CONFIG } from './src/config.js';
import { uiIcon } from './src/icons.js';
import {
  APP_ICON_PRESETS,
  DEFAULT_APP_ICON_ID,
  getAppIconPreset,
  findPresetByGlyph,
  getAppIconDataUrl,
  applyDocumentAppIcon,
  syncLanguageAppIcons
} from './src/appIcons.js';
import {
  loadMatrixSyllabus,
  syncMatrixFromGitHub,
  getMatrixLanguages,
  parseMatrixCourseId,
  buildMatrixCourse
} from './src/courseMatrix.js';
import { normalizeRegistryEntries, fetchGitHubCatalog, fetchCourseFromGitHub } from './src/catalog.js';
import {
  getGoogleSession,
  signInWithGoogle,
  signOutGoogle,
  backupToGoogleDrive,
  restoreFromGoogleDrive
} from './src/googleSync.js';
import {
  checkForAppUpdate,
  performAppUpdate,
  getDismissedUpdateVersion,
  dismissUpdateVersion,
  openExternalLink
} from './src/updater.js';
import {
  fetchPublicCourseReviews,
  getCourseReviews,
  getCourseRatingSummary,
  saveLocalCourseReview,
  getCourseMeta,
  buildCourseShareUrl,
  buildPublicReviewIssueUrl,
  shareOrCopyCourseLink,
  getLocalCourseReviews,
  mergeReviewsFromCloud
} from './src/courseSocial.js';

const STORAGE_KEYS = {
  COURSES: 'polygot_custom_courses_v2',
  GITHUB_COURSES: 'polygot_github_courses_v1',
  PROGRESS: 'polygot_progress_v2',
  SRS: 'polygot_srs_v2',
  THEME: 'polygot_theme_v1',
  SETTINGS: 'polygot_sync_settings_v1',
  GUEST: 'polygot_guest_mode_v1',
  SYNC_META: 'polygot_sync_meta_v1',
  PROFILE: 'polygot_profile_v1',
  PREFS: 'polygot_prefs_v1',
  ENROLLED: 'polygot_enrolled_courses_v1',
  LIVE_CATALOG: 'polygot_live_catalog_v1'
};

const state = {
  view: 'syllabus', // 'syllabus' | 'characters' | 'lesson' | 'placement' | 'guidebook' | 'flashcards' | 'studio' | 'profile' | 'settings' | 'backup'
  courses: [],
  enrolledCourseIds: [],
  activeCourseId: '',
  pickerSourceLang: 'en',
  loadingCourse: false,
  showAddCoursePicker: false,
  showAddCourseModal: false,
  addCourseSearch: '',
  addCourseSort: 'default', // 'default' | 'rating' | 'popular'
  courseInfoModalId: null,
  courseReviewDraft: { rating: 5, comment: '' },
  courseReviewNotice: '',
  selectedSectionId: 'all',
  profileTab: 'courses', // 'courses' | 'customize' | 'edit'
  settingsOpenSection: 'preferences', // 'preferences' | 'course' | 'studio' | 'data' | 'about'
  liveCatalogSyncing: false,
  liveCatalogLastSyncedAt: 0,
  liveCatalogNewCount: 0,
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
    appIcon: DEFAULT_APP_ICON_ID,
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
  audioToast: '',
  shouldScrollToActiveLesson: true,
  updateInfo: null,
  updateChecking: false,
  updateError: '',
  updateBannerDismissed: false,
  updateInstall: null
};

function tCourse(course, key, vars = {}) {
  let str = course?.i18n?.ui?.[key];
  if (!str) {
    const fallback = {
      start: 'START',
      guidebook: 'Guidebook',
      jumpHere: 'Jump Here',
      unit: 'Unit',
      complete: 'complete',
      completedTap: 'Completed · Tap to practice',
      locked: 'Locked',
      itemsReady: '{n} items · Ready',
      unitTrophy: 'Unit Trophy',
      unitMastered: 'Unit Mastered!',
      allLevels: 'All Levels',
      backToPath: '← Back to Path',
      keyVocab: 'Key Vocabulary & Expressions',
      grammarNote: 'Grammar Note',
      listen: 'Listen',
      audio: 'Audio',
      beginDrills: 'Begin Interactive Drills ({n})',
      exerciseOf: 'Exercise {i} of {n}',
      chooseMeaning: 'Choose the {lang} meaning',
      selectMatching: 'Select the matching expression',
      typeExpression: 'Type the expression for',
      typePlaceholder: 'Type your answer in {lang}...',
      checkAnswer: 'Check Answer',
      nicelyDone: 'Nicely done!',
      keepPracticing: 'Keep practicing!',
      continueBtn: 'Continue',
      lessonComplete: 'Lesson Complete!',
      accuracyXp: '{acc}% accuracy · +25 XP',
      continuePath: 'Continue Learning Path',
      reviewFlashcards: 'Review Flashcards',
      tapToFlip: 'Tap card to flip',
      tapToFlipBack: 'Tap to flip back',
      meaning: '{lang} Meaning',
      again: 'Again',
      hard: 'Hard',
      good: 'Good',
      easy: 'Easy',
      backToLesson: 'Back to Lesson',
      jumpToLesson: 'Jump to Lesson',
      pronounce: 'Pronounce'
    };
    str = fallback[key] || key;
  }
  Object.entries(vars).forEach(([k, v]) => {
    str = str.replaceAll(`{${k}}`, String(v ?? ''));
  });
  return str;
}

const customSelectRegistry = new Map();

function closeCustomSelectOverlay() {
  const existing = document.getElementById('ol-select-overlay');
  if (existing) existing.remove();
  if (window._olSelectEscHandler) {
    window.removeEventListener('keydown', window._olSelectEscHandler);
    window._olSelectEscHandler = null;
  }
}

function renderCustomSelect({ id = '', name = '', className = '', style = '', ariaLabel = 'Select option', value = '', options = [] }) {
  const key = id || name || `sel_${customSelectRegistry.size}`;
  const selected = options.find((o) => String(o.value) === String(value)) || options[0] || { value: '', label: '' };
  customSelectRegistry.set(key, { id, name, ariaLabel, value: selected.value, options });
  return `
    <span class="ol-select-wrap" ${style ? `style="${escapeHtml(style)}"` : ''}>
      ${name ? `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(selected.value)}" data-ol-select-input="${escapeHtml(key)}" />` : ''}
      <button
        type="button"
        ${id ? `id="${escapeHtml(id)}"` : ''}
        class="ol-select-trigger ${escapeHtml(className)}"
        data-ol-select="${escapeHtml(key)}"
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-label="${escapeHtml(ariaLabel)}"
      >
        <span class="ol-select-label">${escapeHtml(selected.label)}</span>
        <span class="ol-select-chevron" aria-hidden="true">${uiIcon('chevronDown', 16)}</span>
      </button>
    </span>
  `;
}

function openCustomSelectOverlay(key, onSelect) {
  const cfg = customSelectRegistry.get(key);
  if (!cfg) return;
  closeCustomSelectOverlay();

  const overlay = document.createElement('div');
  overlay.id = 'ol-select-overlay';
  overlay.className = 'ol-select-overlay';
  overlay.innerHTML = `
    <div class="ol-select-modal" role="listbox" aria-label="${escapeHtml(cfg.ariaLabel)}">
      <div class="ol-select-modal-header">
        <span class="ol-select-modal-title">${escapeHtml(cfg.ariaLabel)}</span>
        <button type="button" class="ol-select-close" aria-label="Close">${uiIcon('x', 18)}</button>
      </div>
      <div class="ol-select-list">
        ${cfg.options
          .filter((opt) => !opt.hidden)
          .map((opt) => {
            const isSel = String(opt.value) === String(cfg.value);
            return `
              <button
                type="button"
                role="option"
                aria-selected="${isSel ? 'true' : 'false'}"
                class="ol-select-option ${isSel ? 'selected' : ''}"
                data-ol-opt-value="${escapeHtml(opt.value)}"
              >
                <span class="ol-select-opt-label">${escapeHtml(opt.label)}</span>
                <span class="ol-select-opt-check" aria-hidden="true">${isSel ? uiIcon('check', 15) : ''}</span>
              </button>
            `;
          })
          .join('')}
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('.ol-select-close')) {
      closeCustomSelectOverlay();
      return;
    }
    const optBtn = e.target.closest('[data-ol-opt-value]');
    if (!optBtn) return;
    const nextVal = optBtn.dataset.olOptValue;
    cfg.value = nextVal;
    const chosen = cfg.options.find((o) => String(o.value) === String(nextVal));
    const hiddenInput = document.querySelector(`[data-ol-select-input="${CSS.escape(key)}"]`);
    if (hiddenInput) hiddenInput.value = nextVal;
    const trigger = document.querySelector(`[data-ol-select="${CSS.escape(key)}"] .ol-select-label`);
    if (trigger && chosen) trigger.textContent = chosen.label;
    closeCustomSelectOverlay();
    if (typeof onSelect === 'function') onSelect(nextVal);
  });

  window._olSelectEscHandler = (e) => {
    if (e.key === 'Escape') closeCustomSelectOverlay();
  };
  window.addEventListener('keydown', window._olSelectEscHandler);

  document.body.appendChild(overlay);
  const selectedEl = overlay.querySelector('.ol-select-option.selected');
  if (selectedEl) {
    requestAnimationFrame(() => selectedEl.scrollIntoView({ block: 'nearest' }));
  }
}

function bindCustomSelect(key, onSelect) {
  const trigger = document.querySelector(`[data-ol-select="${CSS.escape(key)}"]`);
  if (!trigger) return;
  trigger.addEventListener('click', () => openCustomSelectOverlay(key, onSelect));
}

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
  const src = (course?.sourceLang?.code || 'EN').toUpperCase();
  const tgt = (course?.targetLang?.code || 'LN').toUpperCase();
  return `${src}→${tgt}`;
}

async function ensureCourseLoaded(courseId) {
  const existing = state.courses.find((c) => c.id === courseId);
  if (existing) return existing;
  const pair = parseMatrixCourseId(courseId);
  if (pair) {
    const built = await buildMatrixCourse(pair.sourceCode, pair.targetCode);
    if (!state.courses.some((c) => c.id === built.id)) {
      state.courses.push(built);
    }
    return built;
  }
  // Auto-download standalone community courses listed in live registry without app updates
  const remoteEntry = (state.catalogEntries || []).find((e) => e.id === courseId);
  if (remoteEntry) {
    const downloaded = await fetchCourseFromGitHub(
      remoteEntry,
      state.syncSettings.githubRepo,
      state.syncSettings.githubBranch
    );
    if (downloaded && downloaded.id) {
      const idx = state.courses.findIndex((c) => c.id === downloaded.id);
      if (idx >= 0) state.courses[idx] = downloaded;
      else state.courses.push(downloaded);
      saveLocalState();
      return downloaded;
    }
  }
  return null;
}

const LIVE_CATALOG_TTL_MS = 5 * 60 * 1000;

async function autoRefreshLiveCatalog({ force = false, silent = true } = {}) {
  if (state.liveCatalogSyncing) return;
  if (!force && state.liveCatalogLastSyncedAt && Date.now() - state.liveCatalogLastSyncedAt < LIVE_CATALOG_TTL_MS) {
    return;
  }
  state.liveCatalogSyncing = true;
  if (!silent) render();

  const repo = state.syncSettings.githubRepo || APP_CONFIG.githubRepo;
  const branch = state.syncSettings.githubBranch || APP_CONFIG.githubBranch;
  let foundNew = 0;

  try {
    const [matrixRes, catRes] = await Promise.allSettled([
      syncMatrixFromGitHub(repo, branch),
      fetchGitHubCatalog(repo, branch)
    ]);

    if (matrixRes.status === 'fulfilled' && matrixRes.value) {
      syncLanguageAppIcons(getMatrixLanguages());
      foundNew += (matrixRes.value.newLanguages || []).length;
    }

    if (catRes.status === 'fulfilled' && catRes.value) {
      const prevIds = new Set((state.catalogEntries || []).map((e) => e.id));
      const nextEntries = catRes.value.entries || [];
      nextEntries.forEach((e) => {
        if (!prevIds.has(e.id)) foundNew += 1;
      });
      state.catalogEntries = nextEntries;
      try {
        localStorage.setItem(
          STORAGE_KEYS.LIVE_CATALOG,
          JSON.stringify({
            syncedAt: Date.now(),
            entries: nextEntries
          })
        );
      } catch {
        // Ignore storage errors
      }
    }

    state.liveCatalogLastSyncedAt = Date.now();
    if (foundNew > 0) state.liveCatalogNewCount = foundNew;
    if (!silent) {
      const langCount = getMatrixLanguages().length;
      const standaloneCount = (state.catalogEntries || []).length;
      state.catalogStatus = `Live catalog synced: ${langCount} languages (${langCount * Math.max(langCount - 1, 0)} pairs)${standaloneCount ? ` + ${standaloneCount} community courses` : ''}.`;
      showAudioToast(foundNew > 0 ? `Synced! ${foundNew} new course(s) available.` : 'Course catalog is up to date.');
    }
  } catch (err) {
    if (!silent) {
      state.catalogStatus = `Live catalog sync failed: ${err.message}`;
      showAudioToast('Could not reach GitHub — using offline course catalog.');
    }
  } finally {
    state.liveCatalogSyncing = false;
    if (
      !silent ||
      foundNew > 0 ||
      state.showAddCourseModal ||
      state.view === 'settings' ||
      state.view === 'studio' ||
      !state.enrolledCourseIds.length
    ) {
      render();
    }
  }
}

function getAvailableMatrixTargets(sourceCode, excludeEnrolled = false) {
  const langs = getMatrixLanguages();
  return langs.filter((l) => {
    if (l.code === sourceCode) return false;
    if (excludeEnrolled && state.enrolledCourseIds.includes(`${sourceCode}-${l.code}`)) return false;
    return true;
  });
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

async function enrollCourse(courseId, openPath = false) {
  state.loadingCourse = true;
  render();
  let target = null;
  try {
    target = await ensureCourseLoaded(courseId);
  } catch (err) {
    state.profileMessage = `Could not load course ${courseId}: ${err.message}`;
    state.loadingCourse = false;
    render();
    return;
  }
  state.loadingCourse = false;
  if (!target) {
    render();
    return;
  }
  if (!state.enrolledCourseIds.includes(courseId)) {
    state.enrolledCourseIds = [...state.enrolledCourseIds, courseId];
  }
  if (openPath || !state.activeCourseId || !state.enrolledCourseIds.includes(state.activeCourseId)) {
    state.activeCourseId = courseId;
    state.selectedSectionId = 'all';
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
    state.selectedSectionId = 'all';
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
  const isLight = effective === 'light';
  document.documentElement.classList.toggle('theme-light', isLight);
  document.body.classList.toggle('theme-light', isLight);
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', isLight ? '#f5f3ff' : '#121024');
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

function getAppIconSrc(idOrGlyph = state.profile?.appIcon || DEFAULT_APP_ICON_ID) {
  return getAppIconDataUrl(idOrGlyph);
}

function applyAppIcon({ syncNative = false } = {}) {
  const preset = applyDocumentAppIcon(state.profile?.appIcon || DEFAULT_APP_ICON_ID, { syncNative });
  state.profile.appIcon = preset.id;
  return preset;
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
  return 'Polygot Learner';
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
    .join('') || 'PG';

  if (customPic) {
    return `<div class="avatar-circle ${sizeClass}"><img src="${escapeHtml(customPic)}" alt="${escapeHtml(name)}" /></div>`;
  }
  if (customEmoji) {
    const emojiPreset = findPresetByGlyph(customEmoji);
    if (emojiPreset?.customImage) {
      return `<div class="avatar-circle ${sizeClass}"><img src="${escapeHtml(emojiPreset.customImage)}" alt="${escapeHtml(emojiPreset.label)}" /></div>`;
    }
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
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal && /Windows/i.test(ua)) return 'Windows Desktop';
  if (isLocal && /Linux/i.test(ua) && !/Android/i.test(ua)) return 'Linux Desktop';
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
    if (
      typeof window !== 'undefined' &&
      window.AndroidAppIcon &&
      typeof window.AndroidAppIcon.getAppIcon === 'function'
    ) {
      const nativeIcon = String(window.AndroidAppIcon.getAppIcon() || '').trim();
      if (nativeIcon) {
        const nativePreset = getAppIconPreset(nativeIcon);
        if (state.profile.appIcon !== nativePreset.id) {
          state.profile.appIcon = nativePreset.id;
          localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(state.profile));
        }
      }
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
  applyAppIcon({ syncNative: false });
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
    const txt = existing.querySelector('.toast-text');
    if (txt) txt.textContent = msg;
    else existing.textContent = msg;
    existing.style.display = 'inline-flex';
  } else {
    render();
  }
  toastTimer = setTimeout(() => {
    state.audioToast = '';
    const el = document.getElementById('audio-toast');
    if (el) el.style.display = 'none';
  }, 2600);
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

function resolveScriptTab(scriptSet, tabId) {
  if (!tabId || tabId === '__all__') {
    const rows = scriptSet.tabs.flatMap((t) => t.rows);
    return {
      id: '__all__',
      label: 'All Characters',
      note: scriptSet.subtitle || '',
      rows
    };
  }
  return scriptSet.tabs.find((t) => t.id === tabId) || scriptSet.tabs[0];
}

function getUniqueTabChars(tab) {
  const seen = new Set();
  const out = [];
  for (const row of tab.rows || []) {
    for (const ch of row.chars || []) {
      if (!seen.has(ch.glyph)) {
        seen.add(ch.glyph);
        out.push(ch);
      }
    }
  }
  return out;
}

/* ---------- Script / Character Drill ---------- */
function startScriptDrill(scriptSet, tabId) {
  const tab = resolveScriptTab(scriptSet, tabId);
  const allChars = getUniqueTabChars(tab);
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

  const exercises = generateLessonExercises(
    lesson,
    sameTierItems,
    course.sourceLang?.localizedName || course.sourceLang?.name || 'English',
    course.i18n?.ui || {}
  );
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
    app: 'Polygot',
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
    courseReviews: getLocalCourseReviews(),
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
  return 'PG1:' + btoa(binary);
}

function decodeBackupInput(rawInput) {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) throw new Error('Backup text is empty.');
  if (trimmed.startsWith('PG1:') || trimmed.startsWith('OL1:')) {
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
    throw new Error('Not a valid Polygot backup file or code.');
  }

  if (data.courseReviews && typeof data.courseReviews === 'object') {
    mergeReviewsFromCloud(data.courseReviews);
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
    const prevAppIcon = state.profile.appIcon || DEFAULT_APP_ICON_ID;
    state.profile = { ...state.profile, ...data.profile };
    const nextAppIcon = getAppIconPreset(state.profile.appIcon).id;
    state.profile.appIcon = nextAppIcon;
    applyAppIcon({ syncNative: nextAppIcon !== prevAppIcon });
  }
  if (typeof data.showRomaji === 'boolean') state.showRomaji = data.showRomaji;
  if (typeof data.audioRate === 'number') state.audioRate = data.audioRate;
  if (typeof data.autoSync === 'boolean') state.autoSync = data.autoSync;
  if (Array.isArray(data.enrolledCourseIds)) {
    state.enrolledCourseIds = data.enrolledCourseIds.filter(
      (id) => state.courses.some((c) => c.id === id) || Boolean(parseMatrixCourseId(id))
    );
  } else {
    const inferred = new Set();
    Object.keys(state.progress.completedLessons || {}).forEach((k) => {
      const cid = k.split(':')[0];
      if (cid && (state.courses.some((c) => c.id === cid) || parseMatrixCourseId(cid))) inferred.add(cid);
    });
    if (data.activeCourseId && (state.courses.some((c) => c.id === data.activeCourseId) || parseMatrixCourseId(data.activeCourseId))) {
      inferred.add(data.activeCourseId);
    }
    if (inferred.size > 0) state.enrolledCourseIds = [...inferred];
  }
  if (data.activeCourseId && state.enrolledCourseIds.includes(data.activeCourseId)) {
    state.activeCourseId = data.activeCourseId;
  } else {
    state.activeCourseId = state.enrolledCourseIds[0] || '';
  }

  // Ensure any matrix courses from the backup are synthesized into memory
  Promise.all(state.enrolledCourseIds.map((id) => ensureCourseLoaded(id).catch(() => null))).then(() => {
    const act = getActiveCourse();
    if (act) state.selectedSectionId = 'all';
    render();
  });

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
        const syncEl = document.getElementById('sync-status-label');
        if (syncEl) syncEl.innerHTML = `${uiIcon('cloud', 14)} Last synced: ${escapeHtml(formatLastSynced(true))}`;
        const mobSyncEl = document.getElementById('mobile-sync-strip');
        if (mobSyncEl) mobSyncEl.innerHTML = `${uiIcon('cloud', 14)} Last synced: ${escapeHtml(formatLastSynced(false))}`;
      })
      .catch(() => {
        // Silent background fallback if temporarily offline; local progress is safe
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
    } catch {
      if (state.progress.xp > 0 || Object.keys(state.progress.completedLessons || {}).length > 0) {
        const res = await backupToGoogleDrive(buildBackupPayload()).catch(() => null);
        if (res) recordSyncTimestamp('Google Drive', res.savedAt);
      }
      state.backupMessage = `Signed in as ${session.user?.email || session.user?.name || 'Google user'}. Auto-sync to Google Drive is active!`;
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
        <img src="${escapeHtml(getAppIconSrc())}" alt="Polygot" style="width:82px;height:82px;border-radius:50%;margin:0 auto 14px;display:block;" />
        <h1 style="margin:0;font-size:32px;font-weight:700;">Polygot</h1>
        <p style="margin:8px 0 0;font-size:15px;color:var(--text-muted);">
          Free &amp; open-source language learning. Sign in with Google to sync your progress privately across desktop, web, and Android via your own Google Drive.
        </p>

        <div class="auth-pills">
          <span class="pill accent">13 Languages</span>
          <span class="pill accent">156 Language Pairs</span>
          <span class="pill accent">Beginner → Mastery</span>
        </div>

        ${state.authError ? `<div class="draw-feedback retry" style="max-width:none;margin-bottom:14px;">${escapeHtml(state.authError)}</div>` : ''}

        <button class="google-btn" id="gate-google-signin-btn" ${state.googleBusy ? 'disabled' : ''}>
          ${googleLogoSvg}
          <span>${state.googleBusy ? 'Signing in & syncing...' : 'Continue with Google'}</span>
        </button>

        <button class="auth-skip-btn" id="gate-continue-offline-btn">
          Continue offline without signing in →
        </button>

        <div style="margin-top:18px;font-size:11px;color:var(--text-muted);line-height:1.6;">
          Zero servers · Your progress stays privately in your own Google Drive AppData &amp; device.<br />
          <a href="./privacy.html" target="_blank" rel="noopener noreferrer" style="color:var(--accent-text);text-decoration:underline;">Privacy Policy</a>
          &nbsp;·&nbsp;
          <a href="https://github.com/${escapeHtml(APP_CONFIG.githubRepo)}" target="_blank" rel="noopener noreferrer" style="color:var(--text-muted);text-decoration:underline;">GitHub</a>
          &nbsp;·&nbsp;
          <a href="${escapeHtml(APP_CONFIG.discordUrl)}" target="_blank" rel="noopener noreferrer" style="color:var(--text-muted);text-decoration:underline;">Discord</a>
        </div>
      </div>
    </div>
  `;
}

function renderCourseOnboarding() {
  const googleSession = getGoogleSession();
  const greetingName = getDisplayName();
  const langs = getMatrixLanguages();
  const srcMeta = langs.find((l) => l.code === state.pickerSourceLang) || langs[0];
  const targets = getAvailableMatrixTargets(srcMeta?.code || 'en', false);

  return `
    <div class="auth-screen">
      <div class="onboarding-card">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <img src="${escapeHtml(getAppIconSrc())}" alt="Polygot" style="width:50px;height:50px;border-radius:50%;display:block;" />
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--accent-text);text-transform:uppercase;letter-spacing:0.05em;">Welcome, ${escapeHtml(greetingName)}</div>
            <h1 style="margin:0;font-size:24px;font-weight:700;">Pick a course to start</h1>
          </div>
        </div>
        <p style="margin:6px 0 14px;font-size:14px;color:var(--text-muted);">
          Choose the language you speak and any language you want to learn (156 pairs · Beginner to Mastery). You can add more anytime from your <strong>Profile</strong>.
        </p>

        <div style="margin-bottom:14px;">
          <label class="field-label" for="onboarding-source-lang">I speak</label>
          ${renderCustomSelect({
            id: 'onboarding-source-lang',
            className: 'course-picker',
            ariaLabel: 'Language you speak',
            value: srcMeta?.code || 'en',
            options: langs.map((l) => ({ value: l.code, label: `${l.name} (${l.nativeName})` }))
          })}
        </div>

        <label class="field-label">I want to learn</label>
        <div class="onboarding-course-grid" style="max-height:370px;overflow-y:auto;padding-right:4px;margin-top:8px;">
          ${targets
            .map((t) => {
              const pairId = `${srcMeta.code}-${t.code}`;
              const lvlRange = `${t.levelLabels[0]} → ${t.levelLabels[t.levelLabels.length - 1]}`;
              return `
                <button type="button" class="onboarding-course-btn" data-onboarding-pick="${escapeHtml(pairId)}" ${state.loadingCourse ? 'disabled' : ''}>
                  <div style="display:flex;align-items:center;gap:14px;min-width:0;">
                    <span class="lang-badge">${escapeHtml(t.code.toUpperCase())}</span>
                    <div style="min-width:0;">
                      <div style="font-size:17px;font-weight:700;font-family:var(--font-display);">
                        ${escapeHtml(srcMeta.name)} → ${escapeHtml(t.name)}
                        <span style="color:var(--accent-text);margin-left:4px;">(${escapeHtml(t.nativeName)})</span>
                      </div>
                      <div style="font-size:13px;color:var(--text-muted);margin-top:3px;">
                        ${escapeHtml(lvlRange)} · 25 units · 375 items
                      </div>
                    </div>
                  </div>
                  <span class="pill accent">${state.loadingCourse ? 'Loading...' : `Start ${uiIcon('arrowRight', 15)}`}</span>
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
          <img src="${escapeHtml(getAppIconSrc())}" alt="Polygot" style="width:38px;height:38px;border-radius:50%;display:block;" />
          <div>
            <div class="brand-name">Polygot</div>
            <div class="brand-tag">v${escapeHtml(APP_CONFIG.appVersion)}</div>
          </div>
        </div>
        <button class="icon-btn" data-toggle-theme title="Cycle theme (${escapeHtml(state.theme)})">${getThemeIcon()}</button>
      </div>

      ${renderCustomSelect({
        id: 'course-select',
        className: 'course-picker',
        ariaLabel: 'Select active course',
        value: course.id,
        options: [
          ...getEnrolledCourses().map((c) => ({
            value: c.id,
            label: `${c.sourceLang.name} → ${c.targetLang.name}`
          })),
          { value: '__add__', label: '+ Add course (Profile)...' }
        ]
      })}

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
        <button class="nav-btn ${state.view === 'profile' ? 'active' : ''}" data-nav="profile">
          ${uiIcon('user', 22)} <span>Profile</span>
        </button>
        <button class="nav-btn ${state.view === 'settings' || state.view === 'studio' || state.view === 'backup' ? 'active' : ''}" data-nav="settings">
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
        <img src="${escapeHtml(getAppIconSrc())}" alt="Polygot" style="width:28px;height:28px;border-radius:50%;display:block;" />
        ${renderCustomSelect({
          id: 'mobile-course-select',
          className: 'course-picker mobile-course-picker',
          ariaLabel: 'Select active course',
          value: course.id,
          options: [
            ...getEnrolledCourses().map((c) => ({
              value: c.id,
              label: getCourseFlag(c)
            })),
            { value: '__add__', label: '+ Add Course...' }
          ]
        })}
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
    state.selectedSectionId = 'all';
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
          ? renderCustomSelect({
              id: 'section-select',
              className: 'level-select',
              ariaLabel: 'Select level',
              value: state.selectedSectionId,
              options: [
                {
                  value: 'all',
                  label: `${tCourse(course, 'allLevels')} (${sections[0].jlptLevel} → ${sections[sections.length - 1].jlptLevel})`
                },
                ...sections.map((sec) => {
                  const secLessons = sec.units.flatMap((u) => u.lessons);
                  const secDone = secLessons.filter((l) => state.progress.completedLessons[`${course.id}:${l.id}`]).length;
                  return {
                    value: sec.id,
                    label: `${sec.jlptLevel} · ${sec.tier} (${secDone}/${secLessons.length})`
                  };
                })
              ]
            })
          : ''
      }
    </div>

    ${visibleSections
      .map((sec) => {
        return sec.units
          .map((unit, uIdx) => {
            const unlocked = isUnitUnlocked(course, unit, statusByKey);
            const completed = isUnitCompleted(course, unit);
            const unitColor = getUnitSolidColor(unit.color || sec.color);
            const doneInUnit = unit.lessons.filter((l) => state.progress.completedLessons[`${course.id}:${l.id}`]).length;

            const sDir = course.sourceLang?.dir === 'rtl' ? 'rtl' : 'ltr';
            return `
            <section class="unit-section" dir="${sDir}">
              <div class="unit-banner ${unlocked ? '' : 'locked-banner'}" style="background:${escapeHtml(unitColor)};">
                <div>
                  <div class="unit-kicker">${escapeHtml(sec.jlptLevel)} · ${escapeHtml(tCourse(course, 'unit'))} ${uIdx + 1} · ${doneInUnit}/${unit.lessons.length} ${escapeHtml(tCourse(course, 'complete'))}</div>
                  <h3 class="unit-banner-title">${escapeHtml(unit.title)}</h3>
                  <p class="unit-banner-sub">${escapeHtml(unit.subtitle || '')}</p>
                </div>
                <div class="unit-banner-actions">
                  <button class="banner-btn" data-guidebook="${escapeHtml(unit.id)}">${uiIcon('book', 18)} ${escapeHtml(tCourse(course, 'guidebook'))}</button>
                  ${
                    !unlocked
                      ? `<button class="banner-btn" data-jump-quiz="${escapeHtml(unit.id)}">${uiIcon('target', 18)} ${escapeHtml(tCourse(course, 'jumpHere'))}</button>`
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
                    <div class="path-node-wrap ${offsetClass}" ${status === 'current' ? 'id="active-lesson-node" data-active-lesson="true"' : ''}>
                      ${status === 'current' ? `<div class="path-start-bubble">${escapeHtml(tCourse(course, 'start'))}</div>` : ''}
                      <button
                        class="lesson-node status-${status}"
                        style="--node-color:${escapeHtml(unitColor)}"
                        ${status === 'locked' ? `disabled title="${escapeHtml(tCourse(course, 'locked'))}"` : `data-open-sheet="${escapeHtml(unit.id)}|${escapeHtml(lesson.id)}"`}
                      >${icon}</button>
                      <div class="node-label">
                        <div class="node-title">${escapeHtml(lesson.title)}</div>
                        <div class="node-meta">${status === 'completed' ? escapeHtml(tCourse(course, 'completedTap')) : status === 'locked' ? escapeHtml(tCourse(course, 'locked')) : escapeHtml(tCourse(course, 'itemsReady', { n: lesson.items.length }))}</div>
                      </div>
                    </div>
                  `;
                  })
                  .join('')}

                <div class="path-node-wrap">
                  <div class="trophy-node ${completed ? 'earned' : ''}" title="${escapeHtml(tCourse(course, 'unitTrophy'))}">${uiIcon('trophy', 36)}</div>
                  <div class="node-label">
                    <div class="node-meta">${completed ? escapeHtml(tCourse(course, 'unitMastered')) : escapeHtml(tCourse(course, 'unitTrophy'))}</div>
                  </div>
                </div>
              </div>
            </section>
          `;
          })
          .join('');
      })
      .join('')}
    <button type="button" id="jump-active-lesson-btn" class="jump-lesson-btn" aria-label="Jump to active lesson"></button>
  `;
}

function openDrawSession(scriptSet, tabId, startGlyph = null) {
  const tab = resolveScriptTab(scriptSet, tabId);
  const chars = getUniqueTabChars(tab);
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
  const tab = resolveScriptTab(scriptSet, tabId);
  const chars = getUniqueTabChars(tab);
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
  if (
    !state.activeScriptTab ||
    (state.activeScriptTab !== '__all__' && !scriptSet.tabs.some((t) => t.id === state.activeScriptTab))
  ) {
    state.activeScriptTab = '__all__';
  }
  const activeTab = resolveScriptTab(scriptSet, state.activeScriptTab);

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
            ? `<div class="draw-feedback ${ds.result.passed ? 'pass' : (ds.result.score >= 45 ? 'warn' : 'retry')}">${escapeHtml(ds.result.feedback)}</div>`
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
          <div style="color:var(--gold);margin-bottom:10px;">${uiIcon('trophy', 52)}</div>
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
      <div class="drill-topbar">
        <button class="icon-btn drill-exit-btn" id="close-script-drill" title="Exit drill" aria-label="Exit drill">${uiIcon('x', 18)}</button>
        <div class="progress-track drill-progress"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span class="hud-chip" style="color:var(--accent-text);">${d.index + 1}/${d.questions.length}</span>
      </div>
      <div class="drill-meta-line">
        <span>${escapeHtml(d.tabLabel)}</span>
        <span>${d.index + 1} / ${d.questions.length}</span>
      </div>
      <section class="card drill-card">
        <div class="drill-prompt-head">
          <span class="pill">${escapeHtml(q.promptLabel)}</span>
          <button class="btn btn-sm" data-speak-locale="${escapeHtml(d.speechLocale)}" data-speak="${escapeHtml(q.ch.glyph)}">${uiIcon('volume', 16)} ${escapeHtml(tCourse(course, 'listen'))}</button>
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
          <div id="drill-feedback-box" class="drill-feedback ${d.wasCorrect ? 'is-correct' : 'is-wrong'}">
            <div class="drill-feedback-row">
              <span class="drill-feedback-badge" aria-hidden="true">${uiIcon(d.wasCorrect ? 'check' : 'x', 16)}</span>
              <div class="drill-feedback-text">
                <div class="drill-feedback-main">${escapeHtml(q.ch.glyph)} = ${escapeHtml(q.ch.romaji)}</div>
              </div>
            </div>
            <button class="btn ${d.wasCorrect ? 'btn-success' : 'btn-danger'} btn-sm" id="next-script-q">${escapeHtml(tCourse(course, 'continueBtn'))} ${uiIcon('arrowRight', 16)}</button>
          </div>
        `
            : ''
        }
      </section>
    `;
  }

  const allTabChars = getUniqueTabChars(activeTab);
  const allScriptChars = getUniqueTabChars(resolveScriptTab(scriptSet, '__all__'));
  const masteredCount = allTabChars.filter((c) => (state.progress.charMastery[c.glyph] || 0) >= 3).length;

  return `
    <div class="char-top-bar">
      ${renderCustomSelect({
        id: 'script-tab-select',
        className: 'level-select char-tab-select',
        ariaLabel: 'Select character set',
        value: activeTab.id,
        options: [
          { value: '__all__', label: `All Characters (${allScriptChars.length})` },
          ...scriptSet.tabs.map((t) => ({
            value: t.id,
            label: t.label
          }))
        ]
      })}
      <div class="char-top-actions">
        <span class="pill accent char-mastery-pill">${masteredCount}/${allTabChars.length}</span>
        ${renderCustomSelect({
          id: 'script-practice-select',
          className: 'level-select char-practice-select',
          ariaLabel: 'Practice options',
          value: '__prompt__',
          options: [
            { value: '__prompt__', label: 'Practice', hidden: true },
            { value: 'trace', label: 'Trace & Draw Characters' },
            { value: 'write-test', label: 'Random Write Test (5)' },
            { value: 'word-write', label: 'Words & Sentences Pad' },
            { value: 'quiz', label: 'Quick Recognition Quiz' }
          ]
        })}
      </div>
    </div>

    <section class="card char-chart-card">
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
  const tDir = course.targetLang?.dir === 'rtl' ? 'rtl' : 'ltr';
  const sDir = course.sourceLang?.dir === 'rtl' ? 'rtl' : 'ltr';

  return `
    <div class="drill-topbar">
      <button class="icon-btn drill-exit-btn" data-nav="syllabus" title="Cancel" aria-label="Cancel">${uiIcon('x', 18)}</button>
      <div class="progress-track drill-progress"><div class="progress-fill" style="width:${pct}%"></div></div>
      <span class="hud-chip" style="color:var(--accent-text);">${p.index + 1}/${p.questions.length}</span>
    </div>
    <div class="drill-meta-line">
      <span>Placement: ${escapeHtml(p.unit.title)}</span>
      <span>Score 80%+ to unlock</span>
    </div>

    <section class="card drill-card">
      <div class="drill-prompt-head">
        <span class="pill">${escapeHtml(q.promptLabel)}</span>
        ${!q.reverse ? `<button class="btn btn-sm" data-speak="${escapeHtml(q.item.term)}">${uiIcon('volume', 16)} Audio</button>` : ''}
      </div>
      <div class="prompt-main" dir="${q.reverse ? sDir : tDir}">${escapeHtml(q.promptMain)}</div>
      ${q.promptSub ? `<div class="prompt-sub" dir="${q.reverse ? sDir : tDir}">${escapeHtml(q.promptSub)}</div>` : ''}

      <div class="options-grid">
        ${q.options
          .map((opt) => {
            let cls = 'option-btn';
            if (p.answered) {
              if (opt.id === q.correctId) cls += ' correct';
              else if (opt.id === p.selectedId) cls += ' wrong';
            }
            return `
            <button class="${cls}" dir="${q.reverse ? tDir : sDir}" data-place-opt="${escapeHtml(opt.id)}" ${p.answered ? 'disabled' : ''}>
              <span>${escapeHtml(opt.label)}</span>
              ${state.showRomaji && opt.sub ? `<span class="option-sub">${escapeHtml(opt.sub)}</span>` : ''}
            </button>
          `;
          })
          .join('')}
      </div>

      ${
        p.answered
          ? `
        <div id="drill-feedback-box" class="drill-feedback ${p.wasCorrect ? 'is-correct' : 'is-wrong'}">
          <div class="drill-feedback-row">
            <span class="drill-feedback-badge" aria-hidden="true">${uiIcon(p.wasCorrect ? 'check' : 'x', 16)}</span>
            <div class="drill-feedback-text">
              <div class="drill-feedback-main"><span dir="${tDir}">${escapeHtml(q.item.term)}</span> — <span dir="${sDir}">${escapeHtml(q.item.translation)}</span></div>
            </div>
          </div>
          <button class="btn ${p.wasCorrect ? 'btn-success' : 'btn-danger'} btn-sm" id="next-place-btn">${escapeHtml(tCourse(course, 'continueBtn'))} ${uiIcon('arrowRight', 16)}</button>
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
  const tDir = course.targetLang?.dir === 'rtl' ? 'rtl' : 'ltr';

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
          <button class="btn btn-primary btn-sm" data-start-lesson="${escapeHtml(unit.id)}|${escapeHtml(lesson.id)}">${uiIcon('play', 15)} Practice Lesson</button>
        </div>
        ${lesson.grammarNote ? `<div class="grammar-box"><strong>Grammar Tip:</strong> ${escapeHtml(lesson.grammarNote)}</div>` : ''}
        <div style="display:grid;gap:10px;">
          ${lesson.items
            .map(
              (item) => `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;background:var(--surface-elevated);border:2px solid var(--border);border-radius:14px;">
              <div style="min-width:0;flex:1;">
                <div dir="${tDir}" style="font-size:19px;font-weight:700;">${escapeHtml(item.term)} ${item.reading && item.reading !== item.term ? `<span style="font-size:13px;color:var(--accent-text);font-weight:600;">(${escapeHtml(item.reading)})</span>` : ''}</div>
                ${state.showRomaji && item.transliteration ? `<div style="font-size:13px;color:var(--text-muted);">${escapeHtml(item.transliteration)}</div>` : ''}
                <div style="font-size:14px;font-weight:700;margin-top:2px;">${escapeHtml(item.translation)}</div>
                ${item.example?.term ? `<div dir="${tDir}" style="font-size:13px;color:var(--text-muted);margin-top:4px;">${escapeHtml(item.example.term)} — ${escapeHtml(item.example.translation)}</div>` : ''}
              </div>
              <button class="btn btn-sm" data-speak="${escapeHtml(item.term)}" aria-label="Listen">${uiIcon('volume', 17)}</button>
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
  const tDir = course.targetLang?.dir === 'rtl' ? 'rtl' : 'ltr';
  const sDir = course.sourceLang?.dir === 'rtl' ? 'rtl' : 'ltr';

  if (session.showIntro) {
    return `
      ${renderHudBar(course)}
      <div class="header-bar" dir="${sDir}">
        <div>
          <span class="pill accent">${escapeHtml(session.unit.cefrLevel || 'Lesson')}</span>
          <h1 class="page-title" style="margin-top:6px;">${escapeHtml(session.lesson.title)}</h1>
          <p class="page-sub">${escapeHtml(session.unit.title)} · ${escapeHtml(tCourse(course, 'itemsReady', { n: session.lesson.items.length }))}</p>
        </div>
        <button class="btn btn-sm" data-nav="syllabus">${escapeHtml(tCourse(course, 'backToPath'))}</button>
      </div>

      ${session.lesson.grammarNote ? `<div class="grammar-box" dir="${sDir}"><strong>${escapeHtml(tCourse(course, 'grammarNote'))}:</strong> ${escapeHtml(session.lesson.grammarNote)}</div>` : ''}

      <section class="card">
        <h3 style="margin-top:0;" dir="${sDir}">${escapeHtml(tCourse(course, 'keyVocab'))}</h3>
        <div style="display:grid;gap:10px;margin-bottom:18px;">
          ${session.lesson.items
            .map(
              (item) => `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;background:var(--surface-elevated);border:2px solid var(--border);border-radius:14px;">
              <div style="min-width:0;flex:1;">
                <div dir="${tDir}" style="font-size:20px;font-weight:700;">${escapeHtml(item.term)} ${item.reading && item.reading !== item.term ? `<span style="font-size:13px;color:var(--accent-text);font-weight:600;">(${escapeHtml(item.reading)})</span>` : ''}</div>
                ${state.showRomaji && item.transliteration ? `<div style="font-size:13px;color:var(--accent-text);">${escapeHtml(item.transliteration)}</div>` : ''}
                <div dir="${sDir}" style="font-size:14px;color:var(--text-muted);">${escapeHtml(item.translation)}</div>
              </div>
              <button class="btn btn-sm" data-speak="${escapeHtml(item.term)}">${uiIcon('volume', 16)} ${escapeHtml(tCourse(course, 'listen'))}</button>
            </div>
          `
            )
            .join('')}
        </div>
        <button class="btn btn-primary" id="begin-drills-btn">${escapeHtml(tCourse(course, 'beginDrills', { n: session.exercises.length }))} ${uiIcon('arrowRight', 18)}</button>
      </section>
    `;
  }

  if (session.index >= session.exercises.length) {
    const accuracy = Math.round((session.correctCount / session.exercises.length) * 100);
    return `
      ${renderHudBar(course)}
      <section class="card" style="text-align:center;padding:40px 24px;" dir="${sDir}">
        <div style="color:var(--gold);margin-bottom:10px;">${uiIcon('trophy', 56)}</div>
        <h1 class="page-title">${escapeHtml(tCourse(course, 'lessonComplete'))}</h1>
        <p class="page-sub">${escapeHtml(session.lesson.title)} · ${escapeHtml(tCourse(course, 'accuracyXp', { acc: accuracy }))}</p>
        <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:20px;">
          <button class="btn btn-primary" data-nav="syllabus">${escapeHtml(tCourse(course, 'continuePath'))} ${uiIcon('arrowRight', 18)}</button>
          <button class="btn" data-nav="flashcards">${escapeHtml(tCourse(course, 'reviewFlashcards'))}</button>
        </div>
      </section>
    `;
  }

  const ex = session.exercises[session.index];
  const pct = Math.round((session.index / session.exercises.length) * 100);
  const promptDir = ex.type === 'mc-to-source' ? tDir : sDir;
  const optionDir = ex.type === 'mc-to-source' ? sDir : tDir;

  return `
    <div class="drill-topbar">
      <button class="icon-btn drill-exit-btn" data-nav="syllabus" title="Exit" aria-label="Exit">${uiIcon('x', 18)}</button>
      <div class="progress-track drill-progress"><div class="progress-fill" style="width:${pct}%"></div></div>
      <span class="hud-chip" style="color:#f43f5e;">${uiIcon('heart', 16)} ${state.progress.chillMode ? '∞' : `${state.progress.hearts}/5`}</span>
    </div>
    <div class="drill-meta-line" dir="${sDir}">
      <span>${escapeHtml(session.lesson.title)}</span>
      <span>${escapeHtml(tCourse(course, 'exerciseOf', { i: session.index + 1, n: session.exercises.length }))}</span>
    </div>

    <section class="card drill-card">
      <div class="drill-prompt-head">
        <span class="pill" dir="${sDir}">${escapeHtml(ex.promptLabel)}</span>
        ${ex.type === 'mc-to-source' ? `<button class="btn btn-sm" data-speak="${escapeHtml(ex.item.term)}">${uiIcon('volume', 16)} ${escapeHtml(tCourse(course, 'audio'))}</button>` : ''}
      </div>

      <div class="prompt-main" dir="${promptDir}">${escapeHtml(ex.promptMain)}</div>
      ${ex.promptSub ? `<div class="prompt-sub" dir="${promptDir}">${escapeHtml(ex.promptSub)}</div>` : ''}
      ${state.showRomaji && ex.type === 'mc-to-source' && ex.promptHint ? `<div class="prompt-hint">${escapeHtml(ex.promptHint)}</div>` : ''}

      ${
        ex.type === 'type-recall'
          ? `
        <form id="type-answer-form" style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
          <input class="input" id="type-answer-input" dir="${tDir}" placeholder="${escapeHtml(tCourse(course, 'typePlaceholder', { lang: course.targetLang.localizedName || course.targetLang.name }))}" value="${escapeHtml(session.typedValue)}" ${session.answered ? 'disabled' : ''} autocomplete="off" />
          ${!session.answered ? `<button class="btn btn-primary" type="submit">${escapeHtml(tCourse(course, 'checkAnswer'))}</button>` : ''}
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
              <button class="${cls}" dir="${optionDir}" data-option-id="${escapeHtml(opt.id)}" ${session.answered ? 'disabled' : ''}>
                <span>${escapeHtml(opt.label)}</span>
                ${state.showRomaji && opt.sub ? `<span class="option-sub">${escapeHtml(opt.sub)}</span>` : ''}
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
        <div id="drill-feedback-box" class="drill-feedback ${session.wasCorrect ? 'is-correct' : 'is-wrong'}" dir="${sDir}">
          <div class="drill-feedback-row">
            <span class="drill-feedback-badge" aria-hidden="true">${uiIcon(session.wasCorrect ? 'check' : 'x', 16)}</span>
            <div class="drill-feedback-text">
              <div class="drill-feedback-main">
                <span dir="${tDir}">${escapeHtml(ex.item.term)}</span> ${ex.item.transliteration ? `<span style="opacity:0.8;">(${escapeHtml(ex.item.transliteration)})</span>` : ''} — <span dir="${sDir}">${escapeHtml(ex.item.translation)}</span>
              </div>
            </div>
          </div>
          <button class="btn ${session.wasCorrect ? 'btn-success' : 'btn-danger'} btn-sm" id="next-exercise-btn">${escapeHtml(tCourse(course, 'continueBtn'))} ${uiIcon('arrowRight', 16)}</button>
        </div>
      `
          : ''
      }
    </section>
  `;
}

function renderFlashcardsView(course) {
  const { queue, index, flipped } = state.flashcardSession;
  const item = queue[index];

  if (!item) {
    return `
      ${renderHudBar(course)}
      <div class="header-bar">
        <div>
          <h1 class="page-title">${escapeHtml(tCourse(course, 'reviewFlashcards'))}</h1>
          <p class="page-sub">${escapeHtml(course.title)}</p>
        </div>
      </div>
      <section class="card" style="text-align:center;padding:36px 24px;">
        <div style="color:var(--accent-text);margin-bottom:10px;">${uiIcon('trophy', 48)}</div>
        <h2>Review Session Complete</h2>
        <p class="page-sub">All queued flashcards reviewed and scheduled by permanent item ID.</p>
        <div style="margin-top:18px;">
          <button class="btn btn-primary" id="restart-flashcards-btn">Review Full Deck</button>
        </div>
      </section>
    `;
  }

  const tDir = course.targetLang?.dir === 'rtl' ? 'rtl' : 'ltr';
  const sDir = course.sourceLang?.dir === 'rtl' ? 'rtl' : 'ltr';

  return `
    ${renderHudBar(course)}
    <div class="header-bar">
      <div>
        <h1 class="page-title">${escapeHtml(tCourse(course, 'reviewFlashcards'))}</h1>
        <p class="page-sub">${index + 1} / ${queue.length} · Tap card to flip · Swipe left or right</p>
      </div>
      <button class="btn btn-sm" data-speak="${escapeHtml(item.term)}">${uiIcon('volume', 16)} ${escapeHtml(tCourse(course, 'pronounce'))}</button>
    </div>

    <div class="flashcard-deck-wrap">
      <div class="flashcard-stage">
        <div class="flashcard-swipe-wrap" id="flashcard-swipe-wrap">
          <div class="flashcard-swipe-badge right" id="swipe-badge-right">Got it →</div>
          <div class="flashcard-swipe-badge left" id="swipe-badge-left">← Again</div>

          <div class="flashcard-3d ${flipped ? 'is-flipped' : ''}" id="flashcard-box" role="button" tabindex="0" aria-label="Flip flashcard">
            <div class="flashcard-face flashcard-front">
              <div class="prompt-main" dir="${tDir}">${escapeHtml(item.term)}</div>
              ${item.reading && item.reading !== item.term ? `<div class="prompt-sub" dir="${tDir}">${escapeHtml(item.reading)}</div>` : ''}
              ${state.showRomaji && item.transliteration ? `<div class="prompt-hint">${escapeHtml(item.transliteration)}</div>` : ''}
              <div class="flashcard-tap-hint">${uiIcon('rotate', 15)} ${escapeHtml(tCourse(course, 'tapToFlip'))}</div>
            </div>

            <div class="flashcard-face flashcard-back">
              <div class="flashcard-answer" dir="${sDir}">${escapeHtml(item.translation)}</div>
              <div class="flashcard-term-recap" dir="${tDir}">
                ${escapeHtml(item.term)}${state.showRomaji && item.transliteration ? ` · <span>${escapeHtml(item.transliteration)}</span>` : ''}
              </div>
              ${
                item.example && (item.example.term || item.example.translation)
                  ? `<div class="flashcard-example">
                      ${item.example.term ? `<div dir="${tDir}" style="font-weight:700;color:var(--text);">${escapeHtml(item.example.term)}</div>` : ''}
                      ${state.showRomaji && item.example.transliteration ? `<div style="color:var(--accent-text);font-size:12px;">${escapeHtml(item.example.transliteration)}</div>` : ''}
                      ${item.example.translation ? `<div dir="${sDir}">${escapeHtml(item.example.translation)}</div>` : ''}
                    </div>`
                  : ''
              }
              <div class="flashcard-tap-hint">${uiIcon('rotate', 15)} ${escapeHtml(tCourse(course, 'tapToFlipBack'))}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="flashcard-swipe-actions">
        <button type="button" class="swipe-act-btn left" id="flashcard-swipe-left-btn">${uiIcon('arrowLeft', 16)} Again</button>
        <button type="button" class="swipe-act-btn" id="flashcard-flip-btn" aria-label="Flip card">${uiIcon('rotate', 16)}</button>
        <button type="button" class="swipe-act-btn right" id="flashcard-swipe-right-btn">Next ${uiIcon('arrowRight', 16)}</button>
      </div>
      <div class="flashcard-swipe-hint-row">
        <span>← Swipe left to review again</span>
        <span>Swipe right for next →</span>
      </div>
    </div>
  `;
}

function renderStudioView(course) {
  const allUnits = getAllUnits(course);
  const matrixLangs = getMatrixLanguages();
  const pairCount = matrixLangs.length * Math.max(matrixLangs.length - 1, 0);
  const repoUrl = `https://github.com/${state.syncSettings.githubRepo}/tree/${state.syncSettings.githubBranch}/courses`;
  const guideUrl = `https://github.com/${state.syncSettings.githubRepo}/blob/${state.syncSettings.githubBranch}/CONTRIBUTING_COURSES.md`;
  const standaloneCatalog = state.catalogEntries || [];

  return `
    ${renderHudBar(course)}
    <div class="header-bar">
      <div>
        <h1 class="page-title">Course Studio</h1>
        <p class="page-sub">Sync community languages &amp; courses live from GitHub, draft custom courses, or export open JSON for PRs.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-sm" data-nav="settings">← Back to Settings</button>
        <button class="btn btn-sm" data-open-course-info="${escapeHtml(course.id)}">${uiIcon('star', 15)} Rate &amp; Reviews</button>
        <button class="btn btn-sm" data-share-course="${escapeHtml(course.id)}">${uiIcon('share', 15)} Share Course</button>
        <button class="btn btn-sm" id="export-course-btn">${uiIcon('download', 15)} Export Current JSON</button>
      </div>
    </div>

    ${state.studioMessage ? `<div class="grammar-box">${escapeHtml(state.studioMessage)}</div>` : ''}

    ${(() => {
      const meta = getCourseMeta(course);
      const rSum = getCourseRatingSummary(course.id);
      return `
        <section class="card" style="padding:14px 16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <div style="min-width:0;flex:1;">
              <div style="font-size:12px;font-weight:800;color:var(--accent-text);text-transform:uppercase;letter-spacing:0.04em;">Active Course · Share &amp; Community</div>
              <div style="font-weight:800;font-size:16px;margin-top:2px;">${escapeHtml(course.title)}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:3px;">
                Author: <strong>${escapeHtml(meta.author)}</strong>
                · Rating: <strong>${rSum.count ? `★ ${rSum.average.toFixed(1)} (${rSum.count})` : 'No ratings yet'}</strong>
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:6px;word-break:break-all;">
                Share link: <code style="color:var(--accent-text);">${escapeHtml(meta.shareUrl)}</code>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn btn-primary btn-sm" data-share-course="${escapeHtml(course.id)}">${uiIcon('copy', 14)} Copy Share Link</button>
              <button type="button" class="btn btn-sm" data-open-external="${escapeHtml(meta.discordChannelUrl)}">${uiIcon('discord', 15)} ${meta.hasDedicatedDiscord ? 'Course Channel' : 'Discord'}</button>
            </div>
          </div>
        </section>
      `;
    })()}

    <section class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
        <div>
          <h3 style="margin:0;">${uiIcon('globe', 20)} GitHub Community Languages &amp; Courses</h3>
          <div style="font-size:12px;color:var(--text-muted);margin-top:3px;">
            Syncs <code>courses/matrix/syllabus.json</code> (${matrixLangs.length} languages · ${pairCount} pairs) and standalone courses in <code>courses/registry.json</code> directly from GitHub.
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" id="sync-github-catalog-btn" ${state.catalogLoading ? 'disabled' : ''}>
            ${uiIcon('refresh', 15)} ${state.catalogLoading ? 'Syncing...' : 'Sync from GitHub'}
          </button>
          <a class="btn btn-sm" href="${escapeHtml(guideUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">${uiIcon('book', 15)} Contribution Guide ↗</a>
          <a class="btn btn-sm" href="${escapeHtml(repoUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">${uiIcon('github', 15)} GitHub ↗</a>
          <a class="btn btn-sm" href="${escapeHtml(APP_CONFIG.discordUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">${uiIcon('discord', 15)} Discord ↗</a>
        </div>
      </div>

      <form id="github-repo-form" class="form-grid" style="margin-bottom:12px;">
        <div>
          <label class="field-label">GitHub Repository (owner/repo)</label>
          <input class="input" name="githubRepo" value="${escapeHtml(state.syncSettings.githubRepo)}" placeholder="mahesh-labs/polygot" required />
        </div>
        <div>
          <label class="field-label">Branch</label>
          <input class="input" name="githubBranch" value="${escapeHtml(state.syncSettings.githubBranch)}" placeholder="main" required />
        </div>
        <div style="display:flex;align-items:flex-end;">
          <button class="btn btn-sm" type="submit">Save Repo Source</button>
        </div>
      </form>

      ${state.catalogStatus ? `<div style="font-size:13px;color:var(--accent-text);margin-bottom:12px;font-weight:700;">${escapeHtml(state.catalogStatus)}</div>` : ''}

      <div style="margin-bottom:14px;">
        <div class="field-label" style="margin-bottom:8px;">Universal Matrix Languages (${matrixLangs.length} languages · ${pairCount} any-to-any pairs)</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${matrixLangs
            .map(
              (l) => `
              <span class="pill" style="display:inline-flex;align-items:center;gap:6px;">
                <strong style="color:var(--accent-text);">${escapeHtml(l.icon?.glyph || l.code.toUpperCase())}</strong>
                ${escapeHtml(l.name)} <span style="opacity:0.75;">(${escapeHtml(l.nativeName)})</span>
              </span>
            `
            )
            .join('')}
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">
          Enroll in any of the ${pairCount} pairs anytime: <button type="button" class="btn btn-sm" data-open-add-course="true" style="padding:3px 9px;font-size:12px;margin-left:4px;">${uiIcon('plus', 13)} Add Course</button>
        </div>
      </div>

      ${
        standaloneCatalog.length
          ? `
        <div class="field-label" style="margin-bottom:8px;">Community Standalone Courses (${standaloneCatalog.length})</div>
        <div style="display:grid;gap:10px;">
          ${standaloneCatalog
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
              <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:12px;border-radius:12px;background:var(--surface-elevated);border:2px solid var(--border);">
                <div>
                  <div style="font-weight:700;font-size:14px;">${escapeHtml(entry.title || entry.id)} ${entry.nativeName ? `<span style="color:var(--accent-text);font-weight:600;">(${escapeHtml(entry.nativeName)})</span>` : ''}</div>
                  <div style="font-size:12px;color:var(--text-muted);">
                    ${entry.author ? `by <strong>${escapeHtml(entry.author)}</strong> · ` : ''}<code>${escapeHtml(entry.path)}</code>${entry.items ? ` · ${entry.items} items` : ''} · ${escapeHtml(badge)}
                  </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button class="btn btn-sm" data-open-course-info="${escapeHtml(entry.id)}" title="Ratings, reviews &amp; Discord">${uiIcon('star', 14)}</button>
                  <button class="btn btn-sm" data-share-course="${escapeHtml(entry.id)}" title="Copy share link">${uiIcon('share', 14)}</button>
                  ${installed ? `<button class="btn btn-sm" data-switch-course="${escapeHtml(entry.id)}">Open</button>` : ''}
                  <button class="btn btn-primary btn-sm" data-install-github="${escapeHtml(entry.id)}" ${state.catalogLoading ? 'disabled' : ''}>
                    ${uiIcon('download', 14)} ${installed ? (hasUpdate ? 'Update' : 'Pull Latest') : 'Install'}
                  </button>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      `
          : `<div style="font-size:13px;color:var(--text-muted);padding:10px 12px;border-radius:12px;background:var(--surface-elevated);border:2px solid var(--border);">
              No extra standalone courses in <code>courses/registry.json</code> yet — all ${matrixLangs.length} core languages live in the unified Universal Matrix. Want to add a new language or specialized course? See <strong>CONTRIBUTING_COURSES.md</strong>!
            </div>`
      }
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
          <div>
            <label class="field-label">Author Name</label>
            <input class="input" name="author" value="${escapeHtml(getDisplayName() !== 'Learner' ? getDisplayName() : '')}" placeholder="Your name or @github" />
          </div>
          <div>
            <label class="field-label">Author Profile URL (optional)</label>
            <input class="input" name="authorUrl" placeholder="https://github.com/yourname" />
          </div>
          <div style="grid-column:1 / -1;">
            <label class="field-label">Linked Discord Channel URL (optional)</label>
            <input class="input" name="discordChannelUrl" placeholder="https://discord.com/channels/... (defaults to Polygot Discord)" />
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
            ${renderCustomSelect({
              id: 'studio-lesson-ref',
              name: 'lessonRef',
              className: 'level-select studio-lesson-select',
              ariaLabel: 'Target Lesson',
              value: `${allUnits[0]?.id || ''}|${allUnits[0]?.lessons?.[0]?.id || ''}`,
              options: allUnits.flatMap((u) =>
                u.lessons.map((l) => ({
                  value: `${u.id}|${l.id}`,
                  label: `[${u._section.jlptLevel}] ${u.title} — ${l.title}`
                }))
              )
            })}
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
      <textarea id="import-json-text" rows="5" placeholder='Paste a valid Polygot course JSON object here...'></textarea>
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
  const totalLessonsAll = enrolledCourses.reduce((sum, c) => sum + getOrderedLessons(c).length, 0);
  const srsCount = Object.keys(state.srs || {}).length;
  const masteredChars = Object.values(state.progress.charMastery || {}).filter((v) => v >= 3).length;
  const goalXp = Number(state.profile.dailyGoalXp) || 50;
  const activeAppIcon = getAppIconPreset(state.profile.appIcon);
  const selectedPreset = !state.profile.avatarDataUrl ? findPresetByGlyph(state.profile.avatarEmoji) : null;
  const tab = state.profileTab || 'courses';

  return `
    ${renderHudBar(course)}
    <div class="header-bar">
      <div>
        <h1 class="page-title">Profile</h1>
      </div>
      <button class="btn btn-sm" data-nav="settings">${uiIcon('settings', 17)} Settings</button>
    </div>

    ${state.profileMessage ? `<div class="grammar-box">${escapeHtml(state.profileMessage)}</div>` : ''}

    <section class="card" style="padding:18px;">
      <div class="profile-hero-compact">
        <div style="display:flex;align-items:center;gap:14px;min-width:0;flex:1;">
          <div class="avatar-upload-wrap">
            ${renderAvatarMarkup('lg')}
            <button type="button" class="avatar-cam-btn" id="profile-avatar-upload-btn" title="Upload custom profile picture" aria-label="Upload custom profile picture">${uiIcon('camera', 16)}</button>
            <input type="file" id="profile-avatar-input" accept="image/*" style="display:none;" />
          </div>
          <div style="min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <h2 style="margin:0;font-size:22px;font-weight:700;">${escapeHtml(displayName)}</h2>
              <span class="pill accent">${googleSession ? `${uiIcon('cloud', 14)} Synced` : 'Offline'}</span>
            </div>
            ${state.profile.bio ? `<div style="font-size:13px;color:var(--text-muted);margin-top:4px;">${escapeHtml(state.profile.bio)}</div>` : ''}
            <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">Daily Goal: <strong>${goalXp} XP</strong> · ${enrolledCourses.length} course${enrolledCourses.length === 1 ? '' : 's'}</div>
          </div>
        </div>
      </div>
    </section>

    <div class="section-tabs" role="tablist" aria-label="Profile sections">
      <button type="button" role="tab" aria-selected="${tab === 'courses'}" class="section-tab-btn ${tab === 'courses' ? 'active' : ''}" data-profile-tab="courses">${uiIcon('book', 15)} Overview &amp; Courses</button>
      <button type="button" role="tab" aria-selected="${tab === 'customize'}" class="section-tab-btn ${tab === 'customize' ? 'active' : ''}" data-profile-tab="customize">${uiIcon('palette', 15)} Icon &amp; Avatar</button>
      <button type="button" role="tab" aria-selected="${tab === 'edit'}" class="section-tab-btn ${tab === 'edit' ? 'active' : ''}" data-profile-tab="edit">${uiIcon('user', 15)} Edit Details</button>
    </div>

    ${
      tab === 'courses'
        ? `
          <div class="profile-stats-compact">
            <div class="stat-card">
              <div class="stat-card-label">Streak</div>
              <div class="stat-card-value" style="color:#f97316;">${uiIcon('flame', 19)} ${state.progress.streak}d</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-label">Total XP</div>
              <div class="stat-card-value" style="color:#eab308;">${uiIcon('zap', 19)} ${state.progress.xp}</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-label">Lessons</div>
              <div class="stat-card-value">${completedLessonsCount}/${totalLessonsAll}</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-label">Cards / Chars</div>
              <div class="stat-card-value">${srsCount} · ${masteredChars}</div>
            </div>
          </div>

          <section class="card" id="profile-courses-section">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
              <div>
                <h3 style="margin:0;">${uiIcon('book', 19)} Active Courses (${enrolledCourses.length})</h3>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Switch courses or browse all live languages &amp; community packs.</div>
              </div>
              <button type="button" class="btn btn-primary btn-sm" id="open-add-course-modal-btn">${uiIcon('plus', 15)} Add Course</button>
            </div>
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
                          <strong style="font-family:var(--font-display);font-size:15px;">${escapeHtml(c.sourceLang.name)} → ${escapeHtml(c.targetLang.name)}</strong>
                          <span style="font-size:12px;color:var(--text-muted);">${done}/${ordered.length} (${pct}%)</span>
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
        `
        : ''
    }

    ${
      tab === 'customize'
        ? `
          <section class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
              <h3 style="margin:0;">${uiIcon('palette', 19)} App Icon &amp; Avatar Emblem</h3>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="btn btn-primary btn-sm" id="profile-avatar-pick-btn">${uiIcon('camera', 15)} Upload Photo</button>
                ${
                  state.profile.avatarDataUrl || state.profile.avatarEmoji
                    ? `<button type="button" class="btn btn-sm" id="profile-avatar-reset-btn">${uiIcon('refresh', 14)} ${googleSession?.user?.picture ? 'Use Google Photo' : 'Reset'}</button>`
                    : ''
                }
              </div>
            </div>

            <div class="avatar-presets">
              ${APP_ICON_PRESETS.map((preset) => {
                const isSelected = !state.profile.avatarDataUrl && (state.profile.avatarEmoji === preset.glyph || (preset.customImage && state.profile.avatarEmoji === preset.id));
                const isAppIcon = activeAppIcon.id === preset.id;
                const inner = preset.customImage
                  ? `<img src="${escapeHtml(preset.customImage)}" alt="${escapeHtml(preset.label)}" style="width:26px;height:26px;border-radius:50%;display:block;" />`
                  : escapeHtml(preset.glyph);
                return `<button type="button" class="avatar-preset-btn ${isSelected ? 'active' : ''} ${isAppIcon ? 'is-app-icon' : ''}" data-avatar-emoji="${escapeHtml(preset.glyph)}" data-preset-id="${escapeHtml(preset.id)}" title="${escapeHtml(preset.label)}${isAppIcon ? ' · Active App Icon' : ''}">${inner}${isAppIcon ? '<span class="app-icon-dot" aria-hidden="true"></span>' : ''}</button>`;
              }).join('')}
            </div>

            <div class="app-icon-bar">
              <div class="app-icon-bar-info">
                <img src="${escapeHtml(getAppIconSrc(activeAppIcon.id))}" alt="${escapeHtml(activeAppIcon.label)} App Icon" class="app-icon-preview" />
                <div>
                  <div style="font-size:14px;font-weight:800;">App Icon</div>
                  <div style="font-size:12px;color:var(--text-muted);">
                    Active: <strong>${escapeHtml(activeAppIcon.label)} (${escapeHtml(activeAppIcon.glyph)})</strong>${activeAppIcon.isDefault ? ' · Default' : ''}
                  </div>
                </div>
              </div>
              <div class="app-icon-bar-actions">
                ${
                  selectedPreset && selectedPreset.id !== activeAppIcon.id
                    ? `<button type="button" class="btn btn-primary btn-sm" id="profile-set-app-icon-btn" data-set-app-icon="${escapeHtml(selectedPreset.id)}">${uiIcon('palette', 15)} Set "${escapeHtml(selectedPreset.customImage ? selectedPreset.label : selectedPreset.glyph)}" as App Icon</button>`
                    : selectedPreset && selectedPreset.id === activeAppIcon.id
                      ? `<span class="pill accent">${uiIcon('check', 14)} Active App Icon</span>`
                      : `<span style="font-size:12px;color:var(--text-muted);">Tap an emblem above to apply inside the Polygot icon</span>`
                }
                ${
                  activeAppIcon.id !== DEFAULT_APP_ICON_ID
                    ? `<button type="button" class="btn btn-sm" id="profile-reset-app-icon-btn">${uiIcon('refresh', 15)} Reset Default (Polygot)</button>`
                    : ''
                }
              </div>
            </div>
          </section>
        `
        : ''
    }

    ${
      tab === 'edit'
        ? `
          <section class="card">
            <h3 style="margin-top:0;">${uiIcon('user', 19)} Edit Learner Details</h3>
            <form id="profile-edit-form">
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
              <div style="margin-bottom:16px;">
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
        `
        : ''
    }
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
  const openSec = state.settingsOpenSection;
  const ratingInfo = getCourseRatingSummary(course.id);
  const courseMeta = getCourseMeta(course);
  const langCount = getMatrixLanguages().length;
  const standaloneCount = (state.catalogEntries || []).length;

  const accordion = (id, icon, title, subtitle, bodyHtml) => {
    const isOpen = openSec === id;
    return `
      <section class="accordion-card ${isOpen ? 'is-open' : ''}" id="settings-acc-${id}">
        <button type="button" class="accordion-header" data-settings-accordion="${id}" aria-expanded="${isOpen}">
          <div class="accordion-title-wrap">
            <span class="accordion-icon-badge">${uiIcon(icon, 18)}</span>
            <div style="min-width:0;">
              <div class="accordion-title">${title}</div>
              <div class="accordion-subtitle">${subtitle}</div>
            </div>
          </div>
          <span class="accordion-chevron">${uiIcon('chevronDown', 18)}</span>
        </button>
        ${isOpen ? `<div class="accordion-body">${bodyHtml}</div>` : ''}
      </section>
    `;
  };

  return `
    ${renderHudBar(course)}
    <div class="header-bar">
      <div>
        <h1 class="page-title">Settings</h1>
      </div>
      <span class="pill accent">v${escapeHtml(APP_CONFIG.appVersion)} · ${escapeHtml(platformLabel)}</span>
    </div>

    ${state.backupMessage ? `<div class="grammar-box">${escapeHtml(state.backupMessage)}</div>` : ''}

    <div class="section-tabs" role="tablist" aria-label="Settings categories">
      <button type="button" class="section-tab-btn ${openSec === 'preferences' ? 'active' : ''}" data-settings-tab="preferences">${uiIcon('sliders', 15)} Learning</button>
      <button type="button" class="section-tab-btn ${openSec === 'course' ? 'active' : ''}" data-settings-tab="course">${uiIcon('star', 15)} Course &amp; Share</button>
      <button type="button" class="section-tab-btn ${openSec === 'studio' ? 'active' : ''}" data-settings-tab="studio">${uiIcon('wrench', 15)} Studio</button>
      <button type="button" class="section-tab-btn ${openSec === 'data' ? 'active' : ''}" data-settings-tab="data">${uiIcon('save', 15)} Backup &amp; Updates</button>
      <button type="button" class="section-tab-btn ${openSec === 'about' ? 'active' : ''}" data-settings-tab="about">${uiIcon('info', 15)} About</button>
    </div>

    <div class="accordion-stack">
      ${accordion(
        'preferences',
        'sliders',
        'Appearance &amp; Learning',
        'Theme, pronunciation hints, hearts mode &amp; audio speed',
        `
          <div class="settings-list">
            <div class="settings-row">
              <div>
                <div class="settings-row-title">Theme</div>
                <div class="settings-row-desc">Light, Dark, or match your device theme.</div>
              </div>
              <div class="segmented-control" role="group" aria-label="Theme mode">
                <button type="button" class="seg-btn ${state.theme === 'light' ? 'active' : ''}" data-set-theme="light">${uiIcon('sun', 14)} Light</button>
                <button type="button" class="seg-btn ${state.theme === 'dark' ? 'active' : ''}" data-set-theme="dark">${uiIcon('moon', 14)} Dark</button>
                <button type="button" class="seg-btn ${state.theme === 'system' ? 'active' : ''}" data-set-theme="system">${uiIcon('monitor', 14)} System</button>
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-row-title">${escapeHtml(hintLabel)}</div>
                <div class="settings-row-desc">Show reading/romanization hints beneath foreign scripts.</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="settings-toggle-romaji" ${state.showRomaji ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-row-title">Unlimited Hearts (Chill Mode)</div>
                <div class="settings-row-desc">Practice without losing hearts on mistakes.</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="settings-toggle-chill" ${state.progress.chillMode ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-row-title">Audio Playback Speed</div>
                <div class="settings-row-desc">Pronunciation speed for lessons, cards &amp; drills.</div>
              </div>
              <div class="segmented-control" role="group" aria-label="Audio playback speed">
                <button type="button" class="seg-btn ${state.audioRate === 0.75 ? 'active' : ''}" data-set-audio-rate="0.75">0.75×</button>
                <button type="button" class="seg-btn ${state.audioRate === 0.9 ? 'active' : ''}" data-set-audio-rate="0.9">0.9×</button>
                <button type="button" class="seg-btn ${state.audioRate === 1.1 ? 'active' : ''}" data-set-audio-rate="1.1">1.1×</button>
              </div>
            </div>
          </div>
        `
      )}

      ${accordion(
        'course',
        'star',
        'Active Course, Rate &amp; Live Catalog',
        `${escapeHtml(course.sourceLang.name)} → ${escapeHtml(course.targetLang.name)} · ${langCount} live languages`,
        `
          <div class="settings-list">
            <div class="settings-row">
              <div>
                <div class="settings-row-title">${escapeHtml(course.sourceLang.name)} → ${escapeHtml(course.targetLang.name)}</div>
                <div class="settings-row-desc">
                  By ${escapeHtml(courseMeta.author)} · ${ratingInfo.count ? `${ratingInfo.average.toFixed(1)}★ (${ratingInfo.count} reviews)` : 'Be the first to rate this course'}
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="btn btn-primary btn-sm" id="settings-rate-share-btn" data-open-course-info="${escapeHtml(course.id)}">${uiIcon('star', 14)} Rate &amp; Share</button>
                <button type="button" class="btn btn-sm" data-share-course="${escapeHtml(course.id)}">${uiIcon('share', 14)} Copy Link</button>
                ${
                  courseMeta.discordUrl
                    ? `<button type="button" class="btn btn-sm" data-open-external="${escapeHtml(courseMeta.discordUrl)}">${uiIcon('discord', 14)} Discord</button>`
                    : ''
                }
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-row-title">Live Course Catalog (Auto-Updated)</div>
                <div class="settings-row-desc">
                  ${langCount} languages (${langCount * Math.max(langCount - 1, 0)} pairs)${standaloneCount ? ` + ${standaloneCount} community courses` : ''} · New courses appear automatically without updating the app.
                </div>
              </div>
              <button type="button" class="btn btn-sm" id="settings-refresh-catalog-btn" ${state.liveCatalogSyncing ? 'disabled' : ''}>
                ${uiIcon('refresh', 14)} ${state.liveCatalogSyncing ? 'Syncing...' : 'Refresh Catalog'}
              </button>
            </div>
          </div>
        `
      )}

      ${accordion(
        'studio',
        'wrench',
        'Course Studio &amp; Contributors',
        'Build custom courses or publish community courses on GitHub',
        `
          <div style="padding-top:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <div style="font-size:13px;color:var(--text-muted);max-width:460px;">
              Create custom language courses locally, sync community repositories, or export JSON for Pull Requests.
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn btn-primary btn-sm" id="open-course-studio-btn" data-nav="studio">${uiIcon('wrench', 15)} Open Course Studio ${uiIcon('arrowRight', 14)}</button>
              <a class="btn btn-sm" href="https://github.com/${escapeHtml(state.syncSettings.githubRepo)}/blob/${escapeHtml(state.syncSettings.githubBranch)}/CONTRIBUTING_COURSES.md" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">${uiIcon('book', 14)} Guide ↗</a>
            </div>
          </div>
        `
      )}

      ${accordion(
        'data',
        'save',
        'Backup, Restore &amp; App Updates',
        state.updateInfo?.hasUpdate ? `Update v${escapeHtml(state.updateInfo.latestVersion)} available!` : `${completedLessonsCount} lessons · ${srsCount} cards · v${escapeHtml(APP_CONFIG.appVersion)}`,
        `
          <div class="settings-list" style="margin-bottom:14px;">
            <div class="settings-row" id="settings-updates-section">
              <div>
                <div class="settings-row-title">App Updates</div>
                <div class="settings-row-desc">
                  ${
                    state.updateChecking
                      ? 'Checking GitHub Releases...'
                      : state.updateError
                        ? escapeHtml(state.updateError)
                        : state.updateInfo?.hasUpdate
                          ? `New version <strong>v${escapeHtml(state.updateInfo.latestVersion)}</strong> ready!`
                          : `Up to date on <strong>v${escapeHtml(APP_CONFIG.appVersion)}</strong>`
                  }
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${
                  state.updateInfo?.hasUpdate
                    ? `<button type="button" class="btn btn-primary btn-sm" id="settings-apply-update-btn" ${state.updateInstall?.active ? 'disabled' : ''}>${uiIcon('download', 14)} ${state.updateInstall?.active ? 'Installing...' : `Install v${escapeHtml(state.updateInfo.latestVersion)}`}</button>`
                    : ''
                }
                <button type="button" class="btn btn-sm" id="settings-check-update-btn" ${state.updateChecking || state.updateInstall?.active ? 'disabled' : ''}>
                  ${uiIcon('refresh', 14)} ${state.updateChecking ? 'Checking...' : 'Check'}
                </button>
              </div>
            </div>
            ${renderUpdateProgressBlock('settings')}

            <div class="settings-row">
              <div>
                <div class="settings-row-title">Offline Backup File (.json)</div>
                <div class="settings-row-desc">Export or restore progress, flashcards, profile &amp; ${customCount} custom course(s). (${masteredChars} mastered chars)</div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-primary btn-sm" id="save-backup-file-btn">${uiIcon('download', 14)} Export</button>
                <button class="btn btn-sm" id="open-backup-file-btn">${uiIcon('upload', 14)} Import</button>
                <input type="file" id="web-backup-file-input" accept=".json,.txt,application/json,text/plain" style="display:none;" />
              </div>
            </div>
          </div>

          <div style="padding-top:12px;border-top:2px solid var(--border);">
            <div class="settings-row-title" style="margin-bottom:6px;">Backup Code (<code>PG1:...</code>)</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
              <button class="btn btn-primary btn-sm" id="copy-backup-code-btn">${uiIcon('copy', 14)} Copy Code</button>
              <button class="btn btn-sm" id="show-backup-code-btn">${uiIcon('eye', 14)} Show Code</button>
            </div>
            ${
              state.backupCodePreview
                ? `<textarea id="backup-code-output" rows="2" readonly style="margin-bottom:10px;font-family:monospace;font-size:12px;">${escapeHtml(state.backupCodePreview)}</textarea>`
                : ''
            }
            <textarea id="restore-code-input" rows="2" placeholder="Paste PG1:... backup code or JSON here to restore..." style="font-family:monospace;font-size:12px;"></textarea>
            <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
              <button class="btn btn-primary btn-sm" id="restore-code-btn">${uiIcon('refresh', 14)} Restore Code</button>
              <button class="btn btn-danger btn-sm" id="reset-progress-btn">${uiIcon('trash', 14)} Reset Local Progress</button>
            </div>
          </div>
        `
      )}

      ${accordion(
        'about',
        'info',
        'Support &amp; About Polygot',
        `Free &amp; open-source · v${escapeHtml(APP_CONFIG.appVersion)} · ${escapeHtml(platformLabel)}`,
        `
          <div style="padding-top:10px;display:grid;gap:12px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <img src="${escapeHtml(getAppIconSrc())}" alt="Polygot" style="width:42px;height:42px;border-radius:50%;display:block;" />
              <div>
                <div style="font-weight:800;font-family:var(--font-display);font-size:15px;">Polygot v${escapeHtml(APP_CONFIG.appVersion)}</div>
                <div style="font-size:12px;color:var(--text-muted);">100% free, zero ads, offline-first language learning.</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${
                APP_CONFIG.donations?.githubSponsors
                  ? `<button type="button" class="btn btn-primary btn-sm" data-open-external="${escapeHtml(APP_CONFIG.donations.githubSponsors)}">${uiIcon('heart', 14)} Sponsor</button>`
                  : ''
              }
              <a class="btn btn-sm" href="https://github.com/${escapeHtml(APP_CONFIG.githubRepo)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">${uiIcon('github', 14)} GitHub</a>
              <a class="btn btn-sm" href="${escapeHtml(APP_CONFIG.discordUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">${uiIcon('discord', 14)} Discord</a>
              <a class="btn btn-sm" href="https://github.com/${escapeHtml(APP_CONFIG.githubRepo)}/releases" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">${uiIcon('download', 14)} Releases</a>
              <a class="btn btn-sm" href="./privacy.html" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">Privacy Policy</a>
            </div>
          </div>
        `
      )}
    </div>

    <section class="card settings-account-card" id="settings-account-section">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:12px;min-width:0;">
          ${renderAvatarMarkup('md')}
          <div style="min-width:0;">
            <div style="font-weight:700;font-size:16px;font-family:var(--font-display);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(getDisplayName())}</div>
            <div style="font-size:13px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${googleSession ? escapeHtml(googleSession.user?.email || 'Signed in with Google') : 'Local Guest Mode · Not signed in'}
            </div>
            <div style="font-size:12px;color:var(--accent-text);margin-top:2px;display:inline-flex;align-items:center;gap:5px;">
              ${uiIcon('cloud', 13)} Last synced: ${escapeHtml(formatLastSynced(false))}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${
            googleSession
              ? `<button class="btn btn-danger btn-sm" id="google-signout-btn">${uiIcon('logout', 15)} Log Out</button>`
              : `<button class="btn btn-primary btn-sm" id="google-signin-btn" ${state.googleBusy ? 'disabled' : ''}>${uiIcon('shield', 15)} ${state.googleBusy ? 'Signing in...' : 'Sign in with Google'}</button>`
          }
        </div>
      </div>

      ${
        googleSession
          ? `
            <div class="settings-list" style="padding-top:10px;border-top:2px solid var(--border);">
              <div class="settings-row">
                <div>
                  <div class="settings-row-title">Auto-Sync to Google Drive</div>
                  <div class="settings-row-desc">Automatically back up after lessons, cards &amp; profile edits.</div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="settings-toggle-autosync" ${state.autoSync ? 'checked' : ''} />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:4px;">
                <button class="btn btn-primary btn-sm" id="google-backup-btn" ${state.googleBusy ? 'disabled' : ''}>${uiIcon('cloud', 15)} Backup Now</button>
                <button class="btn btn-sm" id="google-restore-btn" ${state.googleBusy ? 'disabled' : ''}>${uiIcon('download', 15)} Restore from Drive</button>
              </div>
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
  `;
}

/* ---------- Events ---------- */
async function switchCourse(newId) {
  if (newId === '__add__') {
    state.showAddCourseModal = true;
    state.addCourseSearch = '';
    render();
    autoRefreshLiveCatalog({ force: false, silent: true });
    return;
  }
  await ensureCourseLoaded(newId);
  if (!state.enrolledCourseIds.includes(newId) && state.courses.some((c) => c.id === newId)) {
    state.enrolledCourseIds = [...state.enrolledCourseIds, newId];
    saveLocalState();
    autoBackupToGoogleDrive(false);
  }
  state.activeCourseId = newId;
  const nextCourse = getActiveCourse();
  if (!nextCourse) return;
  state.selectedSectionId = 'all';
  state.flashcardFilter = 'ALL';
  state.activeScriptTab = null;
  state.scriptDrill = null;
  state.drawSession = null;
  state.drawController = null;
  state.placementSession = null;
  state.lessonSession = null;
  state.view = 'syllabus';
  state.shouldScrollToActiveLesson = true;
  render();
}

function attachActiveLessonTracker(course) {
  if (window._polygotLessonScrollCleanup) {
    window._polygotLessonScrollCleanup();
    window._polygotLessonScrollCleanup = null;
  }

  const activeNode = document.getElementById('active-lesson-node');
  const jumpBtn = document.getElementById('jump-active-lesson-btn');
  if (!activeNode || !jumpBtn) return;

  const updateJumpButton = () => {
    const rect = activeNode.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const topThreshold = 68;
    const bottomThreshold = vh - 108;

    if (rect.bottom < topThreshold) {
      jumpBtn.innerHTML = `${uiIcon('arrowUp', 16)} <span>${escapeHtml(tCourse(course, 'backToLesson'))}</span>`;
      jumpBtn.classList.add('visible');
    } else if (rect.top > bottomThreshold) {
      jumpBtn.innerHTML = `${uiIcon('arrowDown', 16)} <span>${escapeHtml(tCourse(course, 'jumpToLesson'))}</span>`;
      jumpBtn.classList.add('visible');
    } else {
      jumpBtn.classList.remove('visible');
    }
  };

  jumpBtn.addEventListener('click', () => {
    activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const circle = activeNode.querySelector('.lesson-node');
    if (circle) {
      circle.classList.remove('pulse-highlight');
      void circle.offsetWidth;
      circle.classList.add('pulse-highlight');
    }
  });

  if (state.shouldScrollToActiveLesson) {
    state.shouldScrollToActiveLesson = false;
    requestAnimationFrame(() => {
      const rect = activeNode.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < 72 || rect.bottom > vh - 96) {
        activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      updateJumpButton();
    });
  } else {
    requestAnimationFrame(updateJumpButton);
  }

  let rafId = null;
  const onScrollOrResize = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      updateJumpButton();
    });
  };

  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize, { passive: true });
  window._polygotLessonScrollCleanup = () => {
    window.removeEventListener('scroll', onScrollOrResize);
    window.removeEventListener('resize', onScrollOrResize);
    if (rafId) cancelAnimationFrame(rafId);
  };
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
        if (target === 'syllabus' && state.view !== 'syllabus') {
          state.shouldScrollToActiveLesson = true;
        }
        state.view = target;
        state.studioMessage = '';
        render();
      }
    });
  });

  bindCustomSelect('course-select', (val) => switchCourse(val));
  bindCustomSelect('mobile-course-select', (val) => switchCourse(val));
  bindCustomSelect('studio-lesson-ref');

  const audioToastEl = document.getElementById('audio-toast');
  if (audioToastEl) {
    audioToastEl.addEventListener('click', () => {
      state.audioToast = '';
      clearTimeout(toastTimer);
      audioToastEl.style.display = 'none';
    });
  }

  const drillFeedback = document.getElementById('drill-feedback-box');
  if (drillFeedback) {
    requestAnimationFrame(() => {
      drillFeedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  if (state.view === 'syllabus') {
    attachActiveLessonTracker(course);
  } else if (window._polygotLessonScrollCleanup) {
    window._polygotLessonScrollCleanup();
    window._polygotLessonScrollCleanup = null;
  }

  /* Update & External Link Handlers */
  const checkUpdateBtn = document.getElementById('settings-check-update-btn');
  if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', () => runUpdateCheck(true));
  }
  const applyUpdateBtns = [
    document.getElementById('settings-apply-update-btn'),
    document.getElementById('banner-apply-update-btn')
  ].filter(Boolean);
  applyUpdateBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.updateInfo && !state.updateInstall?.active) {
        startAppUpdate();
      }
    });
  });
  const dismissUpdateBtns = [
    document.getElementById('banner-dismiss-update-btn'),
    document.getElementById('banner-later-update-btn')
  ].filter(Boolean);
  dismissUpdateBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.updateBannerDismissed = true;
      if (state.updateInfo?.latestVersion) {
        dismissUpdateVersion(state.updateInfo.latestVersion);
      }
      render();
    });
  });
  document.querySelectorAll('[data-open-external]').forEach((btn) => {
    btn.addEventListener('click', () => openExternalLink(btn.dataset.openExternal));
  });
  const copyUpiBtn = document.getElementById('copy-upi-btn');
  if (copyUpiBtn) {
    copyUpiBtn.addEventListener('click', async () => {
      const upi = copyUpiBtn.dataset.upi || '';
      if (!upi) return;
      try {
        if (window.AndroidBackup?.copyToClipboard) window.AndroidBackup.copyToClipboard(upi);
        else await navigator.clipboard.writeText(upi);
        showAudioToast(`Copied UPI ID: ${upi}`);
      } catch {
        showAudioToast(`UPI ID: ${upi}`);
      }
    });
  }

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

  const setAppIconBtn = document.getElementById('profile-set-app-icon-btn');
  if (setAppIconBtn) {
    setAppIconBtn.addEventListener('click', () => {
      const iconId = setAppIconBtn.dataset.setAppIcon || DEFAULT_APP_ICON_ID;
      state.profile.appIcon = iconId;
      const preset = applyAppIcon({ syncNative: true });
      const isAndroid = Boolean(window.AndroidAppIcon);
      state.profileMessage = isAndroid
        ? `App icon updated to ${preset.label} (${preset.glyph})! Home screen icon will refresh when you minimize the app.`
        : `App icon updated to ${preset.label} (${preset.glyph})!`;
      saveLocalState();
      autoBackupToGoogleDrive(false);
      render();
    });
  }

  const resetAppIconBtn = document.getElementById('profile-reset-app-icon-btn');
  if (resetAppIconBtn) {
    resetAppIconBtn.addEventListener('click', () => {
      state.profile.appIcon = DEFAULT_APP_ICON_ID;
      const preset = applyAppIcon({ syncNative: true });
      const isAndroid = Boolean(window.AndroidAppIcon);
      state.profileMessage = isAndroid
        ? `App icon reset to default ${preset.label} (${preset.glyph}). Home screen icon will refresh when you minimize the app.`
        : `App icon reset to default ${preset.label} (${preset.glyph}).`;
      saveLocalState();
      autoBackupToGoogleDrive(false);
      render();
    });
  }

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

  document.querySelectorAll('[data-profile-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.profileTab = btn.dataset.profileTab || 'courses';
      render();
    });
  });

  document.querySelectorAll('[data-settings-accordion]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.settingsAccordion;
      state.settingsOpenSection = state.settingsOpenSection === id ? '' : id;
      render();
    });
  });

  document.querySelectorAll('[data-settings-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.settingsTab;
      state.settingsOpenSection = id;
      render();
      const target = document.getElementById(`settings-acc-${id}`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  const settingsRefreshCatalogBtn = document.getElementById('settings-refresh-catalog-btn');
  if (settingsRefreshCatalogBtn) {
    settingsRefreshCatalogBtn.addEventListener('click', () => autoRefreshLiveCatalog({ force: true, silent: false }));
  }

  const modalRefreshCatalogBtn = document.getElementById('modal-refresh-catalog-btn');
  if (modalRefreshCatalogBtn) {
    modalRefreshCatalogBtn.addEventListener('click', () => autoRefreshLiveCatalog({ force: true, silent: false }));
  }

  const openAddCourseBtns = [
    document.getElementById('toggle-add-course-btn'),
    document.getElementById('open-add-course-modal-btn'),
    ...document.querySelectorAll('[data-open-add-course]')
  ].filter(Boolean);
  openAddCourseBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.showAddCourseModal = true;
      state.addCourseSearch = '';
      render();
      autoRefreshLiveCatalog({ force: false, silent: true });
    });
  });

  bindCustomSelect('modal-source-lang', (val) => {
    state.pickerSourceLang = val;
    render();
  });

  bindCustomSelect('modal-course-sort', (val) => {
    state.addCourseSort = val;
    render();
  });

  /* Course Info, Ratings, Comments & Share Handlers */
  document.querySelectorAll('[data-open-course-info]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cid = btn.dataset.openCourseInfo;
      state.courseInfoModalId = cid;
      state.courseReviewNotice = '';
      const existingMine = getCourseReviews(cid).find((r) => r.isMine);
      state.courseReviewDraft = {
        rating: existingMine?.rating || 5,
        comment: existingMine?.comment || ''
      };
      render();
      fetchPublicCourseReviews(state.syncSettings.githubRepo, false).then(() => {
        if (state.courseInfoModalId === cid) render();
      });
    });
  });

  document.querySelectorAll('[data-share-course]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const cid = btn.dataset.shareCourse;
      const loaded = state.courses.find((c) => c.id === cid);
      const url = buildCourseShareUrl({ id: cid, importUrl: loaded?._importUrl || '' });
      const res = await shareOrCopyCourseLink(url, loaded?.title || cid);
      showToast(res === 'shared' ? 'Shared course link!' : `Course link copied: ${url}`);
    });
  });

  const courseInfoBackdrop = document.getElementById('course-info-modal-backdrop');
  if (courseInfoBackdrop) {
    courseInfoBackdrop.addEventListener('click', (e) => {
      if (e.target === courseInfoBackdrop || e.target.closest('#close-course-info-modal')) {
        state.courseInfoModalId = null;
        state.courseReviewNotice = '';
        render();
      }
    });
  }

  const courseInfoStartBtn = document.getElementById('course-info-start-btn');
  if (courseInfoStartBtn) {
    courseInfoStartBtn.addEventListener('click', async () => {
      const cid = courseInfoStartBtn.dataset.courseId;
      state.courseInfoModalId = null;
      state.showAddCourseModal = false;
      await enrollCourse(cid, true);
    });
  }

  document.querySelectorAll('[data-pick-star]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const stars = parseInt(btn.dataset.pickStar, 10) || 5;
      const ta = document.getElementById('course-review-comment');
      state.courseReviewDraft = {
        rating: stars,
        comment: ta ? ta.value : state.courseReviewDraft?.comment || ''
      };
      render();
    });
  });

  const courseReviewForm = document.getElementById('course-review-form');
  if (courseReviewForm) {
    courseReviewForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const cid = state.courseInfoModalId;
      if (!cid) return;
      const ta = document.getElementById('course-review-comment');
      const comment = ta ? ta.value.trim() : '';
      const rating = state.courseReviewDraft?.rating || 5;
      state.courseReviewDraft = { rating, comment };
      saveLocalCourseReview(cid, {
        rating,
        comment,
        authorName: getDisplayName()
      });
      state.courseReviewNotice = 'Saved your rating & feedback! Tap "Publish Publicly" to share it with all Polygot learners.';
      autoBackupToGoogleDrive();
      render();
    });
  }

  const publishPublicReviewBtn = document.getElementById('publish-public-review-btn');
  if (publishPublicReviewBtn) {
    publishPublicReviewBtn.addEventListener('click', () => {
      const cid = state.courseInfoModalId;
      if (!cid) return;
      const ta = document.getElementById('course-review-comment');
      const comment = ta ? ta.value.trim() : '';
      const rating = state.courseReviewDraft?.rating || 5;
      state.courseReviewDraft = { rating, comment };
      saveLocalCourseReview(cid, {
        rating,
        comment,
        authorName: getDisplayName()
      });
      const loaded = state.courses.find((c) => c.id === cid);
      const issueUrl = buildPublicReviewIssueUrl({
        courseId: cid,
        courseTitle: loaded?.title || cid,
        rating,
        comment,
        repo: state.syncSettings.githubRepo
      });
      openExternalLink(issueUrl);
      state.courseReviewNotice = 'Opened GitHub to publish your review publicly — once submitted, everyone on Polygot will see it!';
      render();
    });
  }

  const refreshCourseReviewsBtn = document.getElementById('refresh-course-reviews-btn');
  if (refreshCourseReviewsBtn) {
    refreshCourseReviewsBtn.addEventListener('click', async () => {
      await fetchPublicCourseReviews(state.syncSettings.githubRepo, true);
      showToast('Refreshed community course reviews.');
      render();
    });
  }

  const modalSearchInput = document.getElementById('modal-course-search');
  if (modalSearchInput) {
    modalSearchInput.addEventListener('input', (e) => {
      state.addCourseSearch = e.target.value;
      const q = state.addCourseSearch.trim().toLowerCase();
      document.querySelectorAll('[data-modal-course-item]').forEach((row) => {
        const hay = (row.dataset.modalCourseItem || '').toLowerCase();
        row.style.display = !q || hay.includes(q) ? '' : 'none';
      });
    });
  }

  const addCourseModalBackdrop = document.getElementById('add-course-modal-backdrop');
  if (addCourseModalBackdrop) {
    addCourseModalBackdrop.addEventListener('click', (e) => {
      if (e.target === addCourseModalBackdrop || e.target.closest('#close-add-course-modal')) {
        state.showAddCourseModal = false;
        render();
      }
    });
  }

  document.querySelectorAll('[data-modal-enroll-course]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const cid = btn.dataset.modalEnrollCourse;
      state.showAddCourseModal = false;
      await enrollCourse(cid, true);
    });
  });

  bindCustomSelect('script-tab-select', (val) => {
    state.activeScriptTab = val;
    state.scriptDrill = null;
    state.drawSession = null;
    render();
  });

  bindCustomSelect('script-practice-select', (val) => {
    if (val === 'trace') openDrawSession(getScriptSetForCourse(course), state.activeScriptTab, null);
    else if (val === 'write-test') openRandomWriteTest(getScriptSetForCourse(course), state.activeScriptTab);
    else if (val === 'word-write') openWordWriteSession(course);
    else if (val === 'quiz') startScriptDrill(getScriptSetForCourse(course), state.activeScriptTab);
  });

  bindCustomSelect('profile-source-lang', (val) => {
    state.pickerSourceLang = val;
    render();
  });

  document.querySelectorAll('[data-enroll-course]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const cid = btn.dataset.enrollCourse;
      await enrollCourse(cid, false);
      const target = state.courses.find((c) => c.id === cid);
      if (target) {
        state.profileMessage = `Added "${target.sourceLang.name} → ${target.targetLang.name}" to your active courses!`;
        render();
      }
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

  bindCustomSelect('section-select', (val) => {
    state.selectedSectionId = val;
    state.shouldScrollToActiveLesson = true;
    render();
  });

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
  const swipeWrap = document.getElementById('flashcard-swipe-wrap');
  if (window.__polygotCardKeyHandler) {
    window.removeEventListener('keydown', window.__polygotCardKeyHandler);
    window.__polygotCardKeyHandler = null;
  }

  if (flashcardBox && swipeWrap) {
    const badgeRight = document.getElementById('swipe-badge-right');
    const badgeLeft = document.getElementById('swipe-badge-left');
    let swipingOut = false;

    const toggleCardFlip = () => {
      if (swipingOut) return;
      state.flashcardSession.flipped = !state.flashcardSession.flipped;
      flashcardBox.classList.toggle('is-flipped', state.flashcardSession.flipped);
    };

    const triggerSwipe = (dir) => {
      if (swipingOut) return;
      swipingOut = true;
      swipeWrap.classList.remove('is-dragging');
      if (badgeRight) badgeRight.style.opacity = dir === 'right' ? '1' : '0';
      if (badgeLeft) badgeLeft.style.opacity = dir === 'left' ? '1' : '0';
      swipeWrap.classList.add(dir === 'right' ? 'swipe-out-right' : 'swipe-out-left');
      setTimeout(() => {
        rateCurrentFlashcard(dir === 'right' ? RATINGS.GOOD : RATINGS.AGAIN);
      }, 210);
    };

    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let tracking = false;
    let moved = false;
    let lockedAxis = null; // 'x' | 'y' | null

    const onStart = (clientX, clientY) => {
      if (swipingOut) return;
      startX = clientX;
      startY = clientY;
      deltaX = 0;
      tracking = true;
      moved = false;
      lockedAxis = null;
      swipeWrap.classList.add('is-dragging');
    };

    const onMove = (clientX, clientY, e) => {
      if (!tracking || swipingOut) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      if (!lockedAxis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        lockedAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      }
      if (lockedAxis === 'y') return;
      if (lockedAxis === 'x') {
        if (e && e.cancelable) e.preventDefault();
        moved = true;
        deltaX = dx;
        const rot = Math.max(-16, Math.min(16, dx * 0.055));
        swipeWrap.style.transform = `translate3d(${dx}px, ${Math.min(18, Math.abs(dx) * 0.05)}px, 0) rotate(${rot}deg)`;
        const ratio = Math.min(1, Math.abs(dx) / 90);
        if (badgeRight) {
          badgeRight.style.opacity = dx > 16 ? String(ratio) : '0';
          badgeRight.style.transform = `scale(${0.92 + ratio * 0.1})`;
        }
        if (badgeLeft) {
          badgeLeft.style.opacity = dx < -16 ? String(ratio) : '0';
          badgeLeft.style.transform = `scale(${0.92 + ratio * 0.1})`;
        }
      }
    };

    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      swipeWrap.classList.remove('is-dragging');
      if (deltaX > 72) {
        triggerSwipe('right');
        return;
      }
      if (deltaX < -72) {
        triggerSwipe('left');
        return;
      }
      swipeWrap.style.transform = '';
      if (badgeRight) badgeRight.style.opacity = '0';
      if (badgeLeft) badgeLeft.style.opacity = '0';
      if (!moved) {
        toggleCardFlip();
      }
    };

    swipeWrap.addEventListener('pointerdown', (e) => {
      if (e.button && e.button !== 0) return;
      if (e.target.closest('button')) return;
      onStart(e.clientX, e.clientY);
      try {
        swipeWrap.setPointerCapture(e.pointerId);
      } catch {
        // Ignore capture errors
      }
    });
    swipeWrap.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY, e));
    swipeWrap.addEventListener('pointerup', onEnd);
    swipeWrap.addEventListener('pointercancel', onEnd);

    const flipBtn = document.getElementById('flashcard-flip-btn');
    const leftBtn = document.getElementById('flashcard-swipe-left-btn');
    const rightBtn = document.getElementById('flashcard-swipe-right-btn');
    if (flipBtn) flipBtn.addEventListener('click', toggleCardFlip);
    if (leftBtn) leftBtn.addEventListener('click', () => triggerSwipe('left'));
    if (rightBtn) rightBtn.addEventListener('click', () => triggerSwipe('right'));

    window.__polygotCardKeyHandler = (e) => {
      if (state.view !== 'flashcards' || state.showAddCourseModal || state.courseInfoModalId) return;
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        triggerSwipe('right');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        triggerSwipe('left');
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggleCardFlip();
      }
    };
    window.addEventListener('keydown', window.__polygotCardKeyHandler);
  }

  document.querySelectorAll('[data-rate]').forEach((btn) => {
    btn.addEventListener('click', () => rateCurrentFlashcard(Number(btn.dataset.rate)));
  });

  const restartCards = document.getElementById('restart-flashcards-btn');
  if (restartCards) {
    restartCards.addEventListener('click', () => {
      const items = getAllItems(course);
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
      state.catalogStatus = `Syncing matrix & community catalog from ${state.syncSettings.githubRepo}...`;
      render();
      try {
        const [remoteSyl, result] = await Promise.all([
          syncMatrixFromGitHub(state.syncSettings.githubRepo, state.syncSettings.githubBranch).catch(() => null),
          fetchGitHubCatalog(state.syncSettings.githubRepo, state.syncSettings.githubBranch)
        ]);
        if (remoteSyl?.languages) {
          syncLanguageAppIcons(remoteSyl.languages);
        }
        state.catalogEntries = result.entries;
        const langCount = getMatrixLanguages().length;
        state.catalogStatus = `Synced ${langCount} matrix languages (${langCount * Math.max(langCount - 1, 0)} pairs) & ${result.entries.length} standalone course(s) from github.com/${result.repo} (${result.branch}).`;
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
      const author = String(fd.get('author') || '').trim() || getDisplayName() || 'Community Author';
      const authorUrl = String(fd.get('authorUrl') || '').trim();
      const discordChannelUrl = String(fd.get('discordChannelUrl') || '').trim();

      const newCourse = {
        id,
        version: '0.1.0',
        title: `${targetName} for English Speakers`,
        description: `Community-created open-source syllabus for learning ${targetName}.`,
        author,
        authorUrl,
        discordChannelUrl,
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
      exportJsonFile(`polygot-backup-${dateStr}.json`, payload);
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
        state.selectedSectionId = 'all';
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
  const sDir = course.sourceLang?.dir === 'rtl' ? 'rtl' : 'ltr';
  return `
    <div id="sheet-backdrop" class="sheet-backdrop">
      <div class="lesson-sheet" dir="${sDir}">
        <div class="sheet-handle"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
          <span class="pill accent">${escapeHtml(sheet.unit.cefrLevel || tCourse(course, 'unit'))} · ${escapeHtml(sheet.unit.title)}</span>
          <span class="pill">${escapeHtml(tCourse(course, 'itemsReady', { n: sheet.lesson.items.length }))}</span>
        </div>
        <h2 style="margin:6px 0 4px;font-size:22px;">${escapeHtml(sheet.lesson.title)}</h2>
        <p style="margin:0 0 16px;font-size:14px;color:var(--text-muted);">${escapeHtml(sheet.lesson.objective || '')}</p>
        <div style="display:grid;gap:10px;">
          <button class="btn btn-primary" style="width:100%;padding:14px;" data-start-lesson="${escapeHtml(sheet.unit.id)}|${escapeHtml(sheet.lesson.id)}">
            ${uiIcon('play', 18)} ${escapeHtml(tCourse(course, 'start'))} (+25 XP)
          </button>
          <button class="btn" style="width:100%;" data-guidebook="${escapeHtml(sheet.unit.id)}">${uiIcon('book', 18)} ${escapeHtml(tCourse(course, 'guidebook'))}</button>
        </div>
      </div>
    </div>
  `;
}

async function runUpdateCheck(manual = false) {
  if (state.updateChecking) return;
  state.updateChecking = true;
  state.updateError = '';
  if (manual) render();
  try {
    const info = await checkForAppUpdate(APP_CONFIG.githubRepo, APP_CONFIG.appVersion);
    state.updateInfo = info;
    if (info.hasUpdate) {
      const dismissed = getDismissedUpdateVersion();
      state.updateBannerDismissed = !manual && dismissed === info.latestVersion;
    }
  } catch (err) {
    if (manual) state.updateError = err.message || 'Could not check for updates.';
  } finally {
    state.updateChecking = false;
    if (manual || state.updateInfo?.hasUpdate) render();
  }
}

function renderAddCourseModal() {
  if (!state.showAddCourseModal) return '';
  const langs = getMatrixLanguages();
  const srcMeta = langs.find((l) => l.code === state.pickerSourceLang) || langs[0];
  const targets = srcMeta ? getAvailableMatrixTargets(srcMeta.code, false) : [];
  const enrolledSet = new Set(state.enrolledCourseIds);
  const query = (state.addCourseSearch || '').trim().toLowerCase();

  // Combine matrix targets with their rating summaries
  const rows = targets.map((t) => {
    const pairId = `${srcMeta.code}-${t.code}`;
    const existingCourse = state.courses.find((c) => c.id === pairId);
    const meta = getCourseMeta(existingCourse, {
      id: pairId,
      targetCode: t.code,
      title: `${srcMeta.name} → ${t.name}`,
      author: t.author || 'Polygot Core Team'
    });
    const rating = getCourseRatingSummary(pairId);
    return {
      kind: 'matrix',
      glyph: t.icon?.glyph || t.code.toUpperCase(),
      pairId,
      title: `${srcMeta.name} → ${t.name}`,
      nativeLabel: t.nativeName,
      subtitle: `${t.levelLabels[0]} → ${t.levelLabels[t.levelLabels.length - 1]}`,
      hay: `${srcMeta.name} ${srcMeta.nativeName} ${t.name} ${t.nativeName} ${t.code} ${pairId} ${meta.author}`,
      isEnrolled: enrolledSet.has(pairId),
      isLiveNew: Boolean(t._isLiveNew),
      meta,
      rating
    };
  });

  // Also include standalone live community courses from registry.json (auto-updated without app updates!)
  const matrixIds = new Set(rows.map((r) => r.pairId));
  const standaloneEntries = [
    ...(state.catalogEntries || []),
    ...state.courses
      .filter((c) => !c._matrix && !(state.catalogEntries || []).some((e) => e.id === c.id))
      .map((c) => ({
        id: c.id,
        title: c.title || `${c.sourceLang?.name || ''} → ${c.targetLang?.name || ''}`,
        author: c.author || 'Community Author',
        subtitle: c.subtitle || `${getAllUnits(c).length} units · Custom`
      }))
  ];
  standaloneEntries.forEach((entry) => {
    if (!entry?.id || matrixIds.has(entry.id)) return;
    const loaded = state.courses.find((c) => c.id === entry.id);
    const meta = getCourseMeta(loaded, {
      id: entry.id,
      title: entry.title || entry.id,
      author: entry.author || 'Community Contributor'
    });
    const rating = getCourseRatingSummary(entry.id);
    rows.push({
      kind: 'standalone',
      glyph: entry.iconGlyph || (entry.title || entry.id).slice(0, 2).toUpperCase(),
      pairId: entry.id,
      title: entry.title || entry.id,
      nativeLabel: entry.nativeName || '',
      subtitle: entry.subtitle || (entry.version ? `Community Course · v${entry.version}` : 'Community Course'),
      hay: `${entry.title || ''} ${entry.id} ${meta.author} community`,
      isEnrolled: enrolledSet.has(entry.id),
      isLiveNew: !loaded,
      meta,
      rating
    });
  });

  if (state.addCourseSort === 'rating') {
    rows.sort((a, b) => (b.rating.average - a.rating.average) || (b.rating.count - a.rating.count));
  } else if (state.addCourseSort === 'popular') {
    rows.sort((a, b) => (b.rating.popularityScore - a.rating.popularityScore) || (b.rating.count - a.rating.count));
  }

  const standaloneTotal = standaloneEntries.length;

  return `
    <div id="add-course-modal-backdrop" class="ol-select-overlay" role="dialog" aria-modal="true" aria-label="Add a Course">
      <div class="ol-select-modal add-course-modal">
        <div class="ol-select-modal-header">
          <div>
            <div class="ol-select-modal-title">${uiIcon('plus', 17)} Add a Course</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
              ${langs.length} languages · ${langs.length * Math.max(langs.length - 1, 0)} pairs${standaloneTotal ? ` + ${standaloneTotal} community` : ''} · ${state.liveCatalogSyncing ? 'Checking for new courses...' : 'Auto-synced live'}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <button type="button" id="modal-refresh-catalog-btn" class="ol-select-close" title="Check GitHub for newly added courses" aria-label="Refresh live course catalog" ${state.liveCatalogSyncing ? 'disabled' : ''}>${uiIcon('refresh', 16)}</button>
            <button type="button" id="close-add-course-modal" class="ol-select-close" aria-label="Close">${uiIcon('x', 18)}</button>
          </div>
        </div>

        <div class="add-course-modal-controls">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-size:13px;font-weight:800;color:var(--text-muted);white-space:nowrap;">I speak:</span>
              ${renderCustomSelect({
                id: 'modal-source-lang',
                className: 'level-select profile-lang-select',
                ariaLabel: 'Language you speak',
                value: srcMeta?.code || 'en',
                options: langs.map((l) => ({ value: l.code, label: `${l.name} (${l.nativeName})` }))
              })}
            </div>
            ${renderCustomSelect({
              id: 'modal-course-sort',
              className: 'level-select',
              ariaLabel: 'Sort courses',
              value: state.addCourseSort || 'default',
              options: [
                { value: 'default', label: 'Sort: Default' },
                { value: 'popular', label: 'Most Popular' },
                { value: 'rating', label: 'Highest Rated' }
              ]
            })}
          </div>
          <input
            type="search"
            id="modal-course-search"
            class="input"
            placeholder="Filter languages or authors (e.g. Tamil, Japanese, Korean)..."
            value="${escapeHtml(state.addCourseSearch)}"
            style="padding:9px 13px;font-size:14px;"
          />
        </div>

        <div class="ol-select-list" style="max-height:54vh;">
          ${rows
            .map(({ glyph, pairId, title, nativeLabel, subtitle, hay, isEnrolled, isLiveNew, meta, rating }) => {
              const hidden = query && !hay.toLowerCase().includes(query);
              return `
                <div class="add-course-modal-row" data-modal-course-item="${escapeHtml(hay)}" style="${hidden ? 'display:none;' : ''}">
                  <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
                    <span class="modal-lang-glyph">${escapeHtml(glyph)}</span>
                    <div style="min-width:0;">
                      <div style="font-weight:800;font-size:15px;font-family:var(--font-display);line-height:1.25;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span>${escapeHtml(title)}${nativeLabel ? ` <span style="color:var(--accent-text);">(${escapeHtml(nativeLabel)})</span>` : ''}</span>
                        ${isLiveNew ? `<span class="live-new-pill">New</span>` : ''}
                      </div>
                      <div style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px;">
                        <span>${escapeHtml(subtitle)}</span>
                        <span>·</span>
                        <span>by ${escapeHtml(meta.author)}</span>
                        ${
                          rating.count
                            ? `<span class="course-rating-badge">${uiIcon('star', 11)} ${rating.average.toFixed(1)} (${rating.count})</span>`
                            : ''
                        }
                      </div>
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                    <button type="button" class="icon-btn course-row-mini-btn" data-open-course-info="${escapeHtml(pairId)}" title="Author, ratings, comments &amp; Discord" aria-label="Course info and reviews">${uiIcon('star', 15)}</button>
                    <button type="button" class="icon-btn course-row-mini-btn" data-share-course="${escapeHtml(pairId)}" title="Copy shareable course link" aria-label="Share course link">${uiIcon('share', 15)}</button>
                    ${
                      isEnrolled
                        ? `<button type="button" class="btn btn-sm" data-modal-enroll-course="${escapeHtml(pairId)}">${uiIcon('check', 14)} Open</button>`
                        : `<button type="button" class="btn btn-primary btn-sm" data-modal-enroll-course="${escapeHtml(pairId)}" ${state.loadingCourse ? 'disabled' : ''}>${uiIcon('plus', 14)} Add</button>`
                    }
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    </div>
  `;
}

function renderCourseInfoModal() {
  if (!state.courseInfoModalId) return '';
  const cid = state.courseInfoModalId;
  const loadedCourse = state.courses.find((c) => c.id === cid);
  const catalogEntry = (state.catalogEntries || []).find((e) => e.id === cid);
  const pair = parseMatrixCourseId(cid);
  const langs = getMatrixLanguages();
  const srcMeta = pair ? langs.find((l) => l.code === pair.sourceCode) : null;
  const tgtMeta = pair ? langs.find((l) => l.code === pair.targetCode) : null;

  const title =
    loadedCourse?.title ||
    catalogEntry?.title ||
    (srcMeta && tgtMeta ? `${srcMeta.name} → ${tgtMeta.name} (${tgtMeta.nativeName})` : cid);
  const glyph =
    tgtMeta?.icon?.glyph ||
    loadedCourse?.targetLang?.nativeName?.slice(0, 1) ||
    (cid.split('-')[1] || cid).slice(0, 2).toUpperCase();
  const meta = getCourseMeta(loadedCourse, {
    id: cid,
    targetCode: tgtMeta?.code || cid.split('-')[1] || '',
    title,
    author: catalogEntry?.author || tgtMeta?.author || 'Polygot Core Team',
    authorUrl: catalogEntry?.authorUrl || ''
  });
  const ratingSum = getCourseRatingSummary(cid);
  const reviews = getCourseReviews(cid);
  const isEnrolled = state.enrolledCourseIds.includes(cid);
  const draftStars = Math.max(1, Math.min(5, Number(state.courseReviewDraft?.rating) || 5));

  return `
    <div id="course-info-modal-backdrop" class="ol-select-overlay" role="dialog" aria-modal="true" aria-label="Course Info, Ratings &amp; Share">
      <div class="ol-select-modal course-info-modal">
        <div class="ol-select-modal-header">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <span class="modal-lang-glyph" style="width:40px;height:40px;font-size:19px;">${escapeHtml(glyph)}</span>
            <div style="min-width:0;">
              <div class="ol-select-modal-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(title)}</div>
              <div style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px;">
                <span>Author: ${
                  meta.authorUrl
                    ? `<a href="${escapeHtml(meta.authorUrl)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-text);font-weight:700;text-decoration:underline;">${escapeHtml(meta.author)}</a>`
                    : `<strong>${escapeHtml(meta.author)}</strong>`
                }</span>
                <span>·</span>
                <span style="color:var(--gold);font-weight:800;">★ ${ratingSum.count ? `${ratingSum.average.toFixed(1)} (${ratingSum.count})` : 'New'}</span>
              </div>
            </div>
          </div>
          <button type="button" id="close-course-info-modal" class="ol-select-close" aria-label="Close">${uiIcon('x', 18)}</button>
        </div>

        <div class="course-info-body">
          <div class="course-info-actions">
            <button type="button" class="btn btn-primary btn-sm" id="course-info-start-btn" data-course-id="${escapeHtml(cid)}">
              ${uiIcon(isEnrolled ? 'play' : 'plus', 15)} ${isEnrolled ? 'Open Course' : 'Add & Start Course'}
            </button>
            <button type="button" class="btn btn-sm" data-share-course="${escapeHtml(cid)}">
              ${uiIcon('share', 15)} Share Link
            </button>
            <button type="button" class="btn btn-sm" data-open-external="${escapeHtml(meta.discordChannelUrl)}">
              ${uiIcon('discord', 15)} ${meta.hasDedicatedDiscord ? 'Course Discord' : 'Polygot Discord'}
            </button>
          </div>

          <div class="course-share-link-box">
            <span style="font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;">Shareable Course Link</span>
            <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
              <input type="text" class="input" readonly value="${escapeHtml(meta.shareUrl)}" style="padding:7px 10px;font-size:12px;font-family:monospace;" onclick="this.select()" />
              <button type="button" class="btn btn-sm" data-share-course="${escapeHtml(cid)}" style="white-space:nowrap;">${uiIcon('copy', 14)} Copy</button>
            </div>
          </div>

          <form id="course-review-form" class="course-review-form">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-size:13px;font-weight:800;">Rate &amp; Leave Feedback</span>
              <div class="star-picker" role="radiogroup" aria-label="Course star rating">
                ${[1, 2, 3, 4, 5]
                  .map(
                    (n) => `
                  <button type="button" class="star-pick-btn ${n <= draftStars ? 'active' : ''}" data-pick-star="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">
                    ${uiIcon(n <= draftStars ? 'star' : 'starOutline', 20)}
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>
            <textarea
              id="course-review-comment"
              class="input"
              rows="2"
              placeholder="Share what you liked, tips for learners, or suggestions for the author..."
              style="resize:vertical;font-size:13px;padding:9px 11px;"
            >${escapeHtml(state.courseReviewDraft?.comment || '')}</textarea>
            ${state.courseReviewNotice ? `<div style="font-size:12px;font-weight:700;color:var(--success);">${escapeHtml(state.courseReviewNotice)}</div>` : ''}
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
              <button type="submit" class="btn btn-primary btn-sm">${uiIcon('check', 14)} Save Review</button>
              <button type="button" class="btn btn-sm" id="publish-public-review-btn">${uiIcon('github', 14)} Publish Publicly</button>
            </div>
          </form>

          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:13px;font-weight:800;">Community Reviews &amp; Comments (${reviews.length})</span>
              <button type="button" class="btn btn-sm" id="refresh-course-reviews-btn" style="padding:4px 9px;font-size:11px;">${uiIcon('refresh', 12)} Refresh</button>
            </div>
            ${
              reviews.length
                ? `<div class="course-reviews-list">
                    ${reviews
                      .map((r) => {
                        const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '';
                        return `
                        <div class="course-review-item">
                          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                            <div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:800;">
                              <span>${escapeHtml(r.author)}</span>
                              <span class="pill" style="font-size:10px;padding:2px 6px;">${r.source === 'github' ? 'Public' : 'Yours'}</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
                              <span style="color:var(--gold);letter-spacing:1px;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
                              ${dateStr ? `<span style="color:var(--text-muted);">${escapeHtml(dateStr)}</span>` : ''}
                            </div>
                          </div>
                          ${r.comment ? `<div style="font-size:13px;color:var(--text-muted);margin-top:5px;line-height:1.45;white-space:pre-wrap;">${escapeHtml(r.comment)}</div>` : ''}
                        </div>
                      `;
                      })
                      .join('')}
                  </div>`
                : `<div style="font-size:13px;color:var(--text-muted);padding:12px;border-radius:12px;background:var(--surface-elevated);border:2px solid var(--border);text-align:center;">
                    No reviews yet — be the first to rate and comment on this course!
                  </div>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderUpdateProgressBlock(scope = 'modal') {
  const upd = state.updateInstall;
  if (!upd || (!upd.active && !upd.message)) return '';
  const pct = Math.max(0, Math.min(100, Number(upd.percent) || 0));
  const isError = upd.stage === 'error';
  const isDone = upd.stage === 'done';
  return `
    <div class="update-progress-box" data-update-progress-box="${scope}" style="margin-top:${scope === 'settings' ? '12px' : '0'};padding:10px 12px;border-radius:12px;background:var(--surface-elevated);border:2px solid ${isError ? 'var(--danger)' : isDone ? 'var(--success)' : 'var(--border)'};display:grid;gap:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;font-weight:700;color:${isError ? 'var(--danger)' : isDone ? 'var(--success)' : 'var(--text)'};">
        <span data-update-progress-msg="${scope}">${escapeHtml(upd.message || 'Updating...')}</span>
        ${upd.active && pct > 0 ? `<span data-update-progress-pct="${scope}">${pct}%</span>` : ''}
      </div>
      ${
        upd.active
          ? `<div class="progress-track" style="height:8px;"><div class="progress-fill" data-update-progress-bar="${scope}" style="width:${Math.max(4, pct)}%;"></div></div>`
          : ''
      }
    </div>
  `;
}

function startAppUpdate() {
  if (!state.updateInfo || state.updateInstall?.active) return;
  let lastStage = '';
  performAppUpdate(state.updateInfo, (prog) => {
    const prevActive = Boolean(state.updateInstall?.active);
    state.updateInstall = prog;
    const stageChanged = prog.stage !== lastStage || Boolean(prog.active) !== prevActive;
    lastStage = prog.stage;

    if (!stageChanged && prog.stage === 'downloading') {
      document.querySelectorAll('[data-update-progress-msg]').forEach((el) => {
        el.textContent = prog.message || 'Downloading update...';
      });
      document.querySelectorAll('[data-update-progress-pct]').forEach((el) => {
        el.textContent = `${Math.max(0, Math.min(100, Number(prog.percent) || 0))}%`;
      });
      document.querySelectorAll('[data-update-progress-bar]').forEach((el) => {
        el.style.width = `${Math.max(4, Math.min(100, Number(prog.percent) || 0))}%`;
      });
      return;
    }
    render();
  });
}

function renderUpdateModal() {
  if (!state.updateInfo?.hasUpdate || state.updateBannerDismissed) return '';
  const isUpdating = Boolean(state.updateInstall?.active);
  return `
    <div id="update-modal-backdrop" class="ol-select-overlay" role="dialog" aria-modal="true" aria-label="App Update Available">
      <div class="ol-select-modal" style="max-width:440px;">
        <div class="ol-select-modal-header">
          <div class="ol-select-modal-title" style="display:flex;align-items:center;gap:8px;">
            <span style="color:var(--accent-text);">${uiIcon('sparkles', 18)}</span>
            Update Available
          </div>
          <button type="button" id="banner-dismiss-update-btn" class="ol-select-close" aria-label="Close" ${isUpdating ? 'disabled' : ''}>${uiIcon('x', 18)}</button>
        </div>
        <div style="padding:18px;display:grid;gap:12px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${escapeHtml(getAppIconSrc())}" alt="Polygot" style="width:48px;height:48px;border-radius:50%;flex-shrink:0;" />
            <div>
              <div style="font-family:var(--font-display);font-size:19px;font-weight:700;">Polygot v${escapeHtml(state.updateInfo.latestVersion)}</div>
              <div style="font-size:12px;color:var(--text-muted);">Installed: v${escapeHtml(APP_CONFIG.appVersion)}</div>
            </div>
          </div>
          ${state.updateInfo.summary ? `<div style="font-size:13px;color:var(--text-muted);line-height:1.45;padding:10px 12px;border-radius:12px;background:var(--surface-elevated);border:2px solid var(--border);">${escapeHtml(state.updateInfo.summary)}</div>` : ''}
          ${renderUpdateProgressBlock('modal')}
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:4px;">
            <button type="button" class="btn btn-sm" id="banner-later-update-btn" ${isUpdating ? 'disabled' : ''}>Later</button>
            <button type="button" class="btn btn-primary btn-sm" id="banner-apply-update-btn" ${isUpdating ? 'disabled' : ''}>${uiIcon('download', 15)} ${isUpdating ? 'Installing...' : 'Install Update'}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderUpdateBanner() {
  return '';
}

function render() {
  if (!getMatrixLanguages().length && !state.courses.length) return;
  customSelectRegistry.clear();
  closeCustomSelectOverlay();

  // Cloud pre-sync screen: pull latest Google Drive progress BEFORE loading main UI
  if (state.syncingCloud) {
    document.getElementById('app').innerHTML = `
      <div class="auth-screen">
        <div class="auth-card">
          <div class="auth-logo">${uiIcon('cloud', 38)}</div>
          <h1 style="margin:0;font-size:24px;font-weight:700;">Syncing your progress...</h1>
          <p style="margin:8px 0 0;font-size:15px;color:var(--text-muted);">
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
    document.getElementById('app').innerHTML = `
      ${renderCourseOnboarding()}
      ${renderCourseInfoModal()}
      <div id="audio-toast" class="app-toast" role="status" aria-live="polite" style="display:${state.audioToast ? 'inline-flex' : 'none'};" title="Tap to dismiss">
        <span class="toast-text">${escapeHtml(state.audioToast)}</span>
        <span class="toast-dismiss" aria-hidden="true">${uiIcon('x', 14)}</span>
      </div>
    `;
    bindCustomSelect('onboarding-source-lang', (val) => {
      state.pickerSourceLang = val;
      render();
    });
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
    const onbCourseInfoBackdrop = document.getElementById('course-info-modal-backdrop');
    if (onbCourseInfoBackdrop) {
      onbCourseInfoBackdrop.addEventListener('click', (e) => {
        if (e.target === onbCourseInfoBackdrop || e.target.closest('#close-course-info-modal')) {
          state.courseInfoModalId = null;
          render();
        }
      });
    }
    const onbStartBtn = document.getElementById('course-info-start-btn');
    if (onbStartBtn) {
      onbStartBtn.addEventListener('click', async () => {
        const cid = onbStartBtn.dataset.courseId;
        state.courseInfoModalId = null;
        await enrollCourse(cid, true);
      });
    }
    document.querySelectorAll('[data-share-course]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const cid = btn.dataset.shareCourse;
        const url = buildCourseShareUrl({ id: cid });
        const res = await shareOrCopyCourseLink(url, cid);
        showToast(res === 'shared' ? 'Shared course link!' : `Course link copied: ${url}`);
      });
    });
    document.querySelectorAll('[data-open-external]').forEach((btn) => {
      btn.addEventListener('click', () => openExternalLink(btn.dataset.openExternal));
    });
    return;
  }

  const course = getActiveCourse();
  if (!course) return;

  const isActiveDrill =
    (state.view === 'lesson' &&
      state.lessonSession &&
      !state.lessonSession.showIntro &&
      state.lessonSession.index < state.lessonSession.exercises.length) ||
    (state.view === 'placement' &&
      state.placementSession &&
      !state.placementSession.showIntro &&
      state.placementSession.index < state.placementSession.questions.length);

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
    <main class="main ${isActiveDrill ? 'in-drill' : ''}">${isActiveDrill ? '' : renderUpdateBanner()}${mainContent}</main>
    ${isActiveDrill ? '' : renderMobileNav(course)}
    ${renderLessonSheet(course)}
    ${renderAddCourseModal()}
    ${renderCourseInfoModal()}
    ${isActiveDrill ? '' : renderUpdateModal()}
    <div id="audio-toast" class="app-toast" role="status" aria-live="polite" style="display:${state.audioToast ? 'inline-flex' : 'none'};" title="Tap to dismiss">
      <span class="toast-text">${escapeHtml(state.audioToast)}</span>
      <span class="toast-dismiss" aria-hidden="true">${uiIcon('x', 14)}</span>
    </div>
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

  try {
    await loadMatrixSyllabus();
    syncLanguageAppIcons(getMatrixLanguages());
  } catch (err) {
    console.error('Matrix syllabus load failed:', err);
  }

  try {
    const cachedLiveCat = JSON.parse(localStorage.getItem(STORAGE_KEYS.LIVE_CATALOG) || 'null');
    if (cachedLiveCat && Array.isArray(cachedLiveCat.entries) && cachedLiveCat.entries.length) {
      state.catalogEntries = cachedLiveCat.entries;
      state.liveCatalogLastSyncedAt = Number(cachedLiveCat.syncedAt) || 0;
    }
    const regRes = await fetch('./courses/registry.json');
    if (regRes.ok) {
      const reg = await regRes.json();
      const normalized = normalizeRegistryEntries(reg);
      if (normalized.length && !state.catalogEntries.length) state.catalogEntries = normalized;
    }
  } catch {
    // Ignore optional catalog fetch errors
  }

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

  // Synthesize any already-enrolled matrix courses before rendering
  await Promise.all(state.enrolledCourseIds.map((id) => ensureCourseLoaded(id).catch(() => null)));

  // Handle shareable course deep-link (?course=<id> and optional &import=<https-url>)
  try {
    const params = new URLSearchParams(window.location.search);
    const sharedCourseId = (params.get('course') || '').trim().toLowerCase();
    const sharedImportUrl = (params.get('import') || '').trim();
    if (sharedImportUrl && /^https:\/\//i.test(sharedImportUrl)) {
      const impRes = await fetch(sharedImportUrl);
      if (impRes.ok) {
        const impCourse = await impRes.json();
        if (impCourse && impCourse.id) {
          impCourse._source = 'github';
          impCourse._importUrl = sharedImportUrl;
          const idx = state.courses.findIndex((c) => c.id === impCourse.id);
          if (idx >= 0) state.courses[idx] = impCourse;
          else state.courses.push(impCourse);
          state.courseInfoModalId = impCourse.id;
        }
      }
    } else if (sharedCourseId) {
      await ensureCourseLoaded(sharedCourseId).catch(() => null);
      state.courseInfoModalId = sharedCourseId;
    }
    if (state.courseInfoModalId) {
      state.guestMode = true;
    }
  } catch {
    // Ignore malformed share query params
  }

  state.selectedSectionId = 'all';

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  if (getGoogleSession()) {
    await syncFromCloudBeforeUi();
  } else {
    render();
  }

  // Immediately check GitHub Releases for a newer version, auto-sync live course catalog, & prefetch public course ratings
  runUpdateCheck(false);
  autoRefreshLiveCatalog({ force: false, silent: true });
  fetchPublicCourseReviews(state.syncSettings.githubRepo, false).then(() => {
    if (state.showAddCourseModal || state.courseInfoModalId || state.view === 'syllabus' || state.view === 'settings') {
      render();
    }
  });
}

init();
