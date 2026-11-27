/**
 * Central OpenLingo Configuration.
 * - Course catalog syncs directly from your GitHub repository's `courses/registry.json`.
 * - Google Drive AppData backup uses public OAuth 2.0 Client IDs (never store any Client Secret here).
 */

export const APP_CONFIG = {
  appVersion: '0.0.9-beta',
  githubRepo: 'mahesh-labs/openlingo',
  githubBranch: 'main',
  discordUrl: 'https://discord.gg/pYMKxY4jE',
  donations: {
    githubSponsors: 'https://github.com/sponsors/mahesh-labs',
    kofi: '',
    buyMeACoffee: '',
    upiId: ''
  },
  googleClientId: '864103807022-hujf3ribsg6hact7erk1c3csv8i9u13a.apps.googleusercontent.com',
  googleAndroidClientId: '864103807022-ij4kc1nsdahpq4qvhi66v1nuern4on1h.apps.googleusercontent.com'
};

export function getGitHubRawBase(repo = APP_CONFIG.githubRepo, branch = APP_CONFIG.githubBranch) {
  return `https://raw.githubusercontent.com/${repo}/${branch}`;
}
