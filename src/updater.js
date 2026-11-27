/**
 * Cross-Platform In-App Update Checker for OpenLingo (Web PWA, Linux Desktop, Android APK).
 * Checks GitHub Releases API (including prereleases) and triggers the best platform update flow.
 */

import { APP_CONFIG } from './config.js';

const DISMISSED_KEY = 'openlingo_dismissed_update_v1';

function parseSemver(raw) {
  const clean = String(raw || '').trim().replace(/^v/i, '');
  const [core, pre = ''] = clean.split('-', 2);
  const nums = core.split('.').map((n) => parseInt(n, 10) || 0);
  while (nums.length < 3) nums.push(0);
  return { major: nums[0], minor: nums[1], patch: nums[2], pre };
}

export function compareVersions(a, b) {
  const va = parseSemver(a);
  const vb = parseSemver(b);
  if (va.major !== vb.major) return va.major > vb.major ? 1 : -1;
  if (va.minor !== vb.minor) return va.minor > vb.minor ? 1 : -1;
  if (va.patch !== vb.patch) return va.patch > vb.patch ? 1 : -1;
  if (!va.pre && vb.pre) return 1;
  if (va.pre && !vb.pre) return -1;
  if (va.pre === vb.pre) return 0;
  return va.pre > vb.pre ? 1 : -1;
}

export function isNewerVersion(candidate, current = APP_CONFIG.appVersion) {
  return compareVersions(candidate, current) > 0;
}

export function getDismissedUpdateVersion() {
  try {
    return localStorage.getItem(DISMISSED_KEY) || '';
  } catch {
    return '';
  }
}

export function dismissUpdateVersion(version) {
  try {
    localStorage.setItem(DISMISSED_KEY, String(version || ''));
  } catch {
    // Ignore storage errors
  }
}

export function detectRuntimePlatform() {
  if (typeof window !== 'undefined' && (window.AndroidBackup || window.AndroidGoogleAuth || window.AndroidUpdater)) {
    return 'android';
  }
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (/Linux/i.test(ua) && !/Android/i.test(ua) && (host === 'localhost' || host === '127.0.0.1')) {
    return 'linux';
  }
  return 'web';
}

export function openExternalLink(url) {
  if (!url) return;
  if (typeof window !== 'undefined' && window.AndroidUpdater && typeof window.AndroidUpdater.openExternalUrl === 'function') {
    window.AndroidUpdater.openExternalUrl(url);
    return;
  }
  if (detectRuntimePlatform() === 'linux') {
    fetch('/__desktop/open-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    }).catch(() => {
      window.open(url, '_blank', 'noopener,noreferrer');
    });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function checkForAppUpdate(repo = APP_CONFIG.githubRepo, currentVersion = APP_CONFIG.appVersion) {
  const url = `https://api.github.com/repos/${repo}/releases?per_page=1`;
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error(`Update check failed (HTTP ${res.status}).`);
  }
  const list = await res.json();
  const latest = Array.isArray(list) ? list[0] : list;
  if (!latest || !latest.tag_name) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      checkedAt: new Date().toISOString()
    };
  }

  const latestVersion = String(latest.tag_name).replace(/^v/i, '');
  const assets = Array.isArray(latest.assets) ? latest.assets : [];
  const apkAsset = assets.find((a) => /\.apk$/i.test(a.name || ''));
  const appImageAsset = assets.find((a) => /\.AppImage$/i.test(a.name || ''));
  const debAsset = assets.find((a) => /\.deb$/i.test(a.name || ''));
  const platform = detectRuntimePlatform();

  let downloadUrl = latest.html_url || `https://github.com/${repo}/releases/tag/${latest.tag_name}`;
  if (platform === 'android' && apkAsset?.browser_download_url) {
    downloadUrl = apkAsset.browser_download_url;
  } else if (platform === 'linux' && appImageAsset?.browser_download_url) {
    downloadUrl = latest.html_url || appImageAsset.browser_download_url;
  }

  const summaryLine = String(latest.body || '')
    .split('\n')
    .map((l) => l.replace(/^[-*#\s]+/, '').trim())
    .find((l) => l && !/^OpenLingo v/i.test(l) && !/^Highlights$/i.test(l)) || '';

  return {
    hasUpdate: isNewerVersion(latestVersion, currentVersion),
    currentVersion,
    latestVersion,
    tagName: latest.tag_name,
    releaseUrl: latest.html_url || `https://github.com/${repo}/releases/tag/${latest.tag_name}`,
    downloadUrl,
    apkUrl: apkAsset?.browser_download_url || '',
    debUrl: debAsset?.browser_download_url || '',
    appImageUrl: appImageAsset?.browser_download_url || '',
    publishedAt: latest.published_at || '',
    summary: summaryLine.slice(0, 160),
    platform,
    checkedAt: new Date().toISOString()
  };
}

export async function performAppUpdate(updateInfo) {
  const platform = detectRuntimePlatform();
  if (platform === 'web') {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update().catch(() => {})));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // Ignore cache error and still reload
    }
    window.location.reload();
    return;
  }

  if (platform === 'android') {
    const targetUrl = updateInfo?.apkUrl || updateInfo?.downloadUrl || updateInfo?.releaseUrl;
    if (window.AndroidUpdater && typeof window.AndroidUpdater.openExternalUrl === 'function') {
      window.AndroidUpdater.openExternalUrl(targetUrl);
    } else {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
    return;
  }

  // Linux Desktop: open Release page (or direct package download) in default browser
  const targetUrl = updateInfo?.releaseUrl || updateInfo?.downloadUrl;
  openExternalLink(targetUrl);
}
