#!/usr/bin/env python3
"""
Polygot Course & Language Pipeline Tool.

Validates the universal course matrix (`courses/matrix/syllabus.json` + `courses/langs/*.json`)
and standalone community courses (`courses/registry.json`), and keeps the full cross-platform
pipeline in sync whenever a language or community course is added:
  1. Validates every language pack (all 375 concepts + 25 unit grammar notes + icon metadata)
  2. Validates all standalone community courses in `courses/registry.json`
  3. Syncs `courses/registry.json` matrix catalog summary
  4. Syncs `sw.js` offline precache list for all language packs
  5. Generates Android mipmap + adaptive foreground + adaptive XML icons (when `rsvg-convert` is installed)
  6. Syncs Android `<activity-alias>` entries in `android/AndroidManifest.xml`
     and `aliasMap` in `android/src/org/polygot/app/MainActivity.java`

Usage:
  python3 scripts/sync-course-pipeline.py          # Validate and auto-sync all pipeline files & icons
  python3 scripts/sync-course-pipeline.py --check  # CI validation mode (exits non-zero if anything is out of sync)
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYLLABUS_PATH = os.path.join(ROOT, "courses", "matrix", "syllabus.json")
REGISTRY_PATH = os.path.join(ROOT, "courses", "registry.json")
SW_PATH = os.path.join(ROOT, "sw.js")
MANIFEST_PATH = os.path.join(ROOT, "android", "AndroidManifest.xml")
MAIN_ACTIVITY_PATH = os.path.join(ROOT, "android", "src", "org", "polygot", "app", "MainActivity.java")

DEFAULT_ICON_ID = "polygot"
EXTRA_SYMBOL_ICONS = [
    {
        "id": "star",
        "glyph": "★",
        "fontFamily": "Noto Sans Symbols 2, DejaVu Sans, sans-serif",
        "fontSize": 240,
        "y": 326,
        "fgSize": 150,
        "fgY": 268,
    },
    {
        "id": "diamond",
        "glyph": "◆",
        "fontFamily": "Noto Sans Symbols 2, DejaVu Sans, sans-serif",
        "fontSize": 224,
        "y": 310,
        "fgSize": 140,
        "fgY": 258,
    },
    {
        "id": "triangle",
        "glyph": "▲",
        "fontFamily": "Noto Sans Symbols 2, DejaVu Sans, sans-serif",
        "fontSize": 214,
        "y": 302,
        "fgSize": 134,
        "fgY": 252,
    },
]


def alias_class_name(icon_id: str) -> str:
    clean = re.sub(r"[^a-zA-Z0-9]+", " ", icon_id).title().replace(" ", "")
    return f".IconAlias{clean}"


def replace_block(text: str, start_marker: str, end_marker: str, new_inner: str) -> str:
    pattern = re.compile(
        r"(" + re.escape(start_marker) + r"\n)(.*?)(\n[ \t]*" + re.escape(end_marker) + r")",
        re.DOTALL,
    )
    if not pattern.search(text):
        raise RuntimeError(f"Missing markers {start_marker} .. {end_marker}")
    return pattern.sub(lambda m: m.group(1) + new_inner + m.group(3), text, count=1)


def sync_file(path: str, expected_content: str, check_only: bool, errors: list) -> None:
    current = open(path, "r", encoding="utf-8").read() if os.path.exists(path) else ""
    if current == expected_content:
        return
    if check_only:
        rel = os.path.relpath(path, ROOT)
        errors.append(f"Out of sync: {rel} — run `python3 scripts/sync-course-pipeline.py`")
    else:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(expected_content)
        print(f"SYNCED {os.path.relpath(path, ROOT)}")


def validate_matrix(syllabus: dict, errors: list) -> tuple[list[dict], list[str], list[str]]:
    langs = syllabus.get("languages")
    tiers = syllabus.get("tiers")
    if not isinstance(langs, list) or len(langs) < 2:
        errors.append("courses/matrix/syllabus.json must define at least 2 languages.")
        return [], [], []
    if not isinstance(tiers, list) or not tiers:
        errors.append("courses/matrix/syllabus.json must define tiers.")
        return [], [], []

    unit_ids = []
    concept_ids = []
    for tier in tiers:
        for unit in tier.get("units", []):
            uid = unit.get("id")
            if uid:
                unit_ids.append(uid)
            for lesson in unit.get("lessons", []):
                for cid in lesson.get("concepts", []):
                    concept_ids.append(cid)

    if len(concept_ids) != len(set(concept_ids)):
        errors.append("Duplicate concept IDs detected in courses/matrix/syllabus.json.")

    seen_codes = set()
    for lang in langs:
        code = str(lang.get("code", "")).strip()
        if not re.match(r"^[a-z]{2,3}$", code):
            errors.append(f"Invalid language code '{code}' (must be 2-3 lowercase ASCII letters).")
            continue
        if code in seen_codes:
            errors.append(f"Duplicate language code '{code}' in syllabus.json.")
            continue
        seen_codes.add(code)

        for req in ("name", "nativeName", "speechLocale", "standardName", "levelLabels"):
            if not lang.get(req):
                errors.append(f"Language '{code}' missing required field '{req}' in syllabus.json.")

        icon = lang.get("icon") or {}
        if not str(icon.get("glyph", "")).strip():
            errors.append(f"Language '{code}' missing required icon.glyph in syllabus.json.")

        pack_path = os.path.join(ROOT, "courses", "langs", f"{code}.json")
        if not os.path.exists(pack_path):
            errors.append(f"Missing language pack: courses/langs/{code}.json")
            continue

        pack = json.load(open(pack_path, "r", encoding="utf-8"))
        items = pack.get("items") or {}
        missing_items = [cid for cid in concept_ids if cid not in items or not str(items[cid].get("t", "")).strip() or not str(items[cid].get("x", "")).strip()]
        if missing_items:
            errors.append(
                f"courses/langs/{code}.json has {len(missing_items)} missing/incomplete concepts (e.g. {missing_items[:5]})."
            )

        gnotes = pack.get("grammarNotes") or {}
        missing_notes = [uid for uid in unit_ids if not str(gnotes.get(uid, "")).strip()]
        if missing_notes:
            errors.append(
                f"courses/langs/{code}.json missing grammarNotes for {len(missing_notes)} units (e.g. {missing_notes[:5]})."
            )

        print(f"OK matrix lang {code} ({lang.get('name')} · {icon.get('glyph')}): {len(items)} concepts, {len(gnotes)} grammar notes")

    return langs, unit_ids, concept_ids


def validate_standalone_courses(registry: dict, errors: list) -> list[dict]:
    entries = registry.get("courses")
    if entries is None:
        return []
    if not isinstance(entries, list):
        errors.append("courses/registry.json 'courses' must be an array.")
        return []

    seen_course_ids = set()
    seen_item_ids = set()
    valid_entries = []

    for entry in entries:
        path = (entry if isinstance(entry, str) else entry.get("path", "")).lstrip("./")
        abs_path = os.path.join(ROOT, path)
        if not path or not os.path.exists(abs_path):
            errors.append(f"Missing standalone course manifest in registry.json: {path}")
            continue
        course = json.load(open(abs_path, "r", encoding="utf-8"))
        cid = course.get("id")
        if not cid:
            errors.append(f"Course manifest missing 'id': {path}")
            continue
        if cid in seen_course_ids:
            errors.append(f"Duplicate standalone course id: {cid}")
            continue
        seen_course_ids.add(cid)

        sections = []
        if "sectionFiles" in course:
            for sf in course["sectionFiles"]:
                sf_abs = os.path.join(ROOT, str(sf).lstrip("./"))
                if not os.path.exists(sf_abs):
                    errors.append(f"Missing sectionFile '{sf}' in course {cid}")
                    continue
                sections.append(json.load(open(sf_abs, "r", encoding="utf-8")))
        elif "sections" in course:
            sections = course["sections"]
        elif "units" in course:
            sections = [{"units": course["units"]}]
        else:
            errors.append(f"Course {cid} has no sectionFiles, sections, or units.")
            continue

        item_count = 0
        for sec in sections:
            for unit in sec.get("units", []):
                for lesson in unit.get("lessons", []):
                    for item in lesson.get("items", []):
                        iid = item.get("id")
                        if not iid:
                            errors.append(f"Item missing permanent 'id' in standalone course {cid}")
                            continue
                        if iid in seen_item_ids:
                            errors.append(f"Duplicate item id '{iid}' in standalone course {cid}")
                            continue
                        if not item.get("term") or not item.get("translation"):
                            errors.append(f"Item '{iid}' missing term/translation in {cid}")
                            continue
                        seen_item_ids.add(iid)
                        item_count += 1
        print(f"OK standalone course {cid}: {item_count} items")
        valid_entries.append(entry)

    return valid_entries


def build_ordered_icons(langs: list[dict]) -> list[dict]:
    # Keep default Polygot emblem ('polygot') first, then all languages in syllabus order, then geometric emblems
    by_code = {l["code"]: l for l in langs}
    icons = [
        {
            "id": DEFAULT_ICON_ID,
            "label": "Polygot",
            "glyph": "A文",
            "fontFamily": "Fredoka, Nunito, Noto Sans, sans-serif",
            "fontSize": 248,
            "y": 332,
            "fgSize": 150,
            "fgY": 268,
            "monoDrawable": "ic_launcher_mono_polygot",
        }
    ]
    for l in langs:
        code = l["code"]
        lang = by_code[code]
        ic = lang.get("icon") or {}
        icons.append(
            {
                "id": code,
                "label": lang.get("name", code),
                "glyph": ic.get("glyph", code[0].upper()),
                "fontFamily": ic.get("fontFamily", "Noto Sans, sans-serif"),
                "fontSize": int(ic.get("fontSize", 220)),
                "y": int(ic.get("y", 320)),
                "fgSize": int(ic.get("fgSize", 140)),
                "fgY": int(ic.get("fgY", 264)),
            }
        )
    icons.extend(EXTRA_SYMBOL_ICONS)
    return icons


def sync_android_icons(icons: list[dict], check_only: bool, errors: list) -> None:
    mipmap_dir = os.path.join(ROOT, "android", "res", "mipmap-xxxhdpi")
    fg_dir = os.path.join(ROOT, "android", "res", "drawable-xxxhdpi")
    anydpi_dir = os.path.join(ROOT, "android", "res", "mipmap-anydpi-v26")
    rsvg = shutil.which("rsvg-convert")

    for ic in icons:
        pid = ic["id"]
        xml_name = "ic_launcher.xml" if pid == DEFAULT_ICON_ID else f"ic_launcher_{pid}.xml"
        xml_path = os.path.join(anydpi_dir, xml_name)
        mono_ref = ic.get("monoDrawable", f"ic_launcher_mono_{pid}")
        expected_xml = (
            '<?xml version="1.0" encoding="utf-8"?>\n'
            '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
            '    <background android:drawable="@color/ic_launcher_background" />\n'
            f'    <foreground android:drawable="@drawable/ic_launcher_fg_{pid}" />\n'
            f'    <monochrome android:drawable="@drawable/{mono_ref}" />\n'
            '</adaptive-icon>\n'
        )
        sync_file(xml_path, expected_xml, check_only, errors)

        mipmap_png = os.path.join(mipmap_dir, "ic_launcher.png" if pid == DEFAULT_ICON_ID else f"ic_launcher_{pid}.png")
        fg_png = os.path.join(fg_dir, f"ic_launcher_fg_{pid}.png")
        mono_png = os.path.join(fg_dir, f"{mono_ref}.png")

        if check_only:
            if not os.path.exists(mipmap_png):
                errors.append(f"Missing Android mipmap icon: {os.path.relpath(mipmap_png, ROOT)}")
            if not os.path.exists(fg_png):
                errors.append(f"Missing Android adaptive foreground icon: {os.path.relpath(fg_png, ROOT)}")
            if not os.path.exists(mono_png):
                errors.append(f"Missing Android monochrome icon: {os.path.relpath(mono_png, ROOT)}")
            continue

        if os.path.exists(mipmap_png) and os.path.exists(fg_png) and os.path.exists(mono_png):
            continue

        if not rsvg:
            errors.append(f"Cannot render missing icon PNGs for '{pid}': `rsvg-convert` is not installed.")
            continue

        import base64
        shell_path = os.path.join(ROOT, "assets", "icons", "polygot-shell-512.png")
        mono_shell_path = os.path.join(ROOT, "assets", "icons", "polygot-mono-shell-432.png")
        b64_shell = base64.b64encode(open(shell_path, "rb").read()).decode("ascii")
        b64_mono = base64.b64encode(open(mono_shell_path, "rb").read()).decode("ascii")
        font_clean = ic["fontFamily"].replace("'", "")
        b_size = int(ic.get("bubbleFontSize") or round(int(ic.get("fontSize", 220)) * 0.36))
        b_y = int(ic.get("bubbleY") or 256)
        sc = 306.0 / 512.0
        with tempfile.TemporaryDirectory() as tmp:
            svg = (
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">\n'
                f'  <image href="data:image/png;base64,{b64_shell}" x="0" y="0" width="512" height="512" />\n'
                f'  <text x="298" y="{b_y}" text-anchor="middle" fill="#ffffff" font-family="{font_clean}" font-size="{b_size}" font-weight="900">{ic["glyph"]}</text>\n'
                '</svg>'
            )
            svg_p = os.path.join(tmp, f"{pid}.svg")
            open(svg_p, "w", encoding="utf-8").write(svg)
            if not os.path.exists(mipmap_png):
                os.makedirs(mipmap_dir, exist_ok=True)
                subprocess.run([rsvg, "-w", "192", "-h", "192", svg_p, "-o", mipmap_png], check=True)
                print(f"GENERATED {os.path.relpath(mipmap_png, ROOT)}")

            if not os.path.exists(fg_png):
                fg_svg = (
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432" width="432" height="432">\n'
                    f'  <image href="data:image/png;base64,{b64_shell}" x="63" y="63" width="306" height="306" />\n'
                    f'  <text x="{63 + 298 * sc:.1f}" y="{63 + b_y * sc:.1f}" text-anchor="middle" fill="#ffffff" font-family="{font_clean}" font-size="{b_size * sc:.1f}" font-weight="900">{ic["glyph"]}</text>\n'
                    '</svg>'
                )
                fg_p = os.path.join(tmp, f"fg_{pid}.svg")
                open(fg_p, "w", encoding="utf-8").write(fg_svg)
                os.makedirs(fg_dir, exist_ok=True)
                subprocess.run([rsvg, "-w", "432", "-h", "432", fg_p, "-o", fg_png], check=True)
                print(f"GENERATED {os.path.relpath(fg_png, ROOT)}")

            if not os.path.exists(mono_png):
                mono_svg = (
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432" width="432" height="432">\n'
                    f'  <image href="data:image/png;base64,{b64_mono}" x="0" y="0" width="432" height="432" />\n'
                    f'  <text x="{63 + 298 * sc:.1f}" y="{63 + b_y * sc:.1f}" text-anchor="middle" fill="#ffffff" font-family="{font_clean}" font-size="{b_size * sc:.1f}" font-weight="900">{ic["glyph"]}</text>\n'
                    '</svg>'
                )
                mono_p = os.path.join(tmp, f"mono_{pid}.svg")
                open(mono_p, "w", encoding="utf-8").write(mono_svg)
                os.makedirs(fg_dir, exist_ok=True)
                subprocess.run([rsvg, "-w", "432", "-h", "432", mono_p, "-o", mono_png], check=True)
                print(f"GENERATED {os.path.relpath(mono_png, ROOT)}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate and sync Polygot course pipeline.")
    parser.add_argument("--check", action="store_true", help="Check only (fail if any file is out of sync).")
    args = parser.parse_args()

    errors: list[str] = []
    syllabus = json.load(open(SYLLABUS_PATH, "r", encoding="utf-8"))
    registry = json.load(open(REGISTRY_PATH, "r", encoding="utf-8")) if os.path.exists(REGISTRY_PATH) else {}

    langs, unit_ids, concept_ids = validate_matrix(syllabus, errors)
    standalone_entries = validate_standalone_courses(registry, errors)

    if langs:
        # 1. Sync courses/registry.json
        new_registry = {
            "catalogVersion": 3,
            "repo": registry.get("repo", "mahesh-labs/polygot"),
            "branch": registry.get("branch", "main"),
            "matrix": {
                "version": syllabus.get("version", "3.0.0"),
                "syllabusPath": "courses/matrix/syllabus.json",
                "conceptCount": len(concept_ids),
                "unitCount": len(unit_ids),
                "lessonCount": sum(len(u.get("lessons", [])) for t in syllabus.get("tiers", []) for u in t.get("units", [])),
                "pairCount": len(langs) * (len(langs) - 1),
                "languages": [
                    {
                        "code": l["code"],
                        "name": l["name"],
                        "nativeName": l["nativeName"],
                        "standard": (
                            f"{l['levelLabels'][0]}–{l['levelLabels'][-1]}"
                            if str(l['levelLabels'][0]).startswith(str(l['standardName']))
                            else f"{l['standardName']} {l['levelLabels'][0]}–{l['levelLabels'][-1]}"
                        ),
                        "iconGlyph": (l.get("icon") or {}).get("glyph", ""),
                        "path": f"courses/langs/{l['code']}.json",
                    }
                    for l in langs
                ],
            },
            "courses": standalone_entries,
        }
        sync_file(REGISTRY_PATH, json.dumps(new_registry, ensure_ascii=False, indent=2) + "\n", args.check, errors)

        # 2. Sync sw.js matrix language + i18n precache list
        sw_text = open(SW_PATH, "r", encoding="utf-8").read()
        entries = [f"  './courses/langs/{l['code']}.json'" for l in langs]
        for l in langs:
            i18n_path = os.path.join(ROOT, "courses", "i18n", f"{l['code']}.json")
            if os.path.exists(i18n_path):
                json.load(open(i18n_path, "r", encoding="utf-8"))
                entries.append(f"  './courses/i18n/{l['code']}.json'")
        lang_lines = ",\n".join(entries)
        new_sw = replace_block(
            sw_text,
            "// AUTO-GENERATED MATRIX LANGS START",
            "// AUTO-GENERATED MATRIX LANGS END",
            lang_lines,
        )
        sync_file(SW_PATH, new_sw, args.check, errors)

        # 3. Sync Android icons, AndroidManifest.xml aliases, and MainActivity.java aliasMap
        icons = build_ordered_icons(langs)
        sync_android_icons(icons, args.check, errors)

        alias_blocks = []
        for ic in icons:
            pid = ic["id"]
            is_default = pid == DEFAULT_ICON_ID
            icon_ref = "@mipmap/ic_launcher" if is_default else f"@mipmap/ic_launcher_{pid}"
            comment = f"        <!-- Default launcher icon: {ic['label']} ({ic['glyph']}) -->\n" if is_default else ""
            alias_blocks.append(
                f"{comment}"
                "        <activity-alias\n"
                f'            android:name="{alias_class_name(pid)}"\n'
                f'            android:enabled="{"true" if is_default else "false"}"\n'
                '            android:exported="true"\n'
                f'            android:icon="{icon_ref}"\n'
                f'            android:roundIcon="{icon_ref}"\n'
                '            android:label="@string/app_name"\n'
                '            android:targetActivity=".MainActivity">\n'
                "            <intent-filter>\n"
                '                <action android:name="android.intent.action.MAIN" />\n'
                '                <category android:name="android.intent.category.LAUNCHER" />\n'
                "            </intent-filter>\n"
                "        </activity-alias>"
            )
        manifest_text = open(MANIFEST_PATH, "r", encoding="utf-8").read()
        new_manifest = replace_block(
            manifest_text,
            "<!-- AUTO-GENERATED ICON ALIASES START -->",
            "<!-- AUTO-GENERATED ICON ALIASES END -->",
            "\n\n".join(alias_blocks),
        )
        sync_file(MANIFEST_PATH, new_manifest, args.check, errors)

        java_lines = "\n".join(
            f'            aliasMap.put("{ic["id"]}", "{alias_class_name(ic["id"])}");' for ic in icons
        )
        java_text = open(MAIN_ACTIVITY_PATH, "r", encoding="utf-8").read()
        new_java = replace_block(
            java_text,
            "// AUTO-GENERATED ICON ALIASES START",
            "// AUTO-GENERATED ICON ALIASES END",
            java_lines,
        )
        sync_file(MAIN_ACTIVITY_PATH, new_java, args.check, errors)

    if errors:
        print("\nPIPELINE ERRORS:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    print(
        f"\nALL COURSE PIPELINE CHECKS PASSED! "
        f"({len(langs)} matrix languages -> {len(langs) * max(len(langs) - 1, 0)} pairs, "
        f"{len(standalone_entries)} standalone courses, {len(icons)} app icons)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
