#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$PROJECT_DIR/android"
BUILD_DIR="$ANDROID_DIR/build"
LIBS_DIR="$ANDROID_DIR/libs"
VERSION_NAME="${APP_VERSION:-0.0.10-beta}"

SDK_DIR="${ANDROID_HOME:-/home/mahesh/Android/Sdk}"
BUILD_TOOLS="$SDK_DIR/build-tools/36.0.0"
PLATFORM_JAR="$SDK_DIR/platforms/android-37.0/android.jar"
JAVA_HOME_DIR="${JAVA_HOME:-/home/mahesh/Applications/android-studio/jbr}"
export JAVA_HOME="$JAVA_HOME_DIR"
export PATH="$JAVA_HOME/bin:$BUILD_TOOLS:$SDK_DIR/platform-tools:$PATH"

# Ensure Google Play Services Auth libraries are present (cached in android/libs/)
if [ ! -d "$LIBS_DIR/jars" ] || [ -z "$(ls -A "$LIBS_DIR/jars" 2>/dev/null)" ]; then
  python3 "$ANDROID_DIR/fetch-gms-deps.py" "$LIBS_DIR"
fi

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/gen" "$BUILD_DIR/classes" "$BUILD_DIR/dex" "$BUILD_DIR/res_flat" "$BUILD_DIR/assets/www" "$BUILD_DIR/out"

# 1. Bundle all web/course/icon assets into assets/www/
cp "$PROJECT_DIR/index.html" "$PROJECT_DIR/privacy.html" "$PROJECT_DIR/styles.css" "$PROJECT_DIR/app.js" "$PROJECT_DIR/manifest.webmanifest" "$BUILD_DIR/assets/www/"
cp -r "$PROJECT_DIR/src" "$BUILD_DIR/assets/www/"
cp -r "$PROJECT_DIR/courses" "$BUILD_DIR/assets/www/"
cp -r "$PROJECT_DIR/assets" "$BUILD_DIR/assets/www/"

# 2. Compile Android XML resources (app + Google Play Services libraries) with aapt2
RES_ZIPS=()
for lib_res in "$LIBS_DIR"/res/com.google.android.gms_play-services-basement_* \
               "$LIBS_DIR"/res/com.google.android.gms_play-services-base_* \
               "$LIBS_DIR"/res/com.google.android.gms_play-services-auth_*; do
  if [ -d "$lib_res" ]; then
    base="$(basename "$lib_res")"
    "$BUILD_TOOLS/aapt2" compile --dir "$lib_res" -o "$BUILD_DIR/res_flat/${base}.zip"
    RES_ZIPS+=("$BUILD_DIR/res_flat/${base}.zip")
  fi
done

"$BUILD_TOOLS/aapt2" compile --dir "$ANDROID_DIR/res" -o "$BUILD_DIR/res_flat/app_resources.zip"
RES_ZIPS+=("$BUILD_DIR/res_flat/app_resources.zip")

# 3. Link resources & package assets into base APK + generate R.java (app + Play Services packages)
"$BUILD_TOOLS/aapt2" link \
  -I "$PLATFORM_JAR" \
  --manifest "$ANDROID_DIR/AndroidManifest.xml" \
  --auto-add-overlay \
  --extra-packages com.google.android.gms.common:com.google.android.gms.base:com.google.android.gms.auth.api \
  --java "$BUILD_DIR/gen" \
  -A "$BUILD_DIR/assets" \
  -o "$BUILD_DIR/unaligned.apk" \
  "${RES_ZIPS[@]}"

# Collect required GMS + AndroidX Java library JARs (skip unused Kotlin/Coroutines/FIDO/SMS-Retriever bloat)
LIB_JARS=()
for jf in "$LIBS_DIR"/jars/*.jar; do
  bn="$(basename "$jf")"
  case "$bn" in
    org.jetbrains.kotlin* | org.jetbrains.kotlinx* | androidx.core_core-ktx* | com.google.android.gms_play-services-fido* | com.google.android.gms_play-services-auth-api-phone*)
      continue
      ;;
    *)
      LIB_JARS+=("$jf")
      ;;
  esac
done

CLASSPATH="$PLATFORM_JAR"
for jf in "${LIB_JARS[@]}"; do
  CLASSPATH="${CLASSPATH}:${jf}"
done

# 4. Compile Java sources (app + generated R.java files, release mode, bytecode v11 for d8)
JAVA_SRCS=()
while IFS= read -r -d '' f; do JAVA_SRCS+=("$f"); done < <(find "$BUILD_DIR/gen" -name "R.java" -print0)
JAVA_SRCS+=("$ANDROID_DIR/src/org/openlingo/app/MainActivity.java")

"$JAVA_HOME/bin/javac" \
  --release 11 \
  -g:none \
  -classpath "$CLASSPATH" \
  -d "$BUILD_DIR/classes" \
  "${JAVA_SRCS[@]}"

# 5. Convert .class files + required Play Services JARs to release Dalvik DEX bytecode with d8
CLASS_FILES=()
while IFS= read -r -d '' f; do CLASS_FILES+=("$f"); done < <(find "$BUILD_DIR/classes" -name "*.class" -print0)
"$BUILD_TOOLS/d8" --release --min-api 24 --lib "$PLATFORM_JAR" --output "$BUILD_DIR/dex" "${CLASS_FILES[@]}" "${LIB_JARS[@]}"

# 6. Inject all generated classes*.dex files into APK (Android API 24+ supports multi-dex natively)
python3 - "$BUILD_DIR/unaligned.apk" "$BUILD_DIR/dex" <<'PY'
import glob, os, sys, zipfile
apk_path, dex_dir = sys.argv[1], sys.argv[2]
dex_files = sorted(glob.glob(os.path.join(dex_dir, 'classes*.dex')))
if not dex_files:
    raise SystemExit("No classes*.dex produced by d8!")
with zipfile.ZipFile(apk_path, 'a', compression=zipfile.ZIP_DEFLATED) as zf:
    for df in dex_files:
        zf.write(df, os.path.basename(df))
print(f"Packaged {len(dex_files)} DEX file(s): {[os.path.basename(d) for d in dex_files]}")
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
