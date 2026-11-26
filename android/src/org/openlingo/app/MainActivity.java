package org.openlingo.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
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
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends Activity {
    private static final String VIRTUAL_HOST = "appassets.openlingo.local";
    private static final String START_URL = "https://" + VIRTUAL_HOST + "/index.html";
    private static final int REQ_SAVE_BACKUP = 4101;
    private static final int REQ_OPEN_BACKUP = 4102;
    private static final int REQ_FILE_CHOOSER = 4103;

    private WebView webView;
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;
    private String pendingExportContent = null;
    private ValueCallback<Uri[]> fileChooserCallback = null;

    // Pending PKCE OAuth state for Android system-browser Sign in with Google
    private String pendingOAuthClientId = null;
    private String pendingOAuthRedirectUri = null;
    private String pendingCodeVerifier = null;

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
        handleOAuthIntent(intent);
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
        webView.addJavascriptInterface(new AppIconBridge(), "AndroidAppIcon");

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
    protected void onDestroy() {
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

    private final class GoogleAuthBridge {
        @JavascriptInterface
        public void signIn(final String androidClientId) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
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

                        Uri authUri = Uri.parse("https://accounts.google.com/o/oauth2/v2/auth")
                                .buildUpon()
                                .appendQueryParameter("client_id", androidClientId)
                                .appendQueryParameter("redirect_uri", redirectUri)
                                .appendQueryParameter("response_type", "code")
                                .appendQueryParameter("scope", "https://www.googleapis.com/auth/drive.appdata openid email profile")
                                .appendQueryParameter("code_challenge", challenge)
                                .appendQueryParameter("code_challenge_method", "S256")
                                .build();

                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, authUri);
                        startActivity(browserIntent);
                    } catch (Exception e) {
                        deliverOAuthResult(null, 0, "Could not launch browser sign-in: " + e.getMessage());
                    }
                }
            });
        }
    }

    private final class AppIconBridge {
        private static final String ICON_PREFS = "openlingo_icon_prefs";
        private static final String KEY_ACTIVE_ICON = "active_icon";
        private final Map<String, String> aliasMap = new LinkedHashMap<>();

        AppIconBridge() {
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
        }

        @JavascriptInterface
        public boolean setAppIcon(final String rawIconId) {
            final String targetId = (rawIconId != null && aliasMap.containsKey(rawIconId)) ? rawIconId : "ml";
            final SharedPreferences prefs = getSharedPreferences(ICON_PREFS, Context.MODE_PRIVATE);
            final String currentId = prefs.getString(KEY_ACTIVE_ICON, "ml");
            if (targetId.equals(currentId)) {
                return true;
            }
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        PackageManager pm = getPackageManager();
                        String pkg = getPackageName();
                        String targetAlias = aliasMap.get(targetId);
                        if (targetAlias == null) return;

                        pm.setComponentEnabledSetting(
                                new ComponentName(pkg, pkg + targetAlias),
                                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                                PackageManager.DONT_KILL_APP
                        );

                        for (Map.Entry<String, String> entry : aliasMap.entrySet()) {
                            if (entry.getKey().equals(targetId)) continue;
                            pm.setComponentEnabledSetting(
                                    new ComponentName(pkg, pkg + entry.getValue()),
                                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                                    PackageManager.DONT_KILL_APP
                            );
                        }
                        prefs.edit().putString(KEY_ACTIVE_ICON, targetId).apply();
                    } catch (Exception ignored) {
                    }
                }
            });
            return true;
        }
    }
}
