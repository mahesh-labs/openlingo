#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$PROJECT_DIR/android"
BUILD_DIR="$ANDROID_DIR/build"
VERSION_NAME="${APP_VERSION:-0.0.1-beta}"

SDK_DIR="${ANDROID_HOME:-/home/mahesh/Android/Sdk}"
BUILD_TOOLS="$SDK_DIR/build-tools/36.0.0"
PLATFORM_JAR="$SDK_DIR/platforms/android-37.0/android.jar"
JAVA_HOME_DIR="${JAVA_HOME:-/home/mahesh/Applications/android-studio/jbr}"
export JAVA_HOME="$JAVA_HOME_DIR"
export PATH="$JAVA_HOME/bin:$BUILD_TOOLS:$SDK_DIR/platform-tools:$PATH"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/gen" "$BUILD_DIR/classes" "$BUILD_DIR/dex" "$BUILD_DIR/res_flat" "$BUILD_DIR/assets/www" "$BUILD_DIR/out"

# 1. Bundle all web/course assets into assets/www/
cp "$PROJECT_DIR/index.html" "$PROJECT_DIR/styles.css" "$PROJECT_DIR/app.js" "$PROJECT_DIR/manifest.webmanifest" "$BUILD_DIR/assets/www/"
cp -r "$PROJECT_DIR/src" "$BUILD_DIR/assets/www/"
cp -r "$PROJECT_DIR/courses" "$BUILD_DIR/assets/www/"

# 2. Compile Android XML resources with aapt2
"$BUILD_TOOLS/aapt2" compile --dir "$ANDROID_DIR/res" -o "$BUILD_DIR/res_flat/resources.zip"

# 3. Link resources & package assets into base APK + generate R.java
"$BUILD_TOOLS/aapt2" link \
  -I "$PLATFORM_JAR" \
  --manifest "$ANDROID_DIR/AndroidManifest.xml" \
  --java "$BUILD_DIR/gen" \
  -A "$BUILD_DIR/assets" \
  -o "$BUILD_DIR/unaligned.apk" \
  "$BUILD_DIR/res_flat/resources.zip"

# 4. Compile Java sources (release mode, no debug symbols, bytecode v11 for d8)
"$JAVA_HOME/bin/javac" \
  --release 11 \
  -g:none \
  -classpath "$PLATFORM_JAR" \
  -d "$BUILD_DIR/classes" \
  "$BUILD_DIR/gen/org/openlingo/app/R.java" \
  "$ANDROID_DIR/src/org/openlingo/app/MainActivity.java"

# 5. Convert .class files to optimized release Dalvik DEX bytecode with d8
CLASS_FILES=()
while IFS= read -r -d '' f; do CLASS_FILES+=("$f"); done < <(find "$BUILD_DIR/classes" -name "*.class" -print0)
"$BUILD_TOOLS/d8" --release --min-api 24 --lib "$PLATFORM_JAR" --output "$BUILD_DIR/dex" "${CLASS_FILES[@]}"

# 6. Inject classes.dex into APK
python3 - "$BUILD_DIR/unaligned.apk" "$BUILD_DIR/dex/classes.dex" <<'PY'
import sys, zipfile
apk_path, dex_path = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(apk_path, 'a', compression=zipfile.ZIP_DEFLATED) as zf:
    zf.write(dex_path, 'classes.dex')
PY

# 7. Zipalign APK
"$BUILD_TOOLS/zipalign" -f -p 4 "$BUILD_DIR/unaligned.apk" "$BUILD_DIR/aligned.apk"

# 8. Sign release APK with local private release keystore (gitignored; back up safely!)
KEYSTORE="${RELEASE_KEYSTORE:-$ANDROID_DIR/release.keystore}"
KEY_ALIAS="${RELEASE_KEY_ALIAS:-openlingo-release}"
KEY_PASS="${RELEASE_STORE_PASS:-openlingo-release-key}"

if [ ! -f "$KEYSTORE" ]; then
  "$JAVA_HOME/bin/keytool" -genkeypair -v \
    -keystore "$KEYSTORE" \
    -storepass "$KEY_PASS" -keypass "$KEY_PASS" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA -keysize 4096 -validity 10000 \
    -dname "CN=OpenLingo Release,O=OpenLingo,C=IN" >/dev/null 2>&1
fi

FINAL_APK="$BUILD_DIR/out/OpenLingo-v${VERSION_NAME}.apk"
"$BUILD_TOOLS/apksigner" sign \
  --ks "$KEYSTORE" \
  --ks-pass "pass:$KEY_PASS" \
  --key-pass "pass:$KEY_PASS" \
  --ks-key-alias "$KEY_ALIAS" \
  --out "$FINAL_APK" \
  "$BUILD_DIR/aligned.apk"

"$BUILD_TOOLS/apksigner" verify --print-certs "$FINAL_APK"
ls -lh "$FINAL_APK"
