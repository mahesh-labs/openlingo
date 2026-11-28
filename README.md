<p align="center">
  <img src="assets/icons/polygot-icon.svg" alt="Polygot Icon" width="88" height="88" />
</p>

<h1 align="center">Polygot</h1>

<p align="center">
  <strong>Free, open-source, cross-platform language learning app for Web, Android, Windows, and Linux.</strong><br/>
  Zero backend servers · Offline-first · 13 languages &amp; 156 courses · Two-way Google Drive auto-sync · Direct in-app updates
</p>

<p align="center">
  <a href="https://mahesh-labs.github.io/polygot/"><strong>🌐 Launch Live Web App</strong></a> &nbsp;·&nbsp;
  <a href="https://github.com/mahesh-labs/polygot/releases"><strong>📦 Download (Android / Windows / Linux)</strong></a> &nbsp;·&nbsp;
  <a href="https://discord.gg/pYMKxY4jE"><strong>💬 Join Discord</strong></a> &nbsp;·&nbsp;
  <a href="https://mahesh-labs.github.io/polygot/privacy.html"><strong>🔒 Privacy Policy</strong></a> &nbsp;·&nbsp;
  <a href="CONTRIBUTING_COURSES.md"><strong>🌍 Contribute Courses</strong></a>
</p>

---

## 🌐 Live Web App

Start learning immediately in any desktop or mobile browser — no installation required:

👉 **https://mahesh-labs.github.io/polygot/**

- Installable as a **Progressive Web App (PWA)** on Chrome, Edge, Brave, Safari, iOS, and Android.
- Works **100% offline** after the first visit via Service Worker caching.
- Sign in with Google to sync progress privately across **Web**, **Android**, **Windows**, and **Linux** via your own Google Drive.

---

## 📚 Universal 13-Language Curriculum Matrix (156 Courses · 25 Units · 75 Lessons · 375 Concepts Each)

Every language below can teach **every other language** (`13 × 12 = 156` complete any-to-any courses from Absolute Beginner to Super Advanced Mastery — fully localized in your chosen source language):

| Language | Native Script | Proficiency Path | Complete Character & Handwriting Chart |
| :--- | :--- | :--- | :--- |
| **English** (`en`) | English | CEFR A1 → C2 | Vowels, Consonants & Digraphs |
| **Malayalam** (`ml`) | മലയാളം | Stage 1 → Stage 5 | Vowels, Consonants, Chillu, Conjuncts & 540 Kagunitham Combos |
| **Tamil** (`ta`) | தமிழ் | Stage 1 → Stage 5 | 13 Uyir, 18 Mei, 216 Uyirmei & 48 Grantha Combos (297 unique chars) |
| **Kannada** (`kn`) | ಕನ್ನಡ | Stage 1 → Stage 5 | Swaragalu, Vyanjanagalu, Full Kagunita & Ottakshara |
| **Telugu** (`te`) | తెలుగు | Stage 1 → Stage 5 | Achulu, Hallulu, Full Gunintalu & Vattulu |
| **Hindi** (`hi`) | हिन्दी | Stage 1 → Stage 5 | Devanagari Swar, Vyanjan & 462 Barakhadi Combos |
| **Japanese** (`ja`) | 日本語 | JLPT N5 → N1 | Hiragana, Katakana, Dakuten/Yoon & 86 Basic Kanji |
| **Chinese (Mandarin)** (`zh`) | 中文 | HSK 1 → HSK 6 | Core Simplified Hanzi + Pinyin |
| **Korean** (`ko`) | 한국어 | TOPIK 1 → TOPIK 5–6 | Full Hangul Jamo & Syllable Blocks |
| **Arabic** (`ar`) | العربية | CEFR A1 → C2 (RTL) | 28 Arabic Letters (All Contextual Forms, RTL) |
| **Spanish** (`es`) | Español | CEFR A1 → C2 | Alphabet, Accents & Punctuation |
| **French** (`fr`) | Français | CEFR A1 → C2 | Alphabet, Accents & Ligatures |
| **Russian** (`ru`) | Русский | TRKI A1 → C2 | 33 Cyrillic Alphabet Letters |

---

## ✨ Highlights

- **Structured Learning Path:** Single-column uncluttered path, unit guidebooks, jump-ahead placement quizzes, active-lesson jump button, tactile exercises with semantic color feedback, XP, streaks, and customizable **Light / Dark / System** Rich Purple themes.
- **Full Script Trainer & Handwriting Board:** Decluttered character grid showing **All Characters** first, touch & mouse **Drawing Board** (`Trace → Faint → Memory`), randomized 5-character **Write Test**, **Words & Sentences** pad, recognition quizzes, and native TTS pronunciation.
- **3D Spaced-Repetition Flashcards:** Flip-animated review cards (`Again / Hard / Good / Easy`) with audio playback.
- **Customizable Language App Icons:** Pick any of the 13 language emblems (or geometric icons) as your app icon across Web, Android (full-bleed Adaptive Icons), and Desktop.
- **Zero-Server Google Sign-In & Silent Auto-Sync:** Native Google account picker popup on Android (`AuthorizationClient`), default-browser sign-in on Windows & Linux desktop, and private Google Drive `appDataFolder` auto-sync — plus offline `.json` file export/import and `OL1:` backup codes.
- **Direct In-App Updates:** Checks for new GitHub Releases on launch and installs updates directly inside the app on **Android** (`PackageInstaller`), **Windows** (`.exe`, `portable.exe`, `.msi`, `portable.zip`), **Linux** (`AppImage`, `Flatpak`, `deb`, `rpm`, `Arch`, portable), and **Web PWA**.
- **Built-In Course Studio & Community Catalog:** Create, import, and submit new languages or courses via Pull Requests — see [`CONTRIBUTING_COURSES.md`](CONTRIBUTING_COURSES.md).

---

## 📦 Downloads & Installation

All 12 prebuilt cross-platform packages are published on [**GitHub Releases**](https://github.com/mahesh-labs/polygot/releases):

### 1. Android
- **`Polygot-v*-beta.apk`** — Signed native Android APK with full-bleed Adaptive Icons, native Google Account Picker (`AuthorizationClient`), native Android TTS, Storage Access Framework backups, and direct in-app updates.
- Build from source: `bash android/build-apk.sh`

### 2. Windows (Zero Dependencies — Windows 10 & 11)
| Format | Artifact | Notes |
| :--- | :--- | :--- |
| **Installer (`.exe`)** | `Polygot-v*-windows-setup.exe` | Inno Setup wizard, Start Menu & Desktop shortcuts, uninstaller |
| **Single-File Portable (`.exe`)** | `Polygot-v*-windows-portable.exe` | Double-click to run — zero extraction, zero install, self-updating |
| **MSI Installer (`.msi`)** | `Polygot-v*-windows.msi` | Per-user WiX v5 Windows Installer (no admin UAC required) |
| **Portable Folder (`.zip`)** | `Polygot-v*-windows-portable.zip` | Extract and launch `Polygot.exe` |

### 3. Linux Desktop (All Formats)
| Format | Artifact / Source | How to Run / Install |
| :--- | :--- | :--- |
| **AppImage (Universal)** | `Polygot-v*-x86_64.AppImage` | `chmod +x Polygot-*.AppImage && ./Polygot-*.AppImage` |
| **Flatpak** | `Polygot-v*.flatpak` | `flatpak install --user Polygot-v*.flatpak && flatpak run org.polygot.app` |
| **Debian / Ubuntu (`.deb`)** | `Polygot-v*-linux_all.deb` | `sudo apt install ./Polygot-v*-linux_all.deb` |
| **Fedora / RHEL (`.rpm`)** | `Polygot-v*-linux.noarch.rpm` | `sudo dnf install ./Polygot-v*-linux.noarch.rpm` |
| **Arch Linux (`.pkg.tar.zst`)** | `polygot-*.pkg.tar.zst` | `sudo pacman -U ./polygot-*.pkg.tar.zst` |
| **Portable (`.tar.gz` / `.zip`)** | `Polygot-v*-linux.tar.gz` / `.zip` | Extract and run `./polygot` (or `./install.sh`) |

---

## 🗂️ Project Structure

```text
polygot/
├── index.html                  # App shell, PWA meta, Open Graph & Search Console tags
├── styles.css                  # Rich Purple Dark/Light theme & responsive mobile/desktop UI
├── app.js                      # Learning path, exercises, characters, flashcards, settings & studio
├── sw.js                       # Offline Service Worker cache
├── manifest.webmanifest        # PWA manifest & icons
├── privacy.html                # Privacy Policy (live on GitHub Pages)
├── CONTRIBUTING_COURSES.md     # Complete guide for community course & language PRs
├── assets/icons/               # Unified SVG & PNG app icons (192/256/512)
├── src/                        # Modular JS (config, courseMatrix, exercises, scripts, googleSync, updater, etc.)
├── courses/                    # 13-language curriculum matrix (langs/, i18n/, matrix/) & registry.json
├── scripts/                    # Automated course & icon pipeline (sync-course-pipeline.py)
├── android/                    # Pure Java Android app + Play Services Auth + build-apk.sh
├── windows/                    # Native C# Windows launcher + Inno Setup (.exe) + WiX (.msi) + portable.exe
├── linux/                      # Python desktop launcher + build-linux.sh + flatpak/ + arch/
└── .github/workflows/          # Course pipeline validator + automated Linux & Windows release CI
```

---

## 🔒 Privacy & Security

Polygot runs **zero backend servers**, zero ads, and zero trackers. All progress is stored locally on your device, and optional Google Sign-In writes only a single `polygot-backup.json` file into your private Google Drive `appDataFolder` (`drive.appdata` non-sensitive scope) — Polygot cannot read any other files in your Drive. See the full [Privacy Policy](https://mahesh-labs.github.io/polygot/privacy.html).
