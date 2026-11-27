using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

namespace OpenLingoWindows
{
    internal static class Program
    {
        private static readonly object AuthLock = new object();
        private static readonly Dictionary<string, Dictionary<string, object>> AuthSessions =
            new Dictionary<string, Dictionary<string, object>>();

        private static readonly object UpdateLock = new object();
        private static bool UpdateActive = false;
        private static string UpdateStage = "idle";
        private static int UpdatePercent = 0;
        private static string UpdateMessage = "";
        private static string UpdateError = "";

        private static string BaseDir;
        private static string WwwDir;
        private static string DataDir;
        private static string ProfileDir;
        private static string UpdateCacheDir;
        private static int ServerPort = 8080;
        private static bool UsingAppWindow = false;
        private static volatile bool Running = true;
        private static TcpListener Listener;
        private static Process BrowserProcess;

        [STAThread]
        private static void Main(string[] args)
        {
            ServicePointManager.SecurityProtocol =
                (SecurityProtocolType)3072 | SecurityProtocolType.Tls12 | SecurityProtocolType.Tls11 | SecurityProtocolType.Tls;

            BaseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
            WwwDir = Path.Combine(BaseDir, "www");
            if (!Directory.Exists(WwwDir))
            {
                string parent = Directory.GetParent(BaseDir) != null ? Directory.GetParent(BaseDir).FullName : BaseDir;
                if (File.Exists(Path.Combine(parent, "index.html")))
                {
                    WwwDir = parent;
                }
            }

            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            DataDir = Path.Combine(localAppData, "OpenLingo");
            ProfileDir = Path.Combine(DataDir, "profile");
            UpdateCacheDir = Path.Combine(DataDir, "updates");
            Directory.CreateDirectory(DataDir);

            ServerPort = StartHttpServer();
            string browserPath = FindAppBrowser();
            UsingAppWindow = !string.IsNullOrEmpty(browserPath);

            string appUrl = "http://localhost:" + ServerPort + "/";

            if (UsingAppWindow)
            {
                Directory.CreateDirectory(ProfileDir);
                string cliArgs = string.Format(
                    "--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1120,760 --no-first-run --no-default-browser-check",
                    appUrl,
                    ProfileDir
                );
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo(browserPath, cliArgs);
                    psi.UseShellExecute = false;
                    BrowserProcess = Process.Start(psi);
                    if (BrowserProcess != null)
                    {
                        BrowserProcess.WaitForExit();
                    }
                }
                catch
                {
                    OpenSystemBrowser(appUrl);
                    Thread.Sleep(Timeout.Infinite);
                }
            }
            else
            {
                OpenSystemBrowser(appUrl);
                Thread.Sleep(Timeout.Infinite);
            }

            Running = false;
            try { if (Listener != null) Listener.Stop(); } catch { }
        }

        private static int StartHttpServer()
        {
            int[] preferred = new int[] { 8080, 18420, 18421, 0 };
            string envPort = Environment.GetEnvironmentVariable("OPENLINGO_PORT");
            int customPort;
            if (!string.IsNullOrEmpty(envPort) && int.TryParse(envPort, out customPort) && customPort > 0)
            {
                preferred = new int[] { customPort, 8080, 18420, 18421, 0 };
            }

            foreach (int candidate in preferred)
            {
                try
                {
                    TcpListener l = new TcpListener(IPAddress.Loopback, candidate);
                    l.Start();
                    Listener = l;
                    int boundPort = ((IPEndPoint)l.LocalEndpoint).Port;
                    Thread acceptThread = new Thread(AcceptLoop);
                    acceptThread.IsBackground = true;
                    acceptThread.Start();
                    return boundPort;
                }
                catch
                {
                    // Try next candidate port
                }
            }
            throw new InvalidOperationException("Could not bind local OpenLingo HTTP port.");
        }

        private static void AcceptLoop()
        {
            while (Running)
            {
                try
                {
                    TcpClient client = Listener.AcceptTcpClient();
                    ThreadPool.QueueUserWorkItem(HandleClient, client);
                }
                catch
                {
                    if (!Running) break;
                }
            }
        }

        private static void HandleClient(object state)
        {
            TcpClient client = (TcpClient)state;
            try
            {
                client.ReceiveTimeout = 10000;
                client.SendTimeout = 15000;
                using (client)
                using (NetworkStream stream = client.GetStream())
                {
                    string method;
                    string rawTarget;
                    Dictionary<string, string> headers;
                    byte[] bodyBytes;
                    if (!ReadHttpRequest(stream, out method, out rawTarget, out headers, out bodyBytes))
                    {
                        return;
                    }

                    string path = rawTarget;
                    string query = "";
                    int qIdx = rawTarget.IndexOf('?');
                    if (qIdx >= 0)
                    {
                        path = rawTarget.Substring(0, qIdx);
                        query = rawTarget.Substring(qIdx + 1);
                    }

                    if (method == "GET")
                    {
                        HandleGet(stream, path, query);
                    }
                    else if (method == "POST")
                    {
                        HandlePost(stream, path, bodyBytes);
                    }
                    else if (method == "OPTIONS")
                    {
                        WriteResponse(stream, 204, "No Content", "text/plain", new byte[0], true);
                    }
                    else
                    {
                        WriteText(stream, 405, "Method Not Allowed", "Method Not Allowed");
                    }
                }
            }
            catch
            {
                // Ignore client socket disconnects
            }
        }

        private static bool ReadHttpRequest(
            NetworkStream stream,
            out string method,
            out string target,
            out Dictionary<string, string> headers,
            out byte[] body)
        {
            method = "";
            target = "";
            headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            body = new byte[0];

            MemoryStream headerBuf = new MemoryStream();
            byte[] one = new byte[1];
            int match = 0;
            while (headerBuf.Length < 65536)
            {
                int r = stream.Read(one, 0, 1);
                if (r <= 0) return false;
                byte b = one[0];
                headerBuf.WriteByte(b);
                if ((match == 0 && b == '\r') ||
                    (match == 1 && b == '\n') ||
                    (match == 2 && b == '\r') ||
                    (match == 3 && b == '\n'))
                {
                    match++;
                    if (match == 4) break;
                }
                else
                {
                    match = (b == '\r') ? 1 : 0;
                }
            }

            string headerText = Encoding.ASCII.GetString(headerBuf.ToArray());
            string[] lines = headerText.Split(new string[] { "\r\n" }, StringSplitOptions.None);
            if (lines.Length == 0) return false;

            string[] reqParts = lines[0].Split(' ');
            if (reqParts.Length < 2) return false;
            method = reqParts[0].ToUpperInvariant();
            target = reqParts[1];

            for (int i = 1; i < lines.Length; i++)
            {
                string line = lines[i];
                if (string.IsNullOrEmpty(line)) break;
                int colon = line.IndexOf(':');
                if (colon > 0)
                {
                    string k = line.Substring(0, colon).Trim();
                    string v = line.Substring(colon + 1).Trim();
                    headers[k] = v;
                }
            }

            int contentLength = 0;
            string clVal;
            if (headers.TryGetValue("Content-Length", out clVal))
            {
                int.TryParse(clVal, out contentLength);
            }
            if (contentLength > 0 && contentLength <= 262144)
            {
                body = new byte[contentLength];
                int offset = 0;
                while (offset < contentLength)
                {
                    int n = stream.Read(body, offset, contentLength - offset);
                    if (n <= 0) break;
                    offset += n;
                }
            }
            return true;
        }

        private static void HandleGet(NetworkStream stream, string path, string query)
        {
            if (path == "/__desktop/info")
            {
                string mode = DetectInstallMode();
                Dictionary<string, object> info = new Dictionary<string, object>();
                info["desktop"] = UsingAppWindow;
                info["platform"] = "windows";
                info["port"] = ServerPort;
                info["installMode"] = mode;
                info["canDirectUpdate"] = (mode != "dev");
                WriteJson(stream, 200, info);
                return;
            }

            if (path == "/__desktop/update/status")
            {
                Dictionary<string, object> st = new Dictionary<string, object>();
                lock (UpdateLock)
                {
                    st["active"] = UpdateActive;
                    st["stage"] = UpdateStage;
                    st["percent"] = UpdatePercent;
                    st["message"] = UpdateMessage;
                    st["error"] = UpdateError;
                }
                WriteJson(stream, 200, st);
                return;
            }

            if (path == "/__desktop/auth")
            {
                Dictionary<string, string> qs = ParseQuery(query);
                string stateNonce = qs.ContainsKey("state") ? qs["state"] : "";
                string clientId = qs.ContainsKey("client_id") ? qs["client_id"] : "";
                bool valid;
                lock (AuthLock)
                {
                    valid = AuthSessions.ContainsKey(stateNonce);
                }
                if (!valid || string.IsNullOrEmpty(clientId))
                {
                    WriteText(stream, 400, "Bad Request", "Invalid or expired sign-in session");
                    return;
                }
                byte[] html = Encoding.UTF8.GetBytes(RenderDesktopAuthPage(stateNonce, clientId));
                WriteResponse(stream, 200, "OK", "text/html; charset=utf-8", html, true);
                return;
            }

            if (path == "/__desktop/auth/poll")
            {
                Dictionary<string, string> qs = ParseQuery(query);
                string stateNonce = qs.ContainsKey("state") ? qs["state"] : "";
                lock (AuthLock)
                {
                    if (!AuthSessions.ContainsKey(stateNonce))
                    {
                        Dictionary<string, object> exp = new Dictionary<string, object>();
                        exp["status"] = "expired";
                        WriteJson(stream, 404, exp);
                        return;
                    }
                    Dictionary<string, object> sess = AuthSessions[stateNonce];
                    string st = sess["status"] as string;
                    if (st == "done" || st == "error" || st == "cancelled")
                    {
                        Dictionary<string, object> copy = new Dictionary<string, object>(sess);
                        AuthSessions.Remove(stateNonce);
                        WriteJson(stream, 200, copy);
                        return;
                    }
                }
                Dictionary<string, object> pending = new Dictionary<string, object>();
                pending["status"] = "pending";
                WriteJson(stream, 200, pending);
                return;
            }

            ServeStaticFile(stream, path);
        }

        private static void HandlePost(NetworkStream stream, string path, byte[] bodyBytes)
        {
            Dictionary<string, object> data = ParseJsonObject(bodyBytes);

            if (path == "/__desktop/open-url")
            {
                string url = GetString(data, "url").Trim();
                if (!url.StartsWith("https://", StringComparison.OrdinalIgnoreCase) &&
                    !url.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
                {
                    WriteJsonError(stream, 400, "Invalid URL");
                    return;
                }
                OpenSystemBrowser(url);
                Dictionary<string, object> ok = new Dictionary<string, object>();
                ok["ok"] = true;
                WriteJson(stream, 200, ok);
                return;
            }

            if (path == "/__desktop/auth/start")
            {
                string clientId = GetString(data, "clientId").Trim();
                if (string.IsNullOrEmpty(clientId))
                {
                    WriteJsonError(stream, 400, "Missing clientId");
                    return;
                }
                string stateNonce = GenerateNonce();
                double now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                lock (AuthLock)
                {
                    List<string> stale = new List<string>();
                    foreach (KeyValuePair<string, Dictionary<string, object>> kv in AuthSessions)
                    {
                        double created = kv.Value.ContainsKey("created") ? Convert.ToDouble(kv.Value["created"]) : 0;
                        if (now - created > 300) stale.Add(kv.Key);
                    }
                    foreach (string k in stale) AuthSessions.Remove(k);

                    Dictionary<string, object> sess = new Dictionary<string, object>();
                    sess["status"] = "pending";
                    sess["created"] = now;
                    AuthSessions[stateNonce] = sess;
                }

                string authUrl = string.Format(
                    "http://localhost:{0}/__desktop/auth?state={1}&client_id={2}",
                    ServerPort,
                    Uri.EscapeDataString(stateNonce),
                    Uri.EscapeDataString(clientId)
                );
                OpenSystemBrowser(authUrl);

                Dictionary<string, object> resp = new Dictionary<string, object>();
                resp["state"] = stateNonce;
                resp["authUrl"] = authUrl;
                WriteJson(stream, 200, resp);
                return;
            }

            if (path == "/__desktop/auth/complete")
            {
                string stateNonce = GetString(data, "state");
                string token = GetString(data, "access_token");
                string err = GetString(data, "error");
                int expiresIn = 3500;
                if (data.ContainsKey("expires_in"))
                {
                    try { expiresIn = Convert.ToInt32(data["expires_in"]); } catch { expiresIn = 3500; }
                }
                lock (AuthLock)
                {
                    if (AuthSessions.ContainsKey(stateNonce))
                    {
                        Dictionary<string, object> sess = AuthSessions[stateNonce];
                        if (!string.IsNullOrEmpty(token))
                        {
                            sess["status"] = "done";
                            sess["access_token"] = token;
                            sess["expires_in"] = expiresIn;
                        }
                        else
                        {
                            sess["status"] = "error";
                            sess["error"] = string.IsNullOrEmpty(err) ? "Google Sign-In failed." : err;
                        }
                    }
                }
                Dictionary<string, object> ok = new Dictionary<string, object>();
                ok["ok"] = true;
                WriteJson(stream, 200, ok);
                return;
            }

            if (path == "/__desktop/auth/cancel")
            {
                string stateNonce = GetString(data, "state");
                lock (AuthLock)
                {
                    if (AuthSessions.ContainsKey(stateNonce))
                    {
                        Dictionary<string, object> sess = AuthSessions[stateNonce];
                        if ((sess["status"] as string) == "pending")
                        {
                            sess["status"] = "cancelled";
                            sess["error"] = "Default browser sign-in tab was closed.";
                        }
                    }
                }
                Dictionary<string, object> ok = new Dictionary<string, object>();
                ok["ok"] = true;
                WriteJson(stream, 200, ok);
                return;
            }

            if (path == "/__desktop/update/install")
            {
                string mode = DetectInstallMode();
                string assetUrl = "";
                if (mode == "exe") assetUrl = GetString(data, "winExeUrl").Trim();
                else if (mode == "msi") assetUrl = GetString(data, "winMsiUrl").Trim();
                else if (mode == "portable") assetUrl = GetString(data, "winPortableUrl").Trim();

                if (mode == "dev" || !IsTrustedReleaseUrl(assetUrl))
                {
                    Dictionary<string, object> fb = new Dictionary<string, object>();
                    fb["ok"] = false;
                    fb["fallback"] = true;
                    fb["installMode"] = mode;
                    fb["error"] = "No matching direct-install Windows package found.";
                    WriteJson(stream, 200, fb);
                    return;
                }

                lock (UpdateLock)
                {
                    if (UpdateActive)
                    {
                        Dictionary<string, object> already = new Dictionary<string, object>();
                        already["ok"] = true;
                        already["installMode"] = mode;
                        already["alreadyRunning"] = true;
                        WriteJson(stream, 200, already);
                        return;
                    }
                }

                SetUpdateState(true, "downloading", 0, "Starting Windows update...", "");
                Thread t = new Thread(delegate() { RunWindowsDirectUpdate(mode, assetUrl); });
                t.IsBackground = true;
                t.Start();

                Dictionary<string, object> started = new Dictionary<string, object>();
                started["ok"] = true;
                started["installMode"] = mode;
                WriteJson(stream, 200, started);
                return;
            }

            WriteText(stream, 404, "Not Found", "Not Found");
        }

        private static string DetectInstallMode()
        {
            if (File.Exists(Path.Combine(BaseDir, "unins000.exe")))
            {
                return "exe";
            }
            if (File.Exists(Path.Combine(BaseDir, ".msi-installed")))
            {
                return "msi";
            }
            if (Directory.Exists(Path.Combine(BaseDir, "www")))
            {
                return "portable";
            }
            return "dev";
        }

        private static bool IsTrustedReleaseUrl(string url)
        {
            if (string.IsNullOrEmpty(url)) return false;
            return url.StartsWith("https://github.com/mahesh-labs/openlingo/releases/download/", StringComparison.OrdinalIgnoreCase)
                || url.StartsWith("https://objects.githubusercontent.com/", StringComparison.OrdinalIgnoreCase);
        }

        private static void SetUpdateState(bool active, string stage, int percent, string message, string error)
        {
            lock (UpdateLock)
            {
                UpdateActive = active;
                UpdateStage = stage ?? "";
                UpdatePercent = percent;
                UpdateMessage = message ?? "";
                UpdateError = error ?? "";
            }
        }

        private static void RunWindowsDirectUpdate(string mode, string assetUrl)
        {
            try
            {
                Directory.CreateDirectory(UpdateCacheDir);
                Uri u = new Uri(assetUrl);
                string fileName = Path.GetFileName(u.LocalPath);
                if (string.IsNullOrEmpty(fileName)) fileName = "openlingo-update.bin";
                string dlPath = Path.Combine(UpdateCacheDir, fileName);

                SetUpdateState(true, "downloading", 0, "Connecting to GitHub Releases...", "");
                DownloadFileWithProgress(assetUrl, dlPath);

                if (mode == "exe")
                {
                    SetUpdateState(false, "done", 100, "Launching Windows installer...", "");
                    ProcessStartInfo psi = new ProcessStartInfo(dlPath, "/SILENT /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS");
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                    ScheduleSelfExit();
                    return;
                }

                if (mode == "msi")
                {
                    SetUpdateState(false, "done", 100, "Launching Windows MSI updater...", "");
                    ProcessStartInfo psi = new ProcessStartInfo("msiexec.exe", "/i \"" + dlPath + "\" /passive");
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                    ScheduleSelfExit();
                    return;
                }

                if (mode == "portable")
                {
                    SetUpdateState(true, "installing", 100, "Extracting portable update...", "");
                    string extractDir = Path.Combine(Path.GetTempPath(), "openlingo-upd-" + Guid.NewGuid().ToString("N"));
                    ZipFile.ExtractToDirectory(dlPath, extractDir);

                    string srcDir = extractDir;
                    string[] subDirs = Directory.GetDirectories(extractDir);
                    if (!File.Exists(Path.Combine(srcDir, "OpenLingo.exe")) && subDirs.Length == 1)
                    {
                        srcDir = subDirs[0];
                    }

                    string scriptPath = Path.Combine(Path.GetTempPath(), "openlingo-apply-" + Guid.NewGuid().ToString("N") + ".cmd");
                    string exePath = Path.Combine(BaseDir, "OpenLingo.exe");
                    string batch = string.Format(
                        "@echo off\r\n" +
                        "timeout /t 2 /nobreak >nul\r\n" +
                        "xcopy /E /I /Y /Q \"{0}\\*\" \"{1}\\\" >nul\r\n" +
                        "start \"\" \"{2}\"\r\n" +
                        "rmdir /S /Q \"{3}\" >nul 2>&1\r\n" +
                        "del \"%~f0\" >nul 2>&1\r\n",
                        srcDir, BaseDir, exePath, extractDir
                    );
                    File.WriteAllText(scriptPath, batch, Encoding.Default);

                    SetUpdateState(false, "done", 100, "Updated! Restarting OpenLingo...", "");
                    ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/C \"" + scriptPath + "\"");
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    Process.Start(psi);
                    ScheduleSelfExit();
                    return;
                }
            }
            catch (Exception ex)
            {
                SetUpdateState(false, "error", 0, "Update failed: " + ex.Message, ex.Message);
            }
        }

        private static void DownloadFileWithProgress(string url, string destPath)
        {
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
            req.UserAgent = "OpenLingo-Windows";
            req.AllowAutoRedirect = true;
            req.Timeout = 30000;
            using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
            using (Stream input = resp.GetResponseStream())
            using (FileStream output = new FileStream(destPath, FileMode.Create, FileAccess.Write, FileShare.None))
            {
                long total = resp.ContentLength;
                byte[] buffer = new byte[32768];
                long downloaded = 0;
                int lastPct = -1;
                int read;
                while ((read = input.Read(buffer, 0, buffer.Length)) > 0)
                {
                    output.Write(buffer, 0, read);
                    downloaded += read;
                    if (total > 0)
                    {
                        int pct = (int)Math.Min(99, (downloaded * 100L) / total);
                        if (pct >= lastPct + 2 || pct == 99)
                        {
                            lastPct = pct;
                            SetUpdateState(true, "downloading", pct, "Downloading update... " + pct + "%", "");
                        }
                    }
                    else if (lastPct < 0)
                    {
                        lastPct = 15;
                        SetUpdateState(true, "downloading", 15, "Downloading update...", "");
                    }
                }
            }
        }

        private static void ScheduleSelfExit()
        {
            Thread t = new Thread(delegate()
            {
                Thread.Sleep(1100);
                try { if (BrowserProcess != null && !BrowserProcess.HasExited) BrowserProcess.Kill(); } catch { }
                Environment.Exit(0);
            });
            t.IsBackground = true;
            t.Start();
        }

        private static void ServeStaticFile(NetworkStream stream, string urlPath)
        {
            string decoded = Uri.UnescapeDataString(urlPath ?? "/");
            if (decoded == "/" || string.IsNullOrEmpty(decoded)) decoded = "/index.html";
            string rel = decoded.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            string fullRoot = Path.GetFullPath(WwwDir);
            string fullPath = Path.GetFullPath(Path.Combine(fullRoot, rel));

            if (!fullPath.StartsWith(fullRoot, StringComparison.OrdinalIgnoreCase))
            {
                WriteText(stream, 403, "Forbidden", "Forbidden");
                return;
            }
            if (Directory.Exists(fullPath))
            {
                fullPath = Path.Combine(fullPath, "index.html");
            }
            if (!File.Exists(fullPath))
            {
                WriteText(stream, 404, "Not Found", "Not Found");
                return;
            }

            byte[] content = File.ReadAllBytes(fullPath);
            WriteResponse(stream, 200, "OK", GuessMimeType(fullPath), content, false);
        }

        private static string GuessMimeType(string path)
        {
            string ext = Path.GetExtension(path).ToLowerInvariant();
            if (ext == ".html" || ext == ".htm") return "text/html; charset=utf-8";
            if (ext == ".css") return "text/css; charset=utf-8";
            if (ext == ".js" || ext == ".mjs") return "application/javascript; charset=utf-8";
            if (ext == ".json") return "application/json; charset=utf-8";
            if (ext == ".webmanifest") return "application/manifest+json; charset=utf-8";
            if (ext == ".svg") return "image/svg+xml";
            if (ext == ".png") return "image/png";
            if (ext == ".ico") return "image/x-icon";
            if (ext == ".jpg" || ext == ".jpeg") return "image/jpeg";
            if (ext == ".woff2") return "font/woff2";
            if (ext == ".ogg") return "audio/ogg";
            if (ext == ".mp3") return "audio/mpeg";
            return "application/octet-stream";
        }

        private static void WriteJson(NetworkStream stream, int code, object obj)
        {
            JavaScriptSerializer ser = new JavaScriptSerializer();
            byte[] payload = Encoding.UTF8.GetBytes(ser.Serialize(obj));
            WriteResponse(stream, code, code == 200 ? "OK" : "Error", "application/json; charset=utf-8", payload, true);
        }

        private static void WriteJsonError(NetworkStream stream, int code, string msg)
        {
            Dictionary<string, object> err = new Dictionary<string, object>();
            err["error"] = msg;
            WriteJson(stream, code, err);
        }

        private static void WriteText(NetworkStream stream, int code, string reason, string text)
        {
            byte[] payload = Encoding.UTF8.GetBytes(text ?? "");
            WriteResponse(stream, code, reason, "text/plain; charset=utf-8", payload, true);
        }

        private static void WriteResponse(NetworkStream stream, int code, string reason, string contentType, byte[] body, bool noStore)
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendFormat("HTTP/1.1 {0} {1}\r\n", code, reason);
            sb.AppendFormat("Content-Type: {0}\r\n", contentType);
            sb.AppendFormat("Content-Length: {0}\r\n", body.Length);
            sb.Append(noStore ? "Cache-Control: no-store\r\n" : "Cache-Control: no-cache\r\n");
            sb.Append("Connection: close\r\n\r\n");
            byte[] head = Encoding.ASCII.GetBytes(sb.ToString());
            stream.Write(head, 0, head.Length);
            if (body.Length > 0)
            {
                stream.Write(body, 0, body.Length);
            }
            stream.Flush();
        }

        private static Dictionary<string, string> ParseQuery(string query)
        {
            Dictionary<string, string> map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (string.IsNullOrEmpty(query)) return map;
            string[] pairs = query.Split('&');
            foreach (string pair in pairs)
            {
                if (string.IsNullOrEmpty(pair)) continue;
                int eq = pair.IndexOf('=');
                if (eq >= 0)
                {
                    string k = Uri.UnescapeDataString(pair.Substring(0, eq).Replace('+', ' '));
                    string v = Uri.UnescapeDataString(pair.Substring(eq + 1).Replace('+', ' '));
                    map[k] = v;
                }
                else
                {
                    map[Uri.UnescapeDataString(pair)] = "";
                }
            }
            return map;
        }

        private static Dictionary<string, object> ParseJsonObject(byte[] body)
        {
            if (body == null || body.Length == 0) return new Dictionary<string, object>();
            try
            {
                JavaScriptSerializer ser = new JavaScriptSerializer();
                Dictionary<string, object> dict = ser.Deserialize<Dictionary<string, object>>(Encoding.UTF8.GetString(body));
                return dict ?? new Dictionary<string, object>();
            }
            catch
            {
                return new Dictionary<string, object>();
            }
        }

        private static string GetString(Dictionary<string, object> dict, string key)
        {
            if (dict == null || !dict.ContainsKey(key) || dict[key] == null) return "";
            return Convert.ToString(dict[key]);
        }

        private static string GenerateNonce()
        {
            byte[] raw = new byte[24];
            using (RNGCryptoServiceProvider rng = new RNGCryptoServiceProvider())
            {
                rng.GetBytes(raw);
            }
            return Convert.ToBase64String(raw).Replace('+', '-').Replace('/', '_').TrimEnd('=');
        }

        private static void OpenSystemBrowser(string url)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo(url);
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
            catch { }
        }

        private static string FindAppBrowser()
        {
            string pf86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
            string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

            string[] candidates = new string[]
            {
                Path.Combine(pf86, @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(pf, @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(pf, @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(pf86, @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(local, @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(pf, @"BraveSoftware\Brave-Browser\Application\brave.exe"),
                Path.Combine(local, @"Vivaldi\Application\vivaldi.exe")
            };

            foreach (string p in candidates)
            {
                if (!string.IsNullOrEmpty(p) && File.Exists(p))
                {
                    return p;
                }
            }
            return null;
        }

        private static string RenderDesktopAuthPage(string stateNonce, string clientId)
        {
            JavaScriptSerializer ser = new JavaScriptSerializer();
            string jsState = ser.Serialize(stateNonce);
            string jsClientId = ser.Serialize(clientId);

            return "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"/>"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\"/>"
                + "<title>Sign in to OpenLingo</title>"
                + "<link rel=\"icon\" type=\"image/svg+xml\" href=\"/assets/icons/openlingo-icon.svg\"/>"
                + "<style>*{box-sizing:border-box;}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#121024;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}"
                + ".card{width:100%;max-width:420px;background:#1b1736;border:3px solid #3d3573;border-radius:24px;padding:28px 24px;text-align:center;box-shadow:0 10px 0 #0a0817;}"
                + ".logo{width:72px;height:72px;border-radius:50%;margin:0 auto 14px;display:block;}"
                + "h1{margin:0;font-size:22px;font-weight:800;}p{margin:8px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;}"
                + ".gbtn{margin-top:20px;width:100%;display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:13px 18px;border-radius:12px;border:none;background:#fff;color:#111827;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.25);}"
                + ".gbtn:hover{background:#f1f5f9;}.gbtn:disabled{opacity:0.65;cursor:wait;}"
                + ".status{margin-top:16px;padding:11px 14px;border-radius:12px;font-size:13px;font-weight:600;display:none;}"
                + ".status.ok{display:block;background:rgba(16,185,129,0.14);border:1px solid rgba(16,185,129,0.45);color:#34d399;}"
                + ".status.err{display:block;background:rgba(244,63,94,0.14);border:1px solid rgba(244,63,94,0.45);color:#fb7185;}</style>"
                + "<script src=\"https://accounts.google.com/gsi/client\" async defer></script></head><body>"
                + "<div class=\"card\"><img class=\"logo\" src=\"/assets/icons/openlingo-icon.svg\" alt=\"OpenLingo\"/>"
                + "<h1>Sign in to OpenLingo Desktop</h1>"
                + "<p>Using your default browser so you can continue with your existing Google account without logging in again.</p>"
                + "<button id=\"signin-btn\" class=\"gbtn\" type=\"button\"><span>Continue with Google</span></button>"
                + "<div id=\"status\" class=\"status\"></div></div>"
                + "<script>"
                + "const STATE=" + jsState + ";const CLIENT_ID=" + jsClientId + ";"
                + "const SCOPE='https://www.googleapis.com/auth/drive.appdata openid email profile';"
                + "const btn=document.getElementById('signin-btn');const statusEl=document.getElementById('status');"
                + "let completed=false;let tokenClient=null;"
                + "function showStatus(m,ok){statusEl.textContent=m;statusEl.className='status '+(ok?'ok':'err');}"
                + "async function sendResult(p){await fetch('/__desktop/auth/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({state:STATE},p))});}"
                + "function ensureClient(){if(tokenClient)return tokenClient;if(!window.google||!window.google.accounts||!window.google.accounts.oauth2)return null;"
                + "tokenClient=window.google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:SCOPE,callback:async(r)=>{if(r.error){btn.disabled=false;showStatus('Sign-in failed: '+(r.error_description||r.error),false);await sendResult({error:r.error_description||r.error});return;}completed=true;btn.style.display='none';showStatus('Signed in! You can close this tab and return to OpenLingo.',true);await sendResult({access_token:r.access_token,expires_in:Number(r.expires_in||3500)});setTimeout(()=>{try{window.close();}catch(e){}},1200);},error_callback:(e)=>{btn.disabled=false;showStatus((e&&e.message)||'Popup blocked or closed. Click Continue with Google to retry.',false);}});return tokenClient;}"
                + "btn.addEventListener('click',()=>{const tc=ensureClient();if(!tc){showStatus('Google Sign-In is still loading — click again in a moment.',false);return;}btn.disabled=true;statusEl.className='status';tc.requestAccessToken({prompt:'select_account'});});"
                + "window.addEventListener('pagehide',()=>{if(!completed&&navigator.sendBeacon){navigator.sendBeacon('/__desktop/auth/cancel',new Blob([JSON.stringify({state:STATE})],{type:'application/json'}));}});"
                + "</script></body></html>";
        }
    }
}
