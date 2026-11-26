/**
 * Central OpenLingo Configuration.
 * - Course catalog syncs directly from your GitHub repository's `courses/registry.json`.
 * - Google Drive AppData backup uses a free client-side OAuth 2.0 Web Client ID (no backend server needed).
 */

export const APP_CONFIG = {
  githubRepo: 'mahesh-labs/openlingo',
  githubBranch: 'main',
  googleClientId: '864103807022-ij4kc1nsdahpq4qvhi66v1nuern4on1h.apps.googleusercontent.com'
};

export function getGitHubRawBase(repo = APP_CONFIG.githubRepo, branch = APP_CONFIG.githubBranch) {
  return `https://raw.githubusercontent.com/${repo}/${branch}`;
}
