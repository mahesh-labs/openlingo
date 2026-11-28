/**
 * Central Polygot Configuration.
 * - Course catalog syncs directly from your GitHub repository's `courses/registry.json`.
 * - Google Drive AppData backup uses public OAuth 2.0 Client IDs (never store any Client Secret here).
 */

export const APP_CONFIG = {
  appVersion: '0.1.1-beta',
  publicWebUrl: 'https://mahesh-labs.github.io/polygot/',
  githubRepo: 'mahesh-labs/polygot',
  githubBranch: 'main',
  discordUrl: 'https://discord.gg/pYMKxY4jE',
  // Map language code or course ID -> direct Discord channel URL (auto-populated by scripts/setup-discord-server.py)
  courseDiscordChannels: {
    ar: 'https://discord.com/channels/1575573927554719865/1575778423807279205',
    en: 'https://discord.com/channels/1575573927554719865/1575778390395326504',
    es: 'https://discord.com/channels/1575573927554719865/1575778427699732532',
    fr: 'https://discord.com/channels/1575573927554719865/1575778431797563463',
    hi: 'https://discord.com/channels/1575573927554719865/1575778408531492925',
    ja: 'https://discord.com/channels/1575573927554719865/1575778412096790548',
    kn: 'https://discord.com/channels/1575573927554719865/1575778401430667356',
    ko: 'https://discord.com/channels/1575573927554719865/1575778419457663109',
    ml: 'https://discord.com/channels/1575573927554719865/1575778393994043513',
    ru: 'https://discord.com/channels/1575573927554719865/1575778435354071060',
    ta: 'https://discord.com/channels/1575573927554719865/1575778397819371571',
    te: 'https://discord.com/channels/1575573927554719865/1575778404941430925',
    zh: 'https://discord.com/channels/1575573927554719865/1575778415758540893'
  },
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
