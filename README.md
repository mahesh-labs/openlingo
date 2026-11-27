<p align="center">
  <img src="assets/icons/openlingo-icon.svg" alt="OpenLingo Icon" width="84" height="84" />
</p>

<h1 align="center">OpenLingo</h1>

<p align="center">
  <strong>Free, open-source, cross-platform language learning app for Web, Linux Desktop, and Android.</strong><br/>
  Zero backend servers · Offline-first · Two-way Google Drive auto-sync · Unified theme &amp; icon across all platforms
</p>

<p align="center">
  <a href="https://mahesh-labs.github.io/openlingo/"><strong>🌐 Launch Live Web App</strong></a> &nbsp;·&nbsp;
  <a href="https://github.com/mahesh-labs/openlingo/releases"><strong>📦 Download Android &amp; Linux Builds</strong></a> &nbsp;·&nbsp;
  <a href="https://discord.gg/pYMKxY4jE"><strong>💬 Join Discord</strong></a> &nbsp;·&nbsp;
  <a href="https://mahesh-labs.github.io/openlingo/privacy.html"><strong>🔒 Privacy Policy</strong></a> &nbsp;·&nbsp;
  <a href="CONTRIBUTING_COURSES.md"><strong>🌍 Contribute Courses</strong></a>
</p>

---

## 🌐 Live Web App

Start learning immediately in any desktop or mobile browser — no installation required:

👉 **https://mahesh-labs.github.io/openlingo/**

- Installable as a **Progressive Web App (PWA)** on Chrome, Edge, Brave, Safari, and Android.
- Works **100% offline** after the first visit via Service Worker caching.
- Sign in with Google to automatically sync progress between the **Web App**, **Linux Desktop App**, and **Android App**.

---

## 📚 Universal 13-Language Curriculum Matrix (156 Courses · 25 Units · 75 Lessons · 375 Items Each)

Every language below can teach **every other language** (`13 × 12 = 156` complete any-to-any courses from Absolute Beginner to Super Advanced Mastery — e.g. Malayalam → Japanese, Tamil → Korean, Hindi → Arabic, Chinese → French, Russian → Telugu, English → Kannada, and more):

| Language | Native Script | Proficiency Path | Script & Handwriting Board |
| :--- | :--- | :--- | :--- |
| **English** (`en`) | English | CEFR A1 → C2 | Vowels & Consonant Digraphs |
| **Malayalam** (`ml`) | മലയാളം | Stage 1 → Stage 5 | Vowels & Consonants |
| **Tamil** (`ta`) | தமிழ் | Stage 1 → Stage 5 | 12 Uyir Vowels & 18 Mei Consonants |
| **Kannada** (`kn`) | ಕನ್ನಡ | Stage 1 → Stage 5 | Swaragalu & Vyanjanagalu |
| **Telugu** (`te`) | తెలుగు | Stage 1 → Stage 5 | Achulu & Hallulu |
| **Hindi** (`hi`) | हिन्दी | Stage 1 → Stage 5 | Devanagari Swar & Vyanjan |
| **Japanese** (`ja`) | 日本語 | JLPT N5 → N1 | 46 Hiragana, 46 Katakana, 86 Kanji |
| **Chinese (Mandarin)** (`zh`) | 中文 | HSK 1 → HSK 6 | 50 Core Simplified Hanzi + Pinyin |
| **Korean** (`ko`) | 한국어 | TOPIK 1 → TOPIK 5–6 | 40 Hangul Jamo (Consonants & Vowels) |
| **Arabic** (`ar`) | العربية | CEFR A1 → C2 (RTL) | 28 Arabic Alphabet Letters (RTL) |
| **Spanish** (`es`) | Español | CEFR A1 → C2 | Alphabet & Accents |
| **French** (`fr`) | Français | CEFR A1 → C2 | Accents & Ligatures |
| **Russian** (`ru`) | Русский | TRKI A1 → C2 | 33 Cyrillic Alphabet Letters |

---

## ✨ Features

- **Duolingo-Style Progressive Path:** Mobile-first uncluttered layout, single-row level strip, tactile lesson nodes with interactive bottom-sheet preview, Unit Guidebooks, XP, streaks, hearts, and unified Dark/Light themes (`#0b1120` / `#10b981`).
- **Interactive Script Trainer & Handwriting Board (`あ Characters`):**
  - **46 Hiragana**, **46 Katakana**, **86 Basic JLPT N5 Kanji**, **Malayalam Vowels & Consonants**, and **Spanish Alphabet & Accents**.
  - Touch & mouse **Drawing Board** with 3-pass mastery (`Trace → Faint → Memory`), randomized 5-character **Write Test**, and a wide ruled **Words & Sentences** writing pad.
  - Tap-to-hear pronunciation using native device TTS with automatic online TTS fallback when offline voices are unavailable.
- **Jump-Ahead Placement Quizzes:** Score **80%+** on a 5-question placement quiz to unlock higher units immediately.
- **Spaced-Repetition Flashcards (`🃏 Flashcards`):** Self-graded review queue (`Again / Hard / Good / Easy`) with audio playback.
- **Zero-Server Google Sign-In & Two-Way Cloud Auto-Sync:**
  - Startup **Continue with Google** gate (with offline/guest fallback).
  - Pulls your latest backup from your private Google Drive `appDataFolder` **before** loading the UI when switching devices, and auto-syncs whenever you complete a lesson, quiz, flashcard review, or drawing mastery pass.
  - Displays a live **Last Synced** indicator across Web, Linux Desktop, and Android (desktop sidebar, mobile sync strip, and Backup & Restore panel).
  - Also supports offline `.json` file export/import (via Android Storage Access Framework on mobile) and compact `OL1:...` backup codes.
- **GitHub Community Course Catalog (`🌍 Community`):** Discover, install, create, and submit community-maintained courses via Pull Requests (see [`CONTRIBUTING_COURSES.md`](CONTRIBUTING_COURSES.md)).

---

## 📦 Downloads & Platform Setup

Prebuilt releases for **Android** and **Linux** are published on the [**GitHub Releases**](https://github.com/mahesh-labs/openlingo/releases) page.

### 1. Web App (Browser / PWA)
- Open **https://mahesh-labs.github.io/openlingo/** directly, or run locally:
```bash
python3 -m http.server 8080
# Visit http://localhost:8080
```

### 2. Android (Signed Native APK)
Download `OpenLingo-v*.apk` from [Releases](https://github.com/mahesh-labs/openlingo/releases) and install on Android.
- Built with pure Java + Android SDK (`aapt2` / `javac` / `d8` / `zipalign` / `apksigner`) — zero Gradle or Node bloat (~190 KB).
- Uses native Android `TextToSpeech`, Storage Access Framework for local backups, and RFC 8252 system-browser PKCE for Google Sign-In.

To build from source:
```bash
bash android/build-apk.sh
# Outputs android/build/out/OpenLingo-v0.0.4-beta.apk
```

### 3. Linux Desktop (All Formats)
All Linux builds share the exact same icon, dark/light theme, offline cache, and Google Drive auto-sync (via a local loopback server on `localhost:8080` in app window mode):

| Format | Artifact / Source | How to Run / Install |
| :--- | :--- | :--- |
| **Debian / Ubuntu (`.deb`)** | `OpenLingo-v*-linux_all.deb` | `sudo apt install ./OpenLingo-v*-linux_all.deb` |
| **Fedora / RHEL / openSUSE (`.rpm`)** | `OpenLingo-v*-linux.noarch.rpm` | `sudo dnf install ./OpenLingo-v*-linux.noarch.rpm` |
| **AppImage (Universal)** | `OpenLingo-v*-x86_64.AppImage` | `chmod +x OpenLingo-*.AppImage && ./OpenLingo-*.AppImage` |
| **Flatpak / Flathub** | `OpenLingo-v*.flatpak` & [`linux/flatpak/org.openlingo.app.yml`](linux/flatpak/org.openlingo.app.yml) | `flatpak install --user OpenLingo-v*.flatpak && flatpak run org.openlingo.app` |
| **Tarball (`.tar.gz`)** | `OpenLingo-v*-linux.tar.gz` | `tar -xzf OpenLingo-*-linux.tar.gz && ./OpenLingo-*/openlingo` |
| **Portable Zip (`.zip`)** | `OpenLingo-v*-linux.zip` | `unzip OpenLingo-*-linux.zip && ./OpenLingo-*/openlingo` |
| **Arch Linux / AUR (`PKGBUILD`)** | [`linux/arch/PKGBUILD`](linux/arch/PKGBUILD) | `cd linux/arch && makepkg -si` |

To build the Linux packages locally (`.tar.gz`, `.zip`, `.deb`, and `AppDir` / `.AppImage`):
```bash
bash linux/build-linux.sh
# Outputs packages to linux/dist/
```
*(When a GitHub Release is published, [`.github/workflows/release-linux.yml`](.github/workflows/release-linux.yml) automatically builds and attaches `.tar.gz`, `.zip`, `.deb`, `.AppImage`, and `.flatpak` to the release.)*

---

## 🗂️ Project Structure

```text
openlingo/
├── index.html                  # App shell, startup Google Sign-In gate, PWA meta
├── styles.css                  # Unified Dark/Light theme (#0b1120 / #10b981)
├── app.js                      # Learning path, lessons, sync badge, navigation
├── sw.js                       # Offline Service Worker cache
├── manifest.webmanifest        # PWA manifest & unified icons
├── privacy.html                # Privacy Policy (GitHub Pages / OAuth verification)
├── assets/icons/               # Unified SVG & PNG app icons (192/256/512)
├── src/                        # Modular JS (config, googleSync, srs, scripts, drawboard, catalog, etc.)
├── courses/                    # Modular JSON curricula (en-ja, en-es, en-ml) + registry.json
├── android/                    # Pure Java Android WebView app + APK build script
├── linux/                      # Desktop launcher, .desktop entry, build-linux.sh, flatpak/, arch/
└── .github/workflows/          # Course JSON validator & Linux multi-format release CI
```

---

## 🔒 Privacy & Security

OpenLingo runs **zero backend servers**. All progress is stored locally on your device, and optional cloud sync writes a single `openlingo-backup.json` file into your own private Google Drive `appDataFolder` — OpenLingo cannot read any other files in your Drive. See the full [Privacy Policy](https://mahesh-labs.github.io/openlingo/privacy.html).
