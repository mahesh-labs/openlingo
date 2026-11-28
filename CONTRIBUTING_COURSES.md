# Contributing Languages & Courses to Polygot

Polygot is 100% open-source and community-driven. Learners on **Web PWA**, **Linux Desktop**, and **Android** can sync newly merged languages and community courses directly from **Settings → Course Studio → Sync from GitHub**!

There are **two ways** to contribute courses to Polygot:

1. **[Option A (Recommended): Add a New Language to the Universal Matrix](#option-a-add-a-new-language-to-the-universal-matrix)** — Contribute **one** language pack (`courses/langs/<code>.json`) and automatically unlock Beginner → Super Advanced courses **to and from every other language** in Polygot, plus a dedicated customizable **App Icon** across all devices!
2. **[Option B: Add a Standalone / Specialized Community Course](#option-b-add-a-standalone--specialized-community-course)** — Contribute a focused or custom-structured course (e.g. *Travel Japanese*, *Business German*, *Medical Spanish*, or a regional dialect) under `courses/<id>/course.json` registered in `courses/registry.json`.

---

## Repository Structure

```text
polygot/
├── courses/
│   ├── matrix/
│   │   └── syllabus.json        # Master 5-tier, 25-unit, 75-lesson, 375-concept syllabus + language metadata & icons
│   ├── langs/
│   │   ├── en.json              # English language pack (375 concepts + 25 unit grammar notes)
│   │   ├── ml.json              # Malayalam language pack
│   │   ├── ta.json              # Tamil language pack
│   │   └── <code>.json          # Add your new language here!
│   ├── registry.json            # Auto-synced matrix summary + standalone community courses list
│   └── schema.json              # JSON schema for standalone community courses
├── src/
│   ├── scripts.js               # Optional character charts & handwriting board definitions per language
│   └── appIcons.js              # Automatically registers every language's icon from syllabus.json at runtime
├── scripts/
│   └── sync-course-pipeline.py  # One-command validator + icon/manifest/registry/service-worker pipeline
└── .github/workflows/
    └── validate-courses.yml     # CI workflow that validates every Pull Request automatically
```

---

## Option A: Add a New Language to the Universal Matrix

Adding **1 language** (e.g. German `de`) automatically creates `2 × N` new complete courses (e.g. `en→de`, `ml→de`, `ja→de`, `de→en`, `de→ml`, `de→ja`, …), registers its icon in the Profile emblem & App Icon picker, caches it offline in the PWA, and generates its native Android adaptive launcher icon.

### Step 1: Register Language Metadata & Icon in `courses/matrix/syllabus.json`

Add an entry to the `"languages"` array in [`courses/matrix/syllabus.json`](courses/matrix/syllabus.json):

```json
{
  "code": "de",
  "name": "German",
  "nativeName": "Deutsch",
  "speechLocale": "de-DE",
  "dir": "ltr",
  "usesTransliteration": false,
  "standardName": "CEFR",
  "levelLabels": ["A1", "A2", "B1", "B2", "C1-C2"],
  "icon": {
    "glyph": "Ü",
    "fontFamily": "'Fredoka', 'Nunito', 'Noto Sans', sans-serif",
    "fontSize": 234,
    "y": 336,
    "fgSize": 146,
    "fgY": 274
  }
}
```

#### Language Field Notes
- **`code`**: 2–3 lowercase ISO 639-1/639-3 code (e.g. `de`, `it`, `pt`, `bn`, `mr`, `tr`, `vi`, `th`).
- **`speechLocale`**: Standard BCP-47 locale tag used for Web Speech API & native Android Text-to-Speech (e.g. `de-DE`, `bn-IN`, `tr-TR`).
- **`dir`**: `"ltr"` for left-to-right scripts, `"rtl"` for right-to-left scripts (Arabic, Hebrew, Urdu, Persian, etc.).
- **`usesTransliteration`**: Set `true` for non-Latin scripts (Indic, CJK, Cyrillic, Arabic, Greek, Thai) so romanization hints are displayed; set `false` for Latin-script languages.
- **`standardName` & `levelLabels`**: Must contain **exactly 5 level labels** matching the 5 tiers (e.g. CEFR `["A1", "A2", "B1", "B2", "C1-C2"]`, JLPT `["N5", "N4", "N3", "N2", "N1"]`, or `["Stage 1", ..., "Stage 5"]`).
- **`icon`**: Defines the language's representative letter (first letter of the alphabet or most iconic character representing the language):
  - `glyph`: Single character shown inside the circular 3D Rich Purple medallion (and Android adaptive icon).
  - `fontFamily`: Noto / web font stack that renders the glyph cleanly.
  - `fontSize` / `y`: Typography tuning inside the `512×512` SVG medallion (`cx=256, cy=240`).
  - `fgSize` / `fgY`: Typography tuning inside the `432×432` Android adaptive icon safe zone (`x=216`).

### Step 2: Create the Language Pack `courses/langs/<code>.json`

Copy [`courses/langs/en.json`](courses/langs/en.json) (for Latin scripts) or [`courses/langs/hi.json`](courses/langs/hi.json) / [`courses/langs/ja.json`](courses/langs/ja.json) (for non-Latin scripts) as your starting template and translate all **375 concepts** (`c001`–`c375`) and **25 unit grammar notes** (`u01`–`u25`):

```json
{
  "code": "de",
  "grammarNotes": {
    "u01": "German greetings vary by time of day (Guten Morgen, Guten Tag, Guten Abend) and distinguish polite 'Sie' from informal 'du'.",
    "u02": "..."
  },
  "items": {
    "c001": {
      "t": "Guten Morgen",
      "r": "",
      "x": "Guten Morgen! Wie geht es Ihnen?",
      "xr": ""
    },
    "c002": {
      "t": "Hallo",
      "r": "",
      "x": "Hallo, schön dich zu sehen!",
      "xr": ""
    }
  }
}
```

#### Item Field Reference
| Key | Required | Description |
| :--- | :---: | :--- |
| `t` | Yes | Word, phrase, or sentence in the target language's native script. |
| `r` | For non-Latin | Romanized transliteration / pronunciation guide (leave `""` for Latin scripts). |
| `reading` | Optional | Phonetic script reading when distinct from `t` (e.g. Hiragana reading for Japanese Kanji). |
| `x` | Yes | Natural example sentence using `t` in context. |
| `xr` | For non-Latin | Romanized transliteration of the example sentence `x` (leave `""` for Latin scripts). |

### Step 3: (Optional) Add Character Chart & Handwriting Board (`src/scripts.js`)

If your language has its own alphabet, abugida, syllabary, or accent set, add a script chart entry in [`src/scripts.js`](src/scripts.js) under `SCRIPTS_BY_LANG['<code>']` so learners also get interactive character cards, pronunciation drills, and the 3-pass handwriting drawing board!

### Step 4: Run the Automated Course Pipeline

Run the pipeline script once from the repository root:

```bash
python3 scripts/sync-course-pipeline.py
```

This single command automatically completes the **entire cross-platform pipeline**:
1. Validates all **375 concepts**, **25 grammar notes**, and metadata for every language pack.
2. Updates **`courses/registry.json`** with the new language count, pair count, and language entry.
3. Updates **`sw.js`** offline PWA precache list to include `./courses/langs/<code>.json`.
4. Generates your language's **Android mipmap icon** (`android/res/mipmap-xxxhdpi/ic_launcher_<code>.png`), **Android adaptive foreground** (`android/res/drawable-xxxhdpi/ic_launcher_fg_<code>.png`), and **Android adaptive XML** (`android/res/mipmap-anydpi-v26/ic_launcher_<code>.xml`) *(requires `rsvg-convert` from `librsvg` — on Ubuntu/Debian: `sudo apt install librsvg2-bin`; on Arch: `sudo pacman -S librsvg`)*.
5. Syncs the native Android `<activity-alias>` entry in **`android/AndroidManifest.xml`** and `aliasMap` in **`android/src/org/polygot/app/MainActivity.java`**.

> Note: On **Web PWA** and **Linux Desktop**, `src/appIcons.js` reads `icon` straight from `courses/matrix/syllabus.json` automatically — zero extra JavaScript edits required!

Verify everything passes CI checks before committing:

```bash
python3 scripts/sync-course-pipeline.py --check
```

---

## Option B: Add a Standalone / Specialized Community Course

Want to build a focused course that doesn't follow the 375-concept matrix (e.g. *Travel Japanese*, *Medical Spanish*, or a *Konkani Basics* mini-course)?

### Step 1: Create Your Course Manifest

Create `courses/<course-id>/course.json` following [`courses/schema.json`](courses/schema.json):

```json
{
  "id": "en-ja-travel",
  "version": "1.0.0",
  "title": "Japanese for Travelers",
  "description": "Essential phrases for trains, hotels, dining, and shopping in Japan.",
  "license": "CC-BY-SA-4.0",
  "sourceLang": { "code": "en", "name": "English", "dir": "ltr" },
  "targetLang": {
    "code": "ja",
    "name": "Japanese",
    "nativeName": "日本語",
    "speechLocale": "ja-JP",
    "dir": "ltr",
    "usesTransliteration": true
  },
  "units": [
    {
      "id": "u1",
      "title": "Airport & Trains",
      "subtitle": "Tickets, platforms, and directions",
      "cefrLevel": "A1",
      "lessons": [
        {
          "id": "l1",
          "title": "Buying a Ticket",
          "grammarNote": "Use '〜はどこですか' (wa doko desu ka) to ask where something is.",
          "items": [
            {
              "id": "travel_ja_kippu",
              "term": "切符",
              "reading": "きっぷ",
              "transliteration": "kippu",
              "translation": "Ticket",
              "example": {
                "term": "切符を二枚ください。",
                "transliteration": "Kippu o nimai kudasai.",
                "translation": "Two tickets, please."
              }
            }
          ]
        }
      ]
    }
  ]
}
```

> You can also split large standalone courses across multiple files using `"sectionFiles": ["./courses/en-ja-travel/levels/part1.json", ...]`.

### Step 2: Register in `courses/registry.json`

Add your course entry to the `"courses"` array in [`courses/registry.json`](courses/registry.json):

```json
{
  "id": "en-ja-travel",
  "path": "courses/en-ja-travel/course.json",
  "title": "Japanese for Travelers",
  "sourceLang": "English",
  "targetLang": "Japanese",
  "nativeName": "日本語",
  "standard": "Travel",
  "version": "1.0.0",
  "items": 25
}
```

### Step 3: Validate with the Pipeline Script

```bash
python3 scripts/sync-course-pipeline.py --check
```

---

## Important Things to Note & Quality Guidelines

1. **Never Rename Existing Concept / Item IDs:**
   Spaced-repetition flashcard history (`state.srs`) is keyed by permanent IDs (`c001`–`c375` in the matrix, or `item.id` in standalone courses). Editing a translation or typo is safe; changing an ID resets learners' review schedules.
2. **Use Natural, Idiomatic Phrasing:**
   Translate meaning and register naturally — avoid stiff machine-translated word-for-word phrasing, especially for greetings, idioms, and politeness levels (e.g. polite forms in Japanese/Korean/Malayalam/Hindi/French/German).
3. **Keep Transliterations Beginner-Friendly & Consistent:**
   Use standard, readable romanization (Hepburn for Japanese, Pinyin with tone marks for Mandarin, Revised Romanization for Korean, ISO/common phonetic spelling for Indic and Arabic scripts).
4. **Right-to-Left (RTL) Scripts:**
   Always set `"dir": "rtl"` on RTL languages. Polygot automatically sets `dir="rtl"` on prompts, options, flashcards, and example sentences.
5. **Respect File Encoding & JSON Formatting:**
   Always save files as **UTF-8 without BOM** and format with 2-space indentation.
6. **Licensing:**
   All course data contributed to `courses/` is published under **CC-BY-SA-4.0** (code changes under **MIT**). Do not copy copyrighted textbooks or proprietary course lists.

---

## Pull Request Checklist

- [ ] Added language metadata + `icon` to `courses/matrix/syllabus.json` and full 375-concept pack to `courses/langs/<code>.json` *(or standalone `courses/<id>/course.json` + `courses/registry.json`)*.
- [ ] Ran `python3 scripts/sync-course-pipeline.py` to generate Android adaptive icons and sync `courses/registry.json`, `sw.js`, `AndroidManifest.xml`, and `MainActivity.java`.
- [ ] Confirmed `python3 scripts/sync-course-pipeline.py --check` passes with **0 errors**.
- [ ] Tested the new language locally with `python3 -m http.server 18422` (verified Learning Path, Exercise drills, Flashcards, and Profile App Icon preview).
- [ ] Opened a Pull Request targeting `main` — GitHub Actions (`.github/workflows/validate-courses.yml`) will automatically verify your submission!
