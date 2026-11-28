/**
 * Zero-Server Sign in with Google + Personal Google Drive AppData Backup.
 * Uses Google Identity Services (GIS) OAuth2 Token Client + Drive v3 `appDataFolder` scope.
 * Each learner's progress is stored privately in their own Google Drive — no backend server required.
 */

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata openid email profile';
const BACKUP_FILENAME = 'polygot-backup.json';
const SESSION_STORAGE_KEY = 'polygot_google_session_v1';

let gisLoadPromise = null;
let accessToken = null;
let tokenExpiresAt = 0;
let userProfile = null;

function restorePersistedSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || 'null');
    if (raw && raw.accessToken && raw.tokenExpiresAt && Date.now() < raw.tokenExpiresAt) {
      accessToken = raw.accessToken;
      tokenExpiresAt = raw.tokenExpiresAt;
      userProfile = raw.userProfile || null;
    }
  } catch {
    // Ignore storage errors
  }
}

function persistSession() {
  try {
    if (accessToken && tokenExpiresAt > Date.now()) {
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ accessToken, tokenExpiresAt, userProfile })
      );
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

restorePersistedSession();

function loadGisScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisLoadPromise = null;
      reject(new Error('Could not load Google Sign-In script. Check your internet connection.'));
    };
    document.head.appendChild(script);
  });
  return gisLoadPromise;
}

export function getGoogleSession() {
  if (!accessToken || Date.now() >= tokenExpiresAt) {
    return null;
  }
  return { accessToken, user: userProfile };
}

async function detectDesktopBridge() {
  try {
    const res = await fetch('/__desktop/info', { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data && data.desktop);
  } catch {
    return false;
  }
}

async function signInViaDesktopDefaultBrowser(webClientId) {
  const startRes = await fetch('/__desktop/auth/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: webClientId })
  });
  if (!startRes.ok) {
    throw new Error('Could not launch default browser for Google Sign-In.');
  }
  const { state: authState } = await startRes.json();
  const deadline = Date.now() + 180000; // 3 minute timeout

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 600));
    const pollRes = await fetch(`/__desktop/auth/poll?state=${encodeURIComponent(authState)}`, {
      cache: 'no-store'
    });
    if (!pollRes.ok) {
      throw new Error('Sign-in session expired. Please try again.');
    }
    const poll = await pollRes.json();
    if (poll.status === 'done' && poll.access_token) {
      return { access_token: poll.access_token, expires_in: Number(poll.expires_in || 3500) };
    }
    if (poll.status === 'error' || poll.status === 'cancelled') {
      throw new Error(poll.error || 'Google Sign-In was cancelled.');
    }
  }
  throw new Error('Timed out waiting for sign-in in your default browser.');
}

export async function signInWithGoogle(webClientId, androidClientId = '') {
  // Native Android APK path: RFC 8252 system-browser OAuth 2.0 + PKCE (avoids WebView disallowed_useragent)
  if (window.AndroidGoogleAuth && typeof window.AndroidGoogleAuth.signIn === 'function') {
    const aId = String(androidClientId || '').trim();
    if (!aId) throw new Error('Android Google Client ID is not configured.');

    const tokenResp = await new Promise((resolve, reject) => {
      window.onAndroidGoogleAuth = (token, expiresIn, errMsg) => {
        delete window.onAndroidGoogleAuth;
        if (errMsg) reject(new Error(errMsg));
        else if (!token) reject(new Error('Google Sign-In was cancelled.'));
        else resolve({ access_token: token, expires_in: Number(expiresIn || 3500) });
      };
      window.AndroidGoogleAuth.signIn(aId);
    });

    accessToken = tokenResp.access_token;
    tokenExpiresAt = Date.now() + (tokenResp.expires_in * 1000) - 30000;
    try {
      const profRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (profRes.ok) userProfile = await profRes.json();
    } catch {
      userProfile = { name: 'Google User', email: '' };
    }
    persistSession();
    return getGoogleSession();
  }

  const cleanId = String(webClientId || '').trim();
  if (!cleanId) {
    throw new Error('Google Web Client ID is not configured.');
  }

  // Linux Desktop app path: delegate Sign in with Google to the system default browser
  // so the user reuses their existing Google session without re-entering credentials!
  let tokenResp;
  if (await detectDesktopBridge()) {
    tokenResp = await signInViaDesktopDefaultBrowser(cleanId);
  } else {
    // Web PWA path: Google Identity Services OAuth2 Token Client directly in current browser
    await loadGisScript();

    tokenResp = await new Promise((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: cleanId,
        scope: DRIVE_SCOPE,
        callback: (resp) => {
          if (resp.error) reject(new Error(resp.error_description || resp.error));
          else resolve(resp);
        },
        error_callback: (err) => {
          reject(new Error(err?.message || 'Google Sign-In popup closed or blocked.'));
        }
      });
      tokenClient.requestAccessToken({ prompt: 'select_account' });
    });
  }

  accessToken = tokenResp.access_token;
  tokenExpiresAt = Date.now() + (Number(tokenResp.expires_in || 3500) * 1000) - 30000;

  // Fetch basic user profile (name, email, picture)
  try {
    const profRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (profRes.ok) {
      userProfile = await profRes.json();
    }
  } catch {
    userProfile = { name: 'Google User', email: '' };
  }

  persistSession();
  return getGoogleSession();
}

export function signOutGoogle() {
  if (accessToken && window.google?.accounts?.oauth2) {
    try {
      window.google.accounts.oauth2.revoke(accessToken, () => {});
    } catch {
      // Ignore revoke errors
    }
  }
  accessToken = null;
  tokenExpiresAt = 0;
  userProfile = null;
  persistSession();
}

async function findExistingBackupFile(token) {
  const q = encodeURIComponent(`name='${BACKUP_FILENAME}' and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Google Drive list failed (HTTP ${res.status}). Ensure Google Drive API is enabled.`);
  const data = await res.json();
  return data.files?.[0] || null;
}

export async function backupToGoogleDrive(backupPayload) {
  const session = getGoogleSession();
  if (!session) throw new Error('Please sign in with Google first.');

  const existing = await findExistingBackupFile(session.accessToken);
  const jsonBody = JSON.stringify(backupPayload, null, 2);

  if (existing) {
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`;
    const res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: jsonBody
    });
    if (!res.ok) throw new Error(`Google Drive update failed (HTTP ${res.status}).`);
    return { updated: true, fileId: existing.id, savedAt: new Date().toISOString() };
  }

  // Create new file inside private appDataFolder using multipart upload
  const boundary = 'polygot_boundary_' + Date.now();
  const metadata = JSON.stringify({
    name: BACKUP_FILENAME,
    parents: ['appDataFolder']
  });
  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${jsonBody}\r\n` +
    `--${boundary}--`;

  const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  });
  if (!createRes.ok) throw new Error(`Google Drive upload failed (HTTP ${createRes.status}).`);
  const created = await createRes.json();
  return { updated: false, fileId: created.id, savedAt: new Date().toISOString() };
}

export async function restoreFromGoogleDrive() {
  const session = getGoogleSession();
  if (!session) throw new Error('Please sign in with Google first.');

  const existing = await findExistingBackupFile(session.accessToken);
  if (!existing) {
    throw new Error('No Polygot backup found in your Google Drive yet. Save a backup first!');
  }

  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${session.accessToken}` }
  });
  if (!res.ok) throw new Error(`Google Drive download failed (HTTP ${res.status}).`);
  const text = await res.text();
  return { text, modifiedTime: existing.modifiedTime };
}
