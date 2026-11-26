package org.openlingo.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends Activity {
    private static final String VIRTUAL_HOST = "appassets.openlingo.local";
    private static final String START_URL = "https://" + VIRTUAL_HOST + "/index.html";
    private static final int REQ_SAVE_BACKUP = 4101;
    private static final int REQ_OPEN_BACKUP = 4102;

    private WebView webView;
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;
    private String pendingExportContent = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#0b1120"));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#0b1120"));
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        // Handle Android 15+ edge-to-edge insets cleanly so header/nav bars never overlap system bars
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
        final String safeMsg = (message == null ? "" : message)
                .replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\n", " ");
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
        public void speak(final String text, final String localeTag) {
            if (!ttsReady || tts == null || text == null || text.isEmpty()) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Locale loc = Locale.forLanguageTag(localeTag != null ? localeTag : "ja-JP");
                        tts.setLanguage(loc);
                        tts.setSpeechRate(0.9f);
                        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "openlingo_tts");
                    } catch (Exception ignored) {
                    }
                }
            });
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
}
