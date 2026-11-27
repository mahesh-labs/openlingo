package org.openlingo.app;

import android.accounts.Account;
import android.accounts.AccountManager;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.common.api.Scope;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends Activity {
    private static final String VIRTUAL_HOST = "appassets.openlingo.local";
    private static final String START_URL = "https://" + VIRTUAL_HOST + "/index.html";
    private static final int REQ_SAVE_BACKUP = 4101;
    private static final int REQ_OPEN_BACKUP = 4102;
    private static final int REQ_FILE_CHOOSER = 4103;
    private static final int REQ_PICK_GOOGLE_ACCOUNT = 4104;
    private static final int REQ_GMS_AUTHORIZE = 4105;
    private static final int REQ_UNKNOWN_SOURCES = 4106;
    private static final String ACTION_INSTALL_STATUS = "org.openlingo.app.ACTION_INSTALL_STATUS";

    private WebView webView;
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;
    private String pendingExportContent = null;
    private ValueCallback<Uri[]> fileChooserCallback = null;
    private AppIconBridge appIconBridge = null;

    // Pending OAuth state for Android native Google Sign-In & browser fallback
    private String pendingOAuthClientId = null;
    private String pendingOAuthRedirectUri = null;
    private String pendingCodeVerifier = null;
    private String pendingPickedAccountEmail = null;

    // Pending direct in-app APK update state
    private String pendingInstallApkUrl = null;
    private volatile boolean isInstallingUpdate = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#121024"));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#121024"));
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                if (Build.VERSION.SDK_INT >= 30) {
                    android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                    v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                } else {
                    v.setPadding(
                            insets.getSystemWindowInsetLeft(),
                            insets.getSystemWindowInsetTop(),
                            insets.getSystemWindowInsetRight(),
                            insets.getSystemWindowInsetBottom());
                }
                return insets;
            }
        });

        setContentView(root);

        initTts();
        configureWebView();
        webView.loadUrl(START_URL);
        handleOAuthIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (handlePackageInstallStatus(intent)) {
            return;
        }
        handleOAuthIntent(intent);
    }

    @SuppressWarnings("deprecation")
    private boolean handlePackageInstallStatus(Intent intent) {
        if (intent == null || !ACTION_INSTALL_STATUS.equals(intent.getAction())) {
            return false;
        }
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirmIntent = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirmIntent != null) {
                confirmIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    startActivity(confirmIntent);
                    deliverUpdateProgress("confirm", 100, "Tap Update in the Android prompt to finish installing.");
                } catch (Exception e) {
                    isInstallingUpdate = false;
                    pendingInstallApkUrl = null;
                    deliverUpdateProgress("error", 0, "Could not launch Android installer: " + e.getMessage());
                }
            }
            return true;
        }
        isInstallingUpdate = false;
        pendingInstallApkUrl = null;
        if (status == PackageInstaller.STATUS_SUCCESS) {
            deliverUpdateProgress("done", 100, "Update installed!");
        } else if (status == PackageInstaller.STATUS_FAILURE_ABORTED) {
            deliverUpdateProgress("cancelled", 0, "Update cancelled.");
        } else {
            String msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
            deliverUpdateProgress("error", 0, (msg != null && !msg.isEmpty()) ? msg : "Install failed (code " + status + ").");
        }
        return true;
    }

    private void deliverUpdateProgress(final String stage, final int percent, final String message) {
        final String jsStage = escapeJs(stage == null ? "" : stage);
        final String jsMsg = escapeJs(message == null ? "" : message);
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (webView != null) {
                    webView.evaluateJavascript(
                            "window.onAppUpdateProgress && window.onAppUpdateProgress('" + jsStage + "', " + percent + ", '" + jsMsg + "')",
                            null);
                }
            }
        });
    }

    private void handleOAuthIntent(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        Uri data = intent.getData();
        String scheme = data.getScheme();
        if (scheme == null || !scheme.startsWith("com.googleusercontent.apps.")) return;

        String error = data.getQueryParameter("error");
        if (error != null) {
            deliverOAuthResult(null, 0, "Google Sign-In error: " + error);
            return;
        }
        final String code = data.getQueryParameter("code");
        if (code == null || pendingOAuthClientId == null || pendingCodeVerifier == null || pendingOAuthRedirectUri == null) {
            return;
        }

        final String clientId = pendingOAuthClientId;
        final String redirectUri = pendingOAuthRedirectUri;
        final String verifier = pendingCodeVerifier;
        pendingCodeVerifier = null;

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    String form = "client_id=" + URLEncoder.encode(clientId, "UTF-8")
                            + "&code=" + URLEncoder.encode(code, "UTF-8")
                            + "&code_verifier=" + URLEncoder.encode(verifier, "UTF-8")
                            + "&redirect_uri=" + URLEncoder.encode(redirectUri, "UTF-8")
                            + "&grant_type=authorization_code";

                    HttpURLConnection conn = (HttpURLConnection) new URL("https://oauth2.googleapis.com/token").openConnection();
                    conn.setRequestMethod("POST");
                    conn.setDoOutput(true);
                    conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
                    try (OutputStream out = conn.getOutputStream()) {
                        out.write(form.getBytes(StandardCharsets.UTF_8));
                    }

                    int status = conn.getResponseCode();
                    InputStream stream = (status >= 200 && status < 300) ? conn.getInputStream() : conn.getErrorStream();
                    String body = readStreamUtf8(stream);
                    JSONObject json = new JSONObject(body);

                    if (status >= 200 && status < 300 && json.has("access_token")) {
                        deliverOAuthResult(json.getString("access_token"), json.optInt("expires_in", 3500), null);
                    } else {
                        String desc = json.optString("error_description", json.optString("error", "Token exchange failed"));
                        deliverOAuthResult(null, 0, desc);
                    }
                } catch (Exception e) {
                    deliverOAuthResult(null, 0, "Token exchange error: " + e.getMessage());
                }
            }
        }).start();
    }

    private void deliverOAuthResult(final String token, final int expiresIn, final String errorMsg) {
        pendingOAuthClientId = null;
        pendingPickedAccountEmail = null;
        final String jsToken = token == null ? "null" : "'" + escapeJs(token) + "'";
        final String jsErr = errorMsg == null ? "null" : "'" + escapeJs(errorMsg) + "'";
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (webView != null) {
                    webView.evaluateJavascript(
                            "window.onAndroidGoogleAuth && window.onAndroidGoogleAuth(" + jsToken + ", " + expiresIn + ", " + jsErr + ")",
                            null);
                }
            }
        });
    }

    private String readStreamUtf8(InputStream in) throws IOException {
        if (in == null) return "{}";
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        byte[] chunk = new byte[4096];
        int n;
        while ((n = in.read(chunk)) != -1) buf.write(chunk, 0, n);
        return new String(buf.toByteArray(), StandardCharsets.UTF_8);
    }

    private String escapeJs(String s) {
        return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ").replace("\r", "");
    }

    private void initTts() {
        tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                ttsReady = (status == TextToSpeech.SUCCESS);
            }
        });
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setBuiltInZoomControls(false);

        webView.addJavascriptInterface(new TtsBridge(), "AndroidTTS");
        webView.addJavascriptInterface(new BackupBridge(), "AndroidBackup");
        webView.addJavascriptInterface(new GoogleAuthBridge(), "AndroidGoogleAuth");
        webView.addJavascriptInterface(new UpdaterBridge(), "AndroidUpdater");
        appIconBridge = new AppIconBridge();
        webView.addJavascriptInterface(appIconBridge, "AndroidAppIcon");
        appIconBridge.reconcileAliases();

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileChooserCallback != null) {
                    fileChooserCallback.onReceiveValue(null);
                }
                fileChooserCallback = filePathCallback;
                try {
                    Intent intent = fileChooserParams.createIntent();
                    startActivityForResult(intent, REQ_FILE_CHOOSER);
                    return true;
                } catch (Exception e) {
                    fileChooserCallback = null;
                    return false;
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri != null && VIRTUAL_HOST.equals(uri.getHost())) {
                    return serveAsset(uri.getPath());
                }
                return super.shouldInterceptRequest(view, request);
            }
        });
    }

    private WebResourceResponse serveAsset(String rawPath) {
        String path = (rawPath == null || rawPath.isEmpty() || "/".equals(rawPath))
                ? "index.html"
                : rawPath.startsWith("/") ? rawPath.substring(1) : rawPath;

        try {
            InputStream stream = getAssets().open("www/" + path);
            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "https://" + VIRTUAL_HOST);
            headers.put("Cache-Control", "no-cache");
            return new WebResourceResponse(guessMimeType(path), "UTF-8", 200, "OK", headers, stream);
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, null);
        }
    }

    private String guessMimeType(String path) {
        String lower = path.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".webmanifest")) return "application/manifest+json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".ogg")) return "audio/ogg";
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        return "application/octet-stream";
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == REQ_PICK_GOOGLE_ACCOUNT) {
            final String clientId = pendingOAuthClientId;
            if (resultCode != Activity.RESULT_OK || data == null) {
                deliverOAuthResult(null, 0, "Google Sign-In was cancelled.");
                return;
            }
            final String accountName = data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
            final String accountType = data.getStringExtra(AccountManager.KEY_ACCOUNT_TYPE);
            if (accountName == null || accountName.isEmpty()) {
                launchBrowserOAuth(clientId, null);
                return;
            }
            pendingPickedAccountEmail = accountName;
            authorizePickedGoogleAccount(clientId, new Account(accountName, accountType != null ? accountType : "com.google"));
            return;
        }

        if (requestCode == REQ_GMS_AUTHORIZE) {
            final String clientId = pendingOAuthClientId;
            final String emailHint = pendingPickedAccountEmail;
            if (resultCode == Activity.RESULT_OK && data != null) {
                try {
                    AuthorizationResult authResult = Identity.getAuthorizationClient(this)
                            .getAuthorizationResultFromIntent(data);
                    String token = authResult != null ? authResult.getAccessToken() : null;
                    if (token != null && !token.isEmpty()) {
                        deliverOAuthResult(token, 3500, null);
                        return;
                    }
                } catch (Exception ignored) {
                }
                launchBrowserOAuth(clientId, emailHint);
            } else {
                deliverOAuthResult(null, 0, "Google Sign-In was cancelled.");
            }
            return;
        }

        if (requestCode == REQ_UNKNOWN_SOURCES) {
            final String apkUrl = pendingInstallApkUrl;
            if (apkUrl != null && (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getPackageManager().canRequestPackageInstalls())) {
                startDirectApkInstall(apkUrl);
            } else {
                pendingInstallApkUrl = null;
                isInstallingUpdate = false;
                deliverUpdateProgress("error", 0, "Install permission not enabled. Enable 'Allow from this source' for OpenLingo and tap Update again.");
            }
            return;
        }

        if (requestCode == REQ_FILE_CHOOSER) {
            if (fileChooserCallback != null) {
                Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                fileChooserCallback.onReceiveValue(results);
                fileChooserCallback = null;
            }
            return;
        }

        if (requestCode == REQ_SAVE_BACKUP) {
            if (resultCode == Activity.RESULT_OK && data != null && data.getData() != null && pendingExportContent != null) {
                Uri uri = data.getData();
                try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                    if (out != null) {
                        out.write(pendingExportContent.getBytes(StandardCharsets.UTF_8));
                        out.flush();
                        notifyJsBackupStatus(true, "Backup file saved successfully.");
                    } else {
                        notifyJsBackupStatus(false, "Could not open destination file.");
                    }
                } catch (Exception e) {
                    notifyJsBackupStatus(false, "Failed to save file: " + e.getMessage());
                }
            } else {
                notifyJsBackupStatus(false, "File export cancelled.");
            }
            pendingExportContent = null;
            return;
        }

        if (requestCode == REQ_OPEN_BACKUP) {
            if (resultCode == Activity.RESULT_OK && data != null && data.getData() != null) {
                Uri uri = data.getData();
                try (InputStream in = getContentResolver().openInputStream(uri)) {
                    if (in == null) {
                        notifyJsBackupStatus(false, "Could not read selected file.");
                        return;
                    }
                    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                    byte[] chunk = new byte[4096];
                    int read;
                    while ((read = in.read(chunk)) != -1) {
                        buffer.write(chunk, 0, read);
                    }
                    String b64 = Base64.encodeToString(buffer.toByteArray(), Base64.NO_WRAP);
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            if (webView != null) {
                                webView.evaluateJavascript(
                                        "window.onAndroidBackupLoaded && window.onAndroidBackupLoaded('" + b64 + "')",
                                        null);
                            }
                        }
                    });
                } catch (Exception e) {
                    notifyJsBackupStatus(false, "Failed to read file: " + e.getMessage());
                }
            } else {
                notifyJsBackupStatus(false, "File import cancelled.");
            }
        }
    }

    private void notifyJsBackupStatus(final boolean ok, final String message) {
        final String safeMsg = escapeJs(message == null ? "" : message);
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (webView != null) {
                    webView.evaluateJavascript(
                            "window.onAndroidBackupSaved && window.onAndroidBackupSaved(" + ok + ", '" + safeMsg + "')",
                            null);
                }
            }
        });
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (appIconBridge != null
                && !isChangingConfigurations()
                && pendingOAuthClientId == null
                && pendingInstallApkUrl == null
                && !isInstallingUpdate
                && fileChooserCallback == null) {
            appIconBridge.applyPendingAppIcon();
        }
    }

    @Override
    protected void onDestroy() {
        if (appIconBridge != null && !isChangingConfigurations()) {
            appIconBridge.applyPendingAppIcon();
        }
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }

    private final class TtsBridge {
        @JavascriptInterface
        public boolean speak(final String text, final String localeTag) {
            if (!ttsReady || tts == null || text == null || text.isEmpty()) return false;
            final Locale loc = Locale.forLanguageTag(localeTag != null ? localeTag : "ja-JP");
            int avail = tts.isLanguageAvailable(loc);
            if (avail < TextToSpeech.LANG_AVAILABLE) {
                return false;
            }
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        tts.setLanguage(loc);
                        tts.setSpeechRate(0.9f);
                        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "openlingo_tts");
                    } catch (Exception ignored) {
                    }
                }
            });
            return true;
        }
    }

    private final class BackupBridge {
        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void saveBackup(final String filename, final String jsonContent) {
            pendingExportContent = jsonContent;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/json");
                    intent.putExtra(Intent.EXTRA_TITLE, filename != null && !filename.isEmpty() ? filename : "openlingo-backup.json");
                    startActivityForResult(intent, REQ_SAVE_BACKUP);
                }
            });
        }

        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void openBackup() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                    intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain", "application/octet-stream"});
                    startActivityForResult(intent, REQ_OPEN_BACKUP);
                }
            });
        }

        @JavascriptInterface
        public void copyToClipboard(final String text) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    if (cm != null && text != null) {
                        cm.setPrimaryClip(ClipData.newPlainText("OpenLingo Backup", text));
                    }
                }
            });
        }
    }

    @SuppressWarnings("deprecation")
    private void authorizePickedGoogleAccount(final String androidClientId, final Account chosenAccount) {
        try {
            int gmsStatus = GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(MainActivity.this);
            if (gmsStatus != ConnectionResult.SUCCESS) {
                launchBrowserOAuth(androidClientId, chosenAccount.name);
                return;
            }
            List<Scope> requestedScopes = Arrays.asList(
                    new Scope("https://www.googleapis.com/auth/drive.appdata"),
                    new Scope("openid"),
                    new Scope("email"),
                    new Scope("profile")
            );
            AuthorizationRequest authRequest = AuthorizationRequest.builder()
                    .setRequestedScopes(requestedScopes)
                    .setAccount(chosenAccount)
                    .build();

            Identity.getAuthorizationClient(MainActivity.this)
                    .authorize(authRequest)
                    .addOnSuccessListener(MainActivity.this, result -> {
                        if (result != null && result.hasResolution() && result.getPendingIntent() != null) {
                            try {
                                startIntentSenderForResult(
                                        result.getPendingIntent().getIntentSender(),
                                        REQ_GMS_AUTHORIZE,
                                        null, 0, 0, 0);
                            } catch (Exception e) {
                                launchBrowserOAuth(androidClientId, chosenAccount.name);
                            }
                        } else if (result != null && result.getAccessToken() != null && !result.getAccessToken().isEmpty()) {
                            deliverOAuthResult(result.getAccessToken(), 3500, null);
                        } else {
                            launchBrowserOAuth(androidClientId, chosenAccount.name);
                        }
                    })
                    .addOnFailureListener(MainActivity.this, e -> {
                        launchBrowserOAuth(androidClientId, chosenAccount.name);
                    });
        } catch (Throwable t) {
            launchBrowserOAuth(androidClientId, chosenAccount.name);
        }
    }

    private void launchBrowserOAuth(final String androidClientId, final String loginHint) {
        if (androidClientId == null || androidClientId.isEmpty()) {
            deliverOAuthResult(null, 0, "Missing Android OAuth Client ID.");
            return;
        }
        try {
            byte[] rand = new byte[32];
            new SecureRandom().nextBytes(rand);
            String verifier = Base64.encodeToString(rand, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII));
            String challenge = Base64.encodeToString(digest, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);

            String prefix = androidClientId.replace(".apps.googleusercontent.com", "");
            String redirectUri = "com.googleusercontent.apps." + prefix + ":/oauth2redirect";

            pendingOAuthClientId = androidClientId;
            pendingOAuthRedirectUri = redirectUri;
            pendingCodeVerifier = verifier;

            Uri.Builder uriBuilder = Uri.parse("https://accounts.google.com/o/oauth2/v2/auth")
                    .buildUpon()
                    .appendQueryParameter("client_id", androidClientId)
                    .appendQueryParameter("redirect_uri", redirectUri)
                    .appendQueryParameter("response_type", "code")
                    .appendQueryParameter("scope", "https://www.googleapis.com/auth/drive.appdata openid email profile")
                    .appendQueryParameter("code_challenge", challenge)
                    .appendQueryParameter("code_challenge_method", "S256");

            if (loginHint != null && !loginHint.isEmpty()) {
                uriBuilder.appendQueryParameter("login_hint", loginHint);
            }

            Intent browserIntent = new Intent(Intent.ACTION_VIEW, uriBuilder.build());
            startActivity(browserIntent);
        } catch (Exception e) {
            deliverOAuthResult(null, 0, "Could not launch sign-in: " + e.getMessage());
        }
    }

    private final class GoogleAuthBridge {
        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void signIn(final String androidClientId) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    pendingOAuthClientId = androidClientId;
                    pendingPickedAccountEmail = null;
                    try {
                        Intent pickIntent = AccountManager.newChooseAccountIntent(
                                null,
                                null,
                                new String[]{"com.google"},
                                null,
                                null,
                                null,
                                null
                        );
                        startActivityForResult(pickIntent, REQ_PICK_GOOGLE_ACCOUNT);
                    } catch (Exception e) {
                        launchBrowserOAuth(androidClientId, null);
                    }
                }
            });
        }
    }

    private final class AppIconBridge {
        private static final String ICON_PREFS = "openlingo_icon_prefs";
        private static final String KEY_ACTIVE_ICON = "active_icon";
        private static final String KEY_PENDING_ICON = "pending_icon";
        private final Map<String, String> aliasMap = new LinkedHashMap<>();

        AppIconBridge() {
            // AUTO-GENERATED ICON ALIASES START
            aliasMap.put("ml", ".IconAliasMl");
            aliasMap.put("en", ".IconAliasEn");
            aliasMap.put("ta", ".IconAliasTa");
            aliasMap.put("kn", ".IconAliasKn");
            aliasMap.put("te", ".IconAliasTe");
            aliasMap.put("hi", ".IconAliasHi");
            aliasMap.put("ja", ".IconAliasJa");
            aliasMap.put("zh", ".IconAliasZh");
            aliasMap.put("ko", ".IconAliasKo");
            aliasMap.put("ar", ".IconAliasAr");
            aliasMap.put("es", ".IconAliasEs");
            aliasMap.put("fr", ".IconAliasFr");
            aliasMap.put("ru", ".IconAliasRu");
            aliasMap.put("star", ".IconAliasStar");
            aliasMap.put("diamond", ".IconAliasDiamond");
            aliasMap.put("triangle", ".IconAliasTriangle");
            // AUTO-GENERATED ICON ALIASES END
        }

        @JavascriptInterface
        public String getAppIcon() {
            SharedPreferences prefs = getSharedPreferences(ICON_PREFS, Context.MODE_PRIVATE);
            String pending = prefs.getString(KEY_PENDING_ICON, null);
            if (pending != null && aliasMap.containsKey(pending)) {
                return pending;
            }
            try {
                PackageManager pm = getPackageManager();
                String pkg = getPackageName();
                for (Map.Entry<String, String> entry : aliasMap.entrySet()) {
                    ComponentName cn = new ComponentName(pkg, pkg + entry.getValue());
                    if (pm.getComponentEnabledSetting(cn) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) {
                        prefs.edit().putString(KEY_ACTIVE_ICON, entry.getKey()).commit();
                        return entry.getKey();
                    }
                }
            } catch (Exception ignored) {
            }
            String active = prefs.getString(KEY_ACTIVE_ICON, "ml");
            return aliasMap.containsKey(active) ? active : "ml";
        }

        @JavascriptInterface
        public boolean setAppIcon(final String rawIconId) {
            final String targetId = (rawIconId != null && aliasMap.containsKey(rawIconId)) ? rawIconId : "ml";
            final SharedPreferences prefs = getSharedPreferences(ICON_PREFS, Context.MODE_PRIVATE);
            final String activeId = prefs.getString(KEY_ACTIVE_ICON, "ml");
            if (targetId.equals(activeId)) {
                prefs.edit().remove(KEY_PENDING_ICON).commit();
            } else {
                prefs.edit().putString(KEY_PENDING_ICON, targetId).commit();
            }
            return true;
        }

        void applyPendingAppIcon() {
            final SharedPreferences prefs = getSharedPreferences(ICON_PREFS, Context.MODE_PRIVATE);
            final String pendingId = prefs.getString(KEY_PENDING_ICON, null);
            final String activeId = prefs.getString(KEY_ACTIVE_ICON, "ml");
            if (pendingId == null || !aliasMap.containsKey(pendingId) || pendingId.equals(activeId)) {
                return;
            }
            final String targetAlias = aliasMap.get(pendingId);
            if (targetAlias == null) return;

            // Commit synchronously BEFORE toggling components so state persists even if OS recycles the process.
            prefs.edit()
                    .putString(KEY_ACTIVE_ICON, pendingId)
                    .remove(KEY_PENDING_ICON)
                    .commit();

            try {
                PackageManager pm = getPackageManager();
                String pkg = getPackageName();

                // Enable chosen alias FIRST so launcher always has a valid entry
                pm.setComponentEnabledSetting(
                        new ComponentName(pkg, pkg + targetAlias),
                        PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                        PackageManager.DONT_KILL_APP
                );

                // Strictly disable EVERY other alias (including default .IconAliasMl when in DEFAULT state)
                // so launchers like Samsung One UI NEVER display two OpenLingo icons.
                for (Map.Entry<String, String> entry : aliasMap.entrySet()) {
                    if (entry.getKey().equals(pendingId)) continue;
                    ComponentName cn = new ComponentName(pkg, pkg + entry.getValue());
                    int st = pm.getComponentEnabledSetting(cn);
                    boolean isDefaultEnabledAlias = "ml".equals(entry.getKey()) && st == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT;
                    if (isDefaultEnabledAlias || entry.getKey().equals(activeId) || st == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) {
                        pm.setComponentEnabledSetting(
                                cn,
                                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                                PackageManager.DONT_KILL_APP
                        );
                    }
                }
            } catch (Exception ignored) {
            }
        }

        void reconcileAliases() {
            // Self-heal if an earlier crash left two aliases enabled (e.g. .IconAliasMl in DEFAULT + another ENABLED).
            try {
                PackageManager pm = getPackageManager();
                String pkg = getPackageName();
                String enabledNonDefault = null;
                for (Map.Entry<String, String> entry : aliasMap.entrySet()) {
                    if ("ml".equals(entry.getKey())) continue;
                    ComponentName cn = new ComponentName(pkg, pkg + entry.getValue());
                    if (pm.getComponentEnabledSetting(cn) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) {
                        enabledNonDefault = entry.getKey();
                        break;
                    }
                }
                if (enabledNonDefault != null) {
                    ComponentName mlCn = new ComponentName(pkg, pkg + aliasMap.get("ml"));
                    if (pm.getComponentEnabledSetting(mlCn) != PackageManager.COMPONENT_ENABLED_STATE_DISABLED) {
                        pm.setComponentEnabledSetting(
                                mlCn,
                                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                                PackageManager.DONT_KILL_APP
                        );
                    }
                    getSharedPreferences(ICON_PREFS, Context.MODE_PRIVATE)
                            .edit()
                            .putString(KEY_ACTIVE_ICON, enabledNonDefault)
                            .commit();
                }
            } catch (Exception ignored) {
            }
        }
    }

    private boolean isTrustedUpdateUrl(String url) {
        if (url == null) return false;
        return url.startsWith("https://github.com/mahesh-labs/openlingo/releases/download/")
                || url.startsWith("https://objects.githubusercontent.com/");
    }

    private void startDirectApkInstall(final String apkUrl) {
        if (isInstallingUpdate) return;
        isInstallingUpdate = true;
        deliverUpdateProgress("downloading", 0, "Connecting to GitHub Releases...");

        new Thread(new Runnable() {
            @Override
            public void run() {
                PackageInstaller.Session session = null;
                HttpURLConnection conn = null;
                try {
                    String currentUrl = apkUrl;
                    int redirects = 0;
                    while (redirects < 6) {
                        conn = (HttpURLConnection) new URL(currentUrl).openConnection();
                        conn.setInstanceFollowRedirects(false);
                        conn.setConnectTimeout(15000);
                        conn.setReadTimeout(30000);
                        conn.setRequestProperty("User-Agent", "OpenLingo-Android");
                        int code = conn.getResponseCode();
                        if (code == HttpURLConnection.HTTP_MOVED_TEMP
                                || code == HttpURLConnection.HTTP_MOVED_PERM
                                || code == HttpURLConnection.HTTP_SEE_OTHER
                                || code == 307 || code == 308) {
                            String next = conn.getHeaderField("Location");
                            conn.disconnect();
                            if (next == null || !next.startsWith("https://")) {
                                throw new IOException("Invalid redirect during update download.");
                            }
                            currentUrl = next;
                            redirects++;
                            continue;
                        }
                        if (code < 200 || code >= 300) {
                            throw new IOException("Download failed (HTTP " + code + ").");
                        }
                        break;
                    }
                    if (conn == null) throw new IOException("Could not open update connection.");

                    long totalBytes = conn.getContentLengthLong();
                    PackageInstaller installer = getPackageManager().getPackageInstaller();
                    PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(
                            PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                    params.setAppPackageName(getPackageName());
                    if (Build.VERSION.SDK_INT >= 31) {
                        params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
                    }
                    int sessionId = installer.createSession(params);
                    session = installer.openSession(sessionId);

                    try (InputStream in = conn.getInputStream();
                         OutputStream out = session.openWrite("openlingo-update.apk", 0, totalBytes > 0 ? totalBytes : -1)) {
                        byte[] buf = new byte[16384];
                        long downloaded = 0;
                        int lastReportedPct = -1;
                        int n;
                        while ((n = in.read(buf)) != -1) {
                            out.write(buf, 0, n);
                            downloaded += n;
                            if (totalBytes > 0) {
                                int pct = (int) Math.min(99, (downloaded * 100L) / totalBytes);
                                if (pct >= lastReportedPct + 2 || pct == 99) {
                                    lastReportedPct = pct;
                                    deliverUpdateProgress("downloading", pct, "Downloading update... " + pct + "%");
                                }
                            } else if (lastReportedPct < 0) {
                                lastReportedPct = 10;
                                deliverUpdateProgress("downloading", 10, "Downloading update...");
                            }
                        }
                        session.fsync(out);
                    }

                    deliverUpdateProgress("installing", 100, "Opening Android installer...");

                    Intent callbackIntent = new Intent(MainActivity.this, MainActivity.class);
                    callbackIntent.setAction(ACTION_INSTALL_STATUS);
                    int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= 31) {
                        piFlags |= PendingIntent.FLAG_MUTABLE;
                    }
                    PendingIntent pi = PendingIntent.getActivity(MainActivity.this, sessionId, callbackIntent, piFlags);
                    session.commit(pi.getIntentSender());
                    session.close();
                    session = null;
                } catch (Exception e) {
                    if (session != null) {
                        try {
                            session.abandon();
                        } catch (Exception ignored) {
                        }
                    }
                    isInstallingUpdate = false;
                    pendingInstallApkUrl = null;
                    deliverUpdateProgress("error", 0, "Update failed: " + e.getMessage());
                } finally {
                    if (conn != null) {
                        conn.disconnect();
                    }
                }
            }
        }).start();
    }

    private final class UpdaterBridge {
        @JavascriptInterface
        public boolean supportsDirectInstall() {
            return true;
        }

        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void installApkUpdate(final String apkUrl) {
            if (!isTrustedUpdateUrl(apkUrl)) {
                deliverUpdateProgress("error", 0, "Untrusted update download URL.");
                return;
            }
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getPackageManager().canRequestPackageInstalls()) {
                        pendingInstallApkUrl = apkUrl;
                        deliverUpdateProgress("permission", 0, "Allow 'Install unknown apps' for OpenLingo, then press Back to finish updating.");
                        try {
                            Intent settingsIntent = new Intent(
                                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                    Uri.parse("package:" + getPackageName()));
                            startActivityForResult(settingsIntent, REQ_UNKNOWN_SOURCES);
                        } catch (Exception e) {
                            pendingInstallApkUrl = null;
                            deliverUpdateProgress("error", 0, "Could not open install permission settings: " + e.getMessage());
                        }
                        return;
                    }
                    pendingInstallApkUrl = apkUrl;
                    startDirectApkInstall(apkUrl);
                }
            });
        }

        @JavascriptInterface
        public void openExternalUrl(final String url) {
            if (url == null || (!url.startsWith("https://") && !url.startsWith("http://"))) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                    } catch (Exception ignored) {
                    }
                }
            });
        }
    }
}
