/**
 * GitHub Community Course Catalog Loader.
 * Fetches `courses/registry.json` and modular level files straight from GitHub,
 * allowing community PRs to add or update courses without re-releasing the app.
 */

import { APP_CONFIG, getGitHubRawBase } from './config.js';

export function normalizeRegistryEntries(registryData) {
  const list = Array.isArray(registryData?.courses) ? registryData.courses : [];
  return list.map((entry) => {
    if (typeof entry === 'string') {
      const cleanPath = entry.replace(/^\.\//, '');
      const id = cleanPath.split('/')[1] || cleanPath;
      return { id, path: cleanPath, title: id, version: '1.0.0' };
    }
    return {
      ...entry,
      path: String(entry.path || '').replace(/^\.\//, '')
    };
  });
}

export async function fetchGitHubCatalog(repo = APP_CONFIG.githubRepo, branch = APP_CONFIG.githubBranch) {
  const base = getGitHubRawBase(repo, branch);
  const url = `${base}/courses/registry.json?t=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`GitHub catalog fetch failed (HTTP ${res.status}). Check repo "${repo}" and branch "${branch}".`);
  }
  const data = await res.json();
  return {
    repo,
    branch,
    entries: normalizeRegistryEntries(data)
  };
}

export async function fetchCourseFromGitHub(entry, repo = APP_CONFIG.githubRepo, branch = APP_CONFIG.githubBranch) {
  const base = getGitHubRawBase(repo, branch);
  const manifestPath = String(entry.path || `courses/${entry.id}/course.json`).replace(/^\.\//, '');
  const manifestRes = await fetch(`${base}/${manifestPath}?t=${Date.now()}`, { cache: 'no-store' });
  if (!manifestRes.ok) {
    throw new Error(`Failed to fetch ${manifestPath} (HTTP ${manifestRes.status})`);
  }
  const course = await manifestRes.json();

  if (Array.isArray(course.sectionFiles) && course.sectionFiles.length) {
    const sections = await Promise.all(
      course.sectionFiles.map(async (sf) => {
        const cleanSf = String(sf).replace(/^\.\//, '');
        const r = await fetch(`${base}/${cleanSf}?t=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) throw new Error(`Failed to fetch ${cleanSf} (HTTP ${r.status})`);
        return r.json();
      })
    );
    course.sections = sections;
  }

  course._source = 'github';
  course._syncedAt = new Date().toISOString();
  return course;
}
