/**
 * Zero-Server Course Social Layer:
 * - Course Author & Discord Channel resolution
 * - Shareable course deep-links (?course=<id> and optional &import=<raw-json-url>)
 * - Local + Public GitHub Issues-backed Star Ratings (1-5), Feedback & Comments
 * - Popularity & Rating sorting across the course catalog
 */

import { APP_CONFIG } from './config.js';

const LOCAL_REVIEWS_KEY = 'openlingo_course_reviews_v1';
const PUBLIC_CACHE_KEY = 'openlingo_public_course_reviews_cache_v1';
const PUBLIC_CACHE_TTL_MS = 5 * 60 * 1000;

let publicReviewsByCourse = {};
let publicFetchPromise = null;

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function getLocalCourseReviews() {
  const data = readJsonStorage(LOCAL_REVIEWS_KEY, {});
  return data && typeof data === 'object' ? data : {};
}

export function saveLocalCourseReview(courseId, { rating, comment, authorName }) {
  const id = String(courseId || '').trim();
  const stars = Math.max(1, Math.min(5, Math.round(Number(rating) || 0)));
  if (!id || !stars) return null;

  const all = getLocalCourseReviews();
  const list = Array.isArray(all[id]) ? [...all[id]] : [];
  const reviewer = String(authorName || 'OpenLingo Learner').trim().slice(0, 60);
  const text = String(comment || '').trim().slice(0, 600);
  const nowIso = new Date().toISOString();

  // Update the learner's own existing local review if present, otherwise prepend
  const existingIdx = list.findIndex((r) => r.isMine);
  const entry = {
    id: existingIdx >= 0 ? list[existingIdx].id : `local-${Date.now()}`,
    courseId: id,
    rating: stars,
    comment: text,
    author: reviewer,
    createdAt: nowIso,
    source: 'local',
    isMine: true
  };
  if (existingIdx >= 0) {
    list[existingIdx] = entry;
  } else {
    list.unshift(entry);
  }
  all[id] = list;
  writeJsonStorage(LOCAL_REVIEWS_KEY, all);
  return entry;
}

export function mergeReviewsFromCloud(cloudReviews) {
  if (!cloudReviews || typeof cloudReviews !== 'object') return;
  const local = getLocalCourseReviews();
  let changed = false;
  for (const [cid, list] of Object.entries(cloudReviews)) {
    if (!Array.isArray(list)) continue;
    const existing = Array.isArray(local[cid]) ? local[cid] : [];
    const byId = new Map(existing.map((r) => [r.id, r]));
    for (const r of list) {
      if (r && r.id && !byId.has(r.id)) {
        byId.set(r.id, r);
        changed = true;
      }
    }
    if (changed) {
      local[cid] = Array.from(byId.values()).sort((a, b) =>
        String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      );
    }
  }
  if (changed) writeJsonStorage(LOCAL_REVIEWS_KEY, local);
}

function parseReviewIssue(issue) {
  if (!issue || issue.pull_request) return null;
  const body = String(issue.body || '');
  const title = String(issue.title || '');

  const courseMatch =
    body.match(/Course\s*ID\s*:\s*`?([a-z0-9_-]+)`?/i) ||
    title.match(/\[Review\]\s*([a-z0-9_-]+)/i);
  const ratingMatch =
    body.match(/Rating\s*:\s*([1-5])(?:\s*\/\s*5)?/i) ||
    title.match(/\b([1-5])\s*\/\s*5\b/);

  if (!courseMatch || !ratingMatch) return null;

  const courseId = courseMatch[1].toLowerCase().trim();
  const rating = Math.max(1, Math.min(5, parseInt(ratingMatch[1], 10)));

  // Extract comment text after "Feedback:" or strip metadata header lines
  let comment = '';
  const fbMatch = body.match(/Feedback\s*:\s*([\s\S]+)/i);
  if (fbMatch) {
    comment = fbMatch[1].trim();
  } else {
    comment = body
      .split('\n')
      .filter((line) => !/^(Course\s*ID|Course|Rating|Author)\s*:/i.test(line.trim()))
      .join('\n')
      .trim();
  }

  return {
    id: `gh-${issue.number}`,
    courseId,
    rating,
    comment: comment.slice(0, 600),
    author: issue.user?.login || 'GitHub Learner',
    authorUrl: issue.user?.html_url || '',
    issueUrl: issue.html_url || '',
    createdAt: issue.created_at || '',
    source: 'github',
    isMine: false
  };
}

export async function fetchPublicCourseReviews(repo = APP_CONFIG.githubRepo, force = false) {
  const cached = readJsonStorage(PUBLIC_CACHE_KEY, null);
  if (!force && cached && cached.repo === repo && Date.now() - (cached.fetchedAt || 0) < PUBLIC_CACHE_TTL_MS) {
    publicReviewsByCourse = cached.byCourse || {};
    return publicReviewsByCourse;
  }
  if (publicFetchPromise && !force) return publicFetchPromise;

  publicFetchPromise = (async () => {
    try {
      const url = `https://api.github.com/repos/${repo}/issues?labels=course-review&state=all&per_page=100`;
      const res = await fetch(url, {
        headers: { Accept: 'application/vnd.github+json' },
        cache: 'no-store'
      });
      if (!res.ok) return publicReviewsByCourse;
      const issues = await res.json();
      const map = {};
      if (Array.isArray(issues)) {
        for (const issue of issues) {
          const parsed = parseReviewIssue(issue);
          if (!parsed) continue;
          if (!map[parsed.courseId]) map[parsed.courseId] = [];
          map[parsed.courseId].push(parsed);
        }
      }
      publicReviewsByCourse = map;
      writeJsonStorage(PUBLIC_CACHE_KEY, { repo, fetchedAt: Date.now(), byCourse: map });
      return map;
    } catch {
      return publicReviewsByCourse;
    } finally {
      publicFetchPromise = null;
    }
  })();

  return publicFetchPromise;
}

export function getCourseReviews(courseId) {
  const id = String(courseId || '').toLowerCase();
  const local = (getLocalCourseReviews()[id] || []).map((r) => ({ ...r }));
  const pub = (publicReviewsByCourse[id] || []).map((r) => ({ ...r }));
  const combined = [...local, ...pub];
  combined.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return combined;
}

export function getCourseRatingSummary(courseId) {
  const reviews = getCourseReviews(courseId);
  if (!reviews.length) {
    return { average: 0, count: 0, popularityScore: 0 };
  }
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  const average = Math.round((sum / reviews.length) * 10) / 10;
  // Bayesian-style popularity score so courses with more high ratings rank higher
  const popularityScore = Math.round((average * reviews.length + average * 0.5) * 100) / 100;
  return { average, count: reviews.length, popularityScore };
}

export function getCourseDiscordUrl(courseOrTargetCode, courseId = '') {
  const explicit =
    typeof courseOrTargetCode === 'object' && courseOrTargetCode
      ? courseOrTargetCode.discordChannelUrl
      : '';
  if (explicit && /^https?:\/\//i.test(explicit)) return explicit;

  const map = APP_CONFIG.courseDiscordChannels || {};
  const idKey = String(courseId || courseOrTargetCode?.id || '').toLowerCase();
  if (idKey && map[idKey] && /^https?:\/\//i.test(map[idKey])) return map[idKey];

  const targetCode = String(
    typeof courseOrTargetCode === 'string'
      ? courseOrTargetCode
      : courseOrTargetCode?.targetLang?.code || idKey.split('-')[1] || ''
  ).toLowerCase();

  if (targetCode && map[targetCode] && /^https?:\/\//i.test(map[targetCode])) {
    return map[targetCode];
  }
  return APP_CONFIG.discordUrl;
}

export function getCourseMeta(course, fallback = {}) {
  const id = course?.id || fallback.id || '';
  const targetCode = course?.targetLang?.code || fallback.targetCode || id.split('-')[1] || '';
  const author =
    course?.author ||
    fallback.author ||
    (course?._source === 'custom' ? 'Local Draft Author' : 'OpenLingo Core Team');
  const authorUrl =
    course?.authorUrl ||
    fallback.authorUrl ||
    (author === 'OpenLingo Core Team' ? `https://github.com/${APP_CONFIG.githubRepo}` : '');
  const discordChannelUrl = getCourseDiscordUrl(course || targetCode, id);
  const shareUrl = buildCourseShareUrl({
    id,
    importUrl: course?._importUrl || fallback.importUrl || ''
  });
  return {
    id,
    title: course?.title || fallback.title || id,
    author,
    authorUrl,
    discordChannelUrl,
    hasDedicatedDiscord: discordChannelUrl !== APP_CONFIG.discordUrl,
    shareUrl
  };
}

export function buildCourseShareUrl({ id, importUrl = '' }) {
  const base = (APP_CONFIG.publicWebUrl || 'https://mahesh-labs.github.io/openlingo/').replace(/\/?$/, '/');
  const params = new URLSearchParams();
  if (id) params.set('course', String(id));
  if (importUrl && /^https:\/\//i.test(importUrl)) {
    params.set('import', importUrl);
  }
  return `${base}?${params.toString()}`;
}

export function buildPublicReviewIssueUrl({ courseId, courseTitle, rating, comment, repo = APP_CONFIG.githubRepo }) {
  const stars = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
  const starEmoji = '★'.repeat(stars) + '☆'.repeat(5 - stars);
  const title = `[Review] ${courseId} — ${stars}/5 (${courseTitle || courseId})`;
  const body = [
    `Course ID: \`${courseId}\``,
    `Course: ${courseTitle || courseId}`,
    `Rating: ${stars}/5 (${starEmoji})`,
    '',
    'Feedback:',
    String(comment || '').trim() || 'Great course!'
  ].join('\n');

  const params = new URLSearchParams({
    labels: 'course-review',
    title,
    body
  });
  return `https://github.com/${repo}/issues/new?${params.toString()}`;
}

export async function shareOrCopyCourseLink(shareUrl, courseTitle = 'OpenLingo Course') {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: `${courseTitle} — OpenLingo`,
        text: `Learn ${courseTitle} for free on OpenLingo!`,
        url: shareUrl
      });
      return 'shared';
    } catch {
      // User cancelled share sheet or unsupported — fall through to copy
    }
  }
  if (typeof window !== 'undefined' && window.AndroidBackup && typeof window.AndroidBackup.copyToClipboard === 'function') {
    window.AndroidBackup.copyToClipboard(shareUrl);
    return 'copied';
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(shareUrl);
    return 'copied';
  }
  return 'manual';
}
