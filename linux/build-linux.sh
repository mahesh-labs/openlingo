#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LINUX_DIR="$PROJECT_DIR/linux"
DIST_DIR="$LINUX_DIR/dist"
VERSION="${APP_VERSION:-0.0.8-beta}"
DEB_VERSION="${VERSION//-/\~}"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# 1. Assemble portable Linux bundle directory
BUNDLE_NAME="OpenLingo-v${VERSION}-linux"
STAGE="$DIST_DIR/$BUNDLE_NAME"
mkdir -p "$STAGE/www" "$STAGE/icons"

cp "$PROJECT_DIR/index.html" "$PROJECT_DIR/privacy.html" "$PROJECT_DIR/styles.css" "$PROJECT_DIR/app.js" "$PROJECT_DIR/sw.js" "$PROJECT_DIR/manifest.webmanifest" "$PROJECT_DIR/LICENSE" "$PROJECT_DIR/README.md" "$STAGE/www/"
cp -r "$PROJECT_DIR/src" "$PROJECT_DIR/courses" "$PROJECT_DIR/assets" "$STAGE/www/"
cp "$LINUX_DIR/openlingo-desktop.py" "$STAGE/openlingo-desktop.py"
chmod +x "$STAGE/openlingo-desktop.py"

cat > "$STAGE/openlingo" <<'EOF'
#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")" && pwd)"
exec python3 "$DIR/openlingo-desktop.py" "$@"
EOF
chmod +x "$STAGE/openlingo"

cp "$LINUX_DIR/org.openlingo.app.desktop" "$STAGE/org.openlingo.app.desktop"
cp "$PROJECT_DIR/assets/icons/openlingo-icon.svg" "$STAGE/icons/org.openlingo.app.svg"
cp "$PROJECT_DIR/assets/icons/openlingo-256.png" "$STAGE/icons/org.openlingo.app.png"

cat > "$STAGE/install.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
APP_HOME="$HOME/.local/share/openlingo-app"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor"

mkdir -p "$APP_HOME" "$BIN_DIR" "$DESKTOP_DIR" "$ICON_DIR/scalable/apps" "$ICON_DIR/256x256/apps"
rm -rf "$APP_HOME/www"
cp -r "$SRC/www" "$APP_HOME/www"
cp "$SRC/openlingo-desktop.py" "$APP_HOME/openlingo-desktop.py"
chmod +x "$APP_HOME/openlingo-desktop.py"

printf '#!/usr/bin/env bash\nexec python3 "%s/openlingo-desktop.py" "$@"\n' "$APP_HOME" > "$BIN_DIR/openlingo"
chmod +x "$BIN_DIR/openlingo"

sed "s|^Exec=openlingo|Exec=$BIN_DIR/openlingo|" "$SRC/org.openlingo.app.desktop" > "$DESKTOP_DIR/org.openlingo.app.desktop"
cp "$SRC/icons/org.openlingo.app.svg" "$ICON_DIR/scalable/apps/org.openlingo.app.svg"
cp "$SRC/icons/org.openlingo.app.png" "$ICON_DIR/256x256/apps/org.openlingo.app.png"
echo "Installed OpenLingo to $BIN_DIR/openlingo and Applications menu!"
EOF
chmod +x "$STAGE/install.sh"

# 2. Build .tar.gz
tar -C "$DIST_DIR" -czf "$DIST_DIR/${BUNDLE_NAME}.tar.gz" "$BUNDLE_NAME"

# 3. Build .zip (preserving executable modes)
python3 - "$DIST_DIR" "$BUNDLE_NAME" "$DIST_DIR/${BUNDLE_NAME}.zip" <<'PY'
import os, sys, zipfile
root, folder, out_zip = sys.argv[1], sys.argv[2], sys.argv[3]
base = os.path.join(root, folder)
with zipfile.ZipFile(out_zip, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
    for dirpath, _, filenames in os.walk(base):
        for fn in sorted(filenames):
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, root)
            zi = zipfile.ZipInfo(rel)
            zi.compress_type = zipfile.ZIP_DEFLATED
            st = os.stat(full)
            zi.external_attr = (st.st_mode & 0xFFFF) << 16
            with open(full, 'rb') as f:
                zf.writestr(zi, f.read())
PY

# 4. Build genuine Debian/Ubuntu .deb package (zero external dpkg dependency)
python3 - "$PROJECT_DIR" "$DIST_DIR/OpenLingo-v${VERSION}-linux_all.deb" "$DEB_VERSION" <<'PY'
import io, os, sys, tarfile, time

proj, out_deb, ver = sys.argv[1], sys.argv[2], sys.argv[3]
now = int(time.time())

def add_bytes(tf, arcname, data, mode=0o644):
    ti = tarfile.TarInfo(arcname)
    ti.size = len(data)
    ti.mode = mode
    ti.mtime = now
    ti.uid = ti.gid = 0
    ti.uname = ti.gname = 'root'
    tf.addfile(ti, io.BytesIO(data))

def add_file(tf, src, arcname, mode=0o644):
    with open(src, 'rb') as f:
        add_bytes(tf, arcname, f.read(), mode)

# Build data.tar.gz
data_buf = io.BytesIO()
installed_kb = 0
with tarfile.open(fileobj=data_buf, mode='w:gz') as tf:
    for fn in ['index.html', 'privacy.html', 'styles.css', 'app.js', 'sw.js', 'manifest.webmanifest', 'LICENSE']:
        p = os.path.join(proj, fn)
        add_file(tf, p, f'./usr/share/openlingo/www/{fn}')
        installed_kb += os.path.getsize(p)
    for d in ['src', 'courses', 'assets']:
        for dp, _, fns in os.walk(os.path.join(proj, d)):
            for fn in sorted(fns):
                full = os.path.join(dp, fn)
                rel = os.path.relpath(full, proj)
                add_file(tf, full, f'./usr/share/openlingo/www/{rel}')
                installed_kb += os.path.getsize(full)
    add_file(tf, os.path.join(proj, 'linux/openlingo-desktop.py'), './usr/share/openlingo/openlingo-desktop.py', 0o755)
    add_bytes(tf, './usr/bin/openlingo', b'#!/bin/sh\nexec python3 /usr/share/openlingo/openlingo-desktop.py "$@"\n', 0o755)
    add_file(tf, os.path.join(proj, 'linux/org.openlingo.app.desktop'), './usr/share/applications/org.openlingo.app.desktop', 0o644)
    add_file(tf, os.path.join(proj, 'assets/icons/openlingo-icon.svg'), './usr/share/icons/hicolor/scalable/apps/org.openlingo.app.svg', 0o644)
    add_file(tf, os.path.join(proj, 'assets/icons/openlingo-256.png'), './usr/share/icons/hicolor/256x256/apps/org.openlingo.app.png', 0o644)

data_bytes = data_buf.getvalue()

# Build control.tar.gz
control_txt = f"""Package: openlingo
Version: {ver}
Section: education
Priority: optional
Architecture: all
Depends: python3
Recommends: chromium | chromium-browser | google-chrome-stable
Installed-Size: {max(1, installed_kb // 1024)}
Maintainer: mahesh-labs <mahesh.makes.it@gmail.com>
Homepage: https://mahesh-labs.github.io/openlingo/
Description: Free and open-source cross-platform language learning app
 OpenLingo offers structured Japanese (JLPT N5-N1), Spanish (CEFR A1-C1),
 and Malayalam (Stage 1-5) courses with interactive handwriting tracing,
 spaced-repetition flashcards, and private Google Drive sync.
""".encode('utf-8')

ctrl_buf = io.BytesIO()
with tarfile.open(fileobj=ctrl_buf, mode='w:gz') as tf:
    add_bytes(tf, './control', control_txt, 0o644)
ctrl_bytes = ctrl_buf.getvalue()

def ar_entry(name, payload):
    hdr = f"{name:<16}{now:<12}0     0     100644  {len(payload):<10}`\n".encode('ascii')
    pad = b'\n' if len(payload) % 2 == 1 else b''
    return hdr + payload + pad

with open(out_deb, 'wb') as out:
    out.write(b'!<arch>\n')
    out.write(ar_entry('debian-binary', b'2.0\n'))
    out.write(ar_entry('control.tar.gz', ctrl_bytes))
    out.write(ar_entry('data.tar.gz', data_bytes))
PY

# 5. Assemble AppImage AppDir (and build .AppImage if appimagetool is installed)
APPDIR="$DIST_DIR/OpenLingo.AppDir"
mkdir -p "$APPDIR/usr/bin" "$APPDIR/usr/share/openlingo/www" "$APPDIR/usr/share/applications" "$APPDIR/usr/share/icons/hicolor/256x256/apps"
cp -r "$STAGE/www/." "$APPDIR/usr/share/openlingo/www/"
cp "$LINUX_DIR/openlingo-desktop.py" "$APPDIR/usr/share/openlingo/openlingo-desktop.py"
chmod +x "$APPDIR/usr/share/openlingo/openlingo-desktop.py"
cat > "$APPDIR/AppRun" <<'EOF'
#!/usr/bin/env bash
HERE="$(dirname "$(readlink -f "${0}")")"
exec python3 "$HERE/usr/share/openlingo/openlingo-desktop.py" "$@"
EOF
chmod +x "$APPDIR/AppRun"
cp "$LINUX_DIR/org.openlingo.app.desktop" "$APPDIR/org.openlingo.app.desktop"
cp "$LINUX_DIR/org.openlingo.app.desktop" "$APPDIR/usr/share/applications/org.openlingo.app.desktop"
cp "$PROJECT_DIR/assets/icons/openlingo-256.png" "$APPDIR/org.openlingo.app.png"
cp "$PROJECT_DIR/assets/icons/openlingo-256.png" "$APPDIR/usr/share/icons/hicolor/256x256/apps/org.openlingo.app.png"
ln -sf org.openlingo.app.png "$APPDIR/.DirIcon"

if command -v appimagetool >/dev/null 2>&1; then
  ARCH=x86_64 appimagetool "$APPDIR" "$DIST_DIR/OpenLingo-v${VERSION}-x86_64.AppImage"
fi

rm -rf "$STAGE"
ls -lh "$DIST_DIR"
