# OpenLingo — Free & Open-Source Cross-Platform Language Learning

An ultra-lightweight, 100% offline-capable language learning app for **Web PWA, Android (native APK), iOS (Capacitor), and Desktop (Tauri)** featuring a Duolingo-style progressive learning path, Script/Character trainer, Jump-Ahead Placement Quizzes, Spaced-Repetition Flashcards, and server-free Backup & Restore.

## Included Curricula (66 Units · 198 Lessons · 990 Items)

| Course | Standard | Levels | Units | Lessons | Items |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **English → Japanese** (`en-ja`) | JLPT N5 → N1 | 5 | 24 | 72 | 360 |
| **English → Spanish** (`en-es`) | CEFR A1 → C1 | 5 | 24 | 72 | 360 |
| **English → Malayalam** (`en-ml`) | Stage 1 → Stage 5 | 5 | 18 | 54 | 270 |

## Features
- **Duolingo-Style Path & Mobile-First UI:** Compact mobile top bar, single-row level strip, tactile lesson nodes with interactive bottom-sheet preview, Unit Guidebooks, XP, streaks, hearts, and Light/Dark themes.
- **Characters / Script Trainer (`あ Characters`):** Complete 46 Hiragana + 46 Katakana charts, Malayalam Vowels & Consonants, Spanish special letters, tap-to-hear audio, mastery bars, and 8-question drills.
- **Jump-Ahead Placement Quizzes:** Pass a 5-question quiz (80%+) to unlock higher units immediately.
- **Server-Free Backup & Restore (`💾 Backup`):** Export/import `.json` backup files (via Android Storage Access Framework on phone, native file picker on web/desktop) or copy/paste compact `OL1:...` backup codes.
- **Community Course Studio:** Add languages, append vocabulary items, or import/export modular course JSON.

## Run Locally (Web PWA)
```bash
python3 -m http.server 8080
```
Open `http://localhost:8080`.

## Build Signed Android APK (No Gradle/Node Required)
```bash
bash android/build-apk.sh
```
Outputs `android/build/out/OpenLingo-debug.apk` (uses Android SDK `aapt2`/`d8`/`zipalign`/`apksigner` + JDK).

## Push to GitHub
```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```
