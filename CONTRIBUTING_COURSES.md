# Contributing a Language Course to OpenLingo

OpenLingo discovers community courses directly from the `courses/` directory and `courses/registry.json` in this repository. Once your Pull Request is merged into `main`, learners on both the Web PWA and Android app can immediately see and download your course from **Course Studio → GitHub Course Catalog** without waiting for an app update!

## Directory Convention

```text
courses/
├── registry.json              # Master catalog read live by the app
├── schema.json                # JSON schema for validation
└── en-fr/                     # Example: English → French
    ├── course.json            # Course metadata + sectionFiles[]
    └── levels/
        ├── a1.json
        └── a2.json
```

## 3 Steps to Add or Update a Course

1. **Create or edit your course files** inside `courses/<source>-<target>/`:
   - Copy `courses/en-es/course.json` as a template.
   - Give every vocabulary item a **permanent unique `id`** (e.g. `fr_a1_bonjour`) so spaced-repetition progress survives future edits.
2. **Register or bump the version in `courses/registry.json`**:
   - Add a new entry under `"courses"` (or bump `"version"` if updating an existing course).
3. **Open a Pull Request**:
   - Our GitHub Actions workflow (`.github/workflows/validate-courses.yml`) automatically verifies valid JSON, required fields, referenced level files, and zero duplicate item IDs across the entire catalog.
