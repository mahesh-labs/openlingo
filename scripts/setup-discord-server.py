#!/usr/bin/env python3
"""
One-Command Polygot Discord Server Setup Script.

Creates the complete Polygot Discord category, channel, forum, and role layout
using Discord REST API v10 — AND automatically writes each language's real Discord
channel URL (`https://discord.com/channels/<guild_id>/<channel_id>`) directly into
`src/config.js` (`courseDiscordChannels`) so every course inside Polygot links
directly to its dedicated channel!

Usage:
  export DISCORD_BOT_TOKEN="your-bot-token"
  export DISCORD_GUILD_ID="your-server-id"
  python3 scripts/setup-discord-server.py

Dry-run (prints full blueprint without calling Discord API):
  python3 scripts/setup-discord-server.py --dry-run
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

API_BASE = "https://discord.com/api/v10"
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_JS_PATH = os.path.join(PROJECT_DIR, "src", "config.js")

# Discord channel types: 0 = Text, 2 = Voice, 4 = Category, 5 = Announcement, 15 = Forum
BLUEPRINT = [
    {
        "category": "📢 START HERE",
        "channels": [
            {
                "name": "welcome",
                "type": 0,
                "topic": "Welcome to Polygot! Free, open-source, offline-first language learning across Web, Android, Windows & Linux.",
                "welcome_post": (
                    "# 👋 Welcome to the Polygot Community!\n\n"
                    "Polygot is a **100% free, open-source, zero-server** language learning app with **13 languages (156 any-to-any courses)**, "
                    "complete character & handwriting boards, 3D flashcards, and private Google Drive sync.\n\n"
                    "🌐 **Live Web App:** https://mahesh-labs.github.io/polygot/\n"
                    "📦 **Downloads (Android, Windows, Linux):** https://github.com/mahesh-labs/polygot/releases\n"
                    "💻 **GitHub Repo:** https://github.com/mahesh-labs/polygot\n"
                    "🌍 **Create & Share a Course:** https://github.com/mahesh-labs/polygot/blob/main/CONTRIBUTING_COURSES.md\n\n"
                    "Introduce yourself in **#introductions** and jump into your language channel under **📚 COURSES**!"
                ),
            },
            {
                "name": "rules",
                "type": 0,
                "topic": "Community guidelines for a friendly, supportive learning space.",
                "welcome_post": (
                    "# 📜 Community Rules\n\n"
                    "1. **Be kind & encouraging** — everyone starts as a beginner.\n"
                    "2. **Stay on topic** — use the matching `#course-*` channel for language help and `#bug-reports` for issues.\n"
                    "3. **No spam or self-promotion** — sharing your Polygot courses in `#community-courses` is always welcome!\n"
                    "4. **Constructive feedback** — when suggesting translation improvements, include the language pair and unit/lesson.\n"
                    "5. **Follow Discord's Terms of Service & Community Guidelines.**"
                ),
            },
            {"name": "announcements", "type": 0, "topic": "Official Polygot releases, roadmap updates, and major community news."},
            {"name": "downloads-and-links", "type": 0, "topic": "Permanent links for Web PWA, Android APK, Windows EXE/MSI/Portable, Linux AppImage/Flatpak/Deb/RPM/Arch."},
            {"name": "roles", "type": 0, "topic": "Pick your learning language roles, native speaker badges, and Beta Tester / Course Creator roles."},
        ],
    },
    {
        "category": "💬 COMMUNITY",
        "channels": [
            {"name": "general", "type": 0, "topic": "General chat about Polygot, languages, and learning tips."},
            {"name": "introductions", "type": 0, "topic": "Say hi! Tell us what languages you speak and what you're learning."},
            {"name": "daily-streaks-and-wins", "type": 0, "topic": "Share your streaks, XP milestones, finished units, and handwriting board screenshots!"},
            {"name": "study-buddies", "type": 0, "topic": "Find language exchange partners and speaking practice buddies."},
            {"name": "off-topic", "type": 0, "topic": "Music, movies, travel, culture, and casual hangout."},
        ],
    },
    {
        "category": "🐛 SUPPORT & IDEAS",
        "channels": [
            {"name": "help-and-questions", "type": 0, "topic": "Need help installing, syncing Google Drive, or setting up audio? Ask here!"},
            {"name": "bug-reports", "type": 0, "topic": "Report bugs — include your platform (Android / Windows / Linux / Web), app version, and a screenshot."},
            {"name": "feature-suggestions", "type": 0, "topic": "Suggest new features and react with 👍 to vote on community ideas!"},
            {"name": "translation-fixes", "type": 0, "topic": "Spot a typo or have a more natural phrasing? Post the course pair (e.g. ML→TA) and word here."},
        ],
    },
    {
        "category": "📚 COURSES",
        "channels": [
            {"name": "community-courses", "type": 0, "topic": "Share your custom Polygot course links, get star ratings, feedback, and discover popular community courses!"},
            {"name": "course-english", "type": 0, "lang": "en", "topic": "English (A) — grammar questions, pronunciation, vocabulary & feedback."},
            {"name": "course-malayalam", "type": 0, "lang": "ml", "topic": "Malayalam (മലയാളം · അ) — script, Kagunitham, vocabulary & practice."},
            {"name": "course-tamil", "type": 0, "lang": "ta", "topic": "Tamil (தமிழ் · அ) — Uyir, Mei, Uyirmei combinations, grammar & practice."},
            {"name": "course-kannada", "type": 0, "lang": "kn", "topic": "Kannada (ಕನ್ನಡ · ಅ) — Kagunita, Ottakshara, grammar & conversation."},
            {"name": "course-telugu", "type": 0, "lang": "te", "topic": "Telugu (తెలుగు · అ) — Gunintalu, Vattulu, grammar & conversation."},
            {"name": "course-hindi", "type": 0, "lang": "hi", "topic": "Hindi (हिन्दी · अ) — Devanagari Barakhadi, grammar & conversation."},
            {"name": "course-japanese", "type": 0, "lang": "ja", "topic": "Japanese (日本語 · あ) — Hiragana, Katakana, Kanji & JLPT N5–N1."},
            {"name": "course-chinese", "type": 0, "lang": "zh", "topic": "Chinese Mandarin (中文 · 中) — Hanzi, Pinyin, tones & HSK 1–6."},
            {"name": "course-korean", "type": 0, "lang": "ko", "topic": "Korean (한국어 · 한) — Hangul, grammar & TOPIK 1–6."},
            {"name": "course-arabic", "type": 0, "lang": "ar", "topic": "Arabic (العربية · ع) — Arabic script (RTL), vocabulary & conversation."},
            {"name": "course-spanish", "type": 0, "lang": "es", "topic": "Spanish (Español · Ñ) — grammar, idioms & CEFR A1–C2."},
            {"name": "course-french", "type": 0, "lang": "fr", "topic": "French (Français · É) — pronunciation, grammar & CEFR A1–C2."},
            {"name": "course-russian", "type": 0, "lang": "ru", "topic": "Russian (Русский · Я) — Cyrillic script, cases & TRKI A1–C2."},
        ],
    },
    {
        "category": "🛠️ COURSE CREATORS & DEV",
        "channels": [
            {"name": "course-creation-help", "type": 0, "topic": "Help authoring new languages, using Course Studio, and submitting GitHub PRs."},
            {"name": "course-reviews-and-feedback", "type": 0, "topic": "Peer-review new community courses and native-speaker quality checks."},
            {"name": "dev-chat", "type": 0, "topic": "App development discussions (Web PWA, Android, Windows, Linux)."},
            {"name": "github-feed", "type": 0, "topic": "Automated GitHub webhook feed for commits, PRs, issues, and releases."},
        ],
    },
    {
        "category": "🎙️ VOICE & PRACTICE",
        "channels": [
            {"name": "General Lounge", "type": 2},
            {"name": "Speaking Practice 1", "type": 2},
            {"name": "Speaking Practice 2", "type": 2},
            {"name": "Quiet Study & Lo-Fi", "type": 2},
        ],
    },
]

ROLES = [
    ("Course Creator", 0x9B59B6),
    ("Native Helper", 0x10B981),
    ("Beta Tester", 0xF59E0B),
    ("Contributor", 0x3B82F6),
]

LAUNCH_POSTS = {
    "rules": (
        "# 📜 Polygot Community Rules\n\n"
        "Welcome! Help us keep Polygot a welcoming, focused, and fun space for language learners and open-source contributors:\n\n"
        "**1. Be Kind & Encouraging** — Everyone starts from zero. Never mock someone's pronunciation, handwriting, or beginner mistakes.\n"
        "**2. Use the Right Channels** — Language questions go in `#course-*`, bugs in `#bug-reports`, ideas in `#feature-suggestions`, and translation tweaks in `#translation-fixes`.\n"
        "**3. Respectful Course & Feedback Etiquette** — When giving feedback on a course or translation, include the language pair (e.g. `ML→TA`), unit/lesson, and a constructive suggestion.\n"
        "**4. Sharing Courses is Encouraged!** — Share your Polygot course links (`?course=...`) in `#community-courses` so learners can try, rate, and review them. No unrelated spam or self-promotion.\n"
        "**5. Zero Hate Speech, Harassment, or NSFW** — Keep all text, voice rooms, usernames, and shared handwriting screenshots safe for everyone.\n"
        "**6. Protect Privacy & Security** — Never post API tokens, Google OAuth secrets, `OL1:` backup codes containing private data, or personal info.\n"
        "**7. Good-Faith Bug Reports** — In `#bug-reports`, please include your platform (**Web / Android / Windows / Linux**), app version, and a screenshot if possible.\n"
        "**8. Follow Discord's Terms of Service & Community Guidelines.**\n\n"
        "Thank you for helping grow free, open-source language education! 💜"
    ),
    "downloads-and-links": (
        "# 📦 Polygot Downloads & Official Links\n\n"
        "🌐 **Live Web App (No Install — Works Offline as PWA):**\n"
        "https://mahesh-labs.github.io/polygot/\n\n"
        "📥 **Latest Release (v0.0.11-beta — All 12 Platform Builds):**\n"
        "https://github.com/mahesh-labs/polygot/releases/tag/v0.0.11-beta\n"
        "• **Android:** `Polygot-v0.0.11-beta.apk`\n"
        "• **Windows:** Installer (`setup.exe`), Single-File Portable (`portable.exe`), MSI (`.msi`), Portable `.zip`\n"
        "• **Linux:** `.AppImage`, `.flatpak`, `.deb`, `.rpm`, Arch `.pkg.tar.zst`, `.tar.gz`, `.zip`\n\n"
        "💻 **Source Code (GitHub):** https://github.com/mahesh-labs/polygot\n"
        "🌍 **Create & Contribute a Course:** https://github.com/mahesh-labs/polygot/blob/main/CONTRIBUTING_COURSES.md\n"
        "🔒 **Privacy Policy:** https://mahesh-labs.github.io/polygot/privacy.html"
    ),
    "announcements": (
        "# 🚀 Polygot v0.0.11-beta — First Public Cross-Platform Release!\n\n"
        "@everyone **Polygot v0.0.11-beta** is now officially live for **Web, Android, Windows, and Linux** — completely free, open-source, offline-first, and zero-server!\n\n"
        "### ✨ What's Inside\n"
        "• **13 Languages · 156 Any-to-Any Courses** (Beginner → Mastery, fully localized in your chosen source language): English, Malayalam, Tamil, Kannada, Telugu, Hindi, Japanese, Chinese (Mandarin), Korean, Arabic (RTL), Spanish, French, and Russian.\n"
        "• **Complete Script & Handwriting Boards**: Decluttered Characters screen with `All Characters` first, full **Tamil Uyirmei (297 chars)**, **Malayalam Kagunitham (540)**, **Kannada**, **Telugu**, **Hindi Barakhadi**, **Hiragana/Katakana/Kanji**, **Hangul**, **Arabic**, and **Cyrillic**.\n"
        "• **Brand-New Windows Desktop Builds**: Installer (`.exe`), **Single-File Portable `.exe`** (double-click, zero install), `.msi`, and Portable `.zip` — zero Python or Electron bloat.\n"
        "• **Native Android Sign in with Google**: Opens Android's native account picker popup directly inside the app (no browser redirect!) with full-bleed customizable language app icons.\n"
        "• **Direct In-App Updates**: Install future updates directly from inside Polygot on Android, Windows, Linux, and Web.\n"
        "• **Course Ratings, Feedback, Shareable Links & Linked Discord Channels**: Every course now has an Author, shareable `?course=` link, 1–5★ ratings & comments, and a direct link to its `#course-*` channel right here!\n\n"
        "### 🔗 Try It Now\n"
        "🌐 **Web App:** https://mahesh-labs.github.io/polygot/\n"
        "📦 **Download (Android / Windows / Linux):** https://github.com/mahesh-labs/polygot/releases/tag/v0.0.11-beta\n\n"
        "Drop your feedback in `#bug-reports` or `#feature-suggestions`, share your streak in `#daily-streaks-and-wins`, and let us know which language you're starting in `#introductions`! 💜"
    ),
}


def discord_req(method, path, token, payload=None):
    url = f"{API_BASE}{path}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {
        "Authorization": f"Bot {token}",
        "User-Agent": "PolygotDiscordSetup/1.0",
    }
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    while True:
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            if e.code == 429:
                try:
                    wait = float(json.loads(body).get("retry_after", 1.5)) + 0.25
                except Exception:
                    wait = 2.0
                time.sleep(wait)
                continue
            raise RuntimeError(f"Discord API {method} {path} failed ({e.code}): {body}")


def update_config_js(channel_map):
    if not channel_map or not os.path.exists(CONFIG_JS_PATH):
        return
    with open(CONFIG_JS_PATH, "r", encoding="utf-8") as f:
        src = f.read()
    lines = ["  courseDiscordChannels: {"]
    keys = sorted(channel_map.keys())
    for idx, k in enumerate(keys):
        comma = "," if idx < len(keys) - 1 else ""
        lines.append(f"    {k}: '{channel_map[k]}'{comma}")
    lines.append("  },")
    block = "\n".join(lines)
    updated = re.sub(r"  courseDiscordChannels:\s*\{[\s\S]*?\},", block, src, count=1)
    with open(CONFIG_JS_PATH, "w", encoding="utf-8") as f:
        f.write(updated)
    print(f"\nUpdated {CONFIG_JS_PATH} with {len(channel_map)} direct Discord course channel links!")


def main():
    if "--dry-run" in sys.argv:
        for cat in BLUEPRINT:
            print(f"\n{cat['category']}")
            for ch in cat["channels"]:
                prefix = "🔊" if ch["type"] == 2 else "#"
                tag = f" [links to course: {ch['lang']}]" if ch.get("lang") else ""
                print(f"  {prefix} {ch['name']}{tag}")
        return

    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    guild_id = os.environ.get("DISCORD_GUILD_ID", "").strip()
    if not token or not guild_id:
        print("Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID environment variables first (or run with --dry-run).")
        sys.exit(1)

    existing_channels = discord_req("GET", f"/guilds/{guild_id}/channels", token)

    if "--post-launch" in sys.argv:
        by_name = {c["name"].lower(): c for c in existing_channels if c.get("type") == 0}
        for ch_name, content in LAUNCH_POSTS.items():
            target = by_name.get(ch_name)
            if not target:
                print(f"Skipping #{ch_name} (channel not found)")
                continue
            msg = discord_req("POST", f"/channels/{target['id']}/messages", token, {"content": content})
            print(f"Posted to #{ch_name} (message id: {msg.get('id')})")
            if msg.get("id") and ch_name in ("rules", "downloads-and-links"):
                try:
                    discord_req("PUT", f"/channels/{target['id']}/pins/{msg['id']}", token)
                    print(f"  Pinned in #{ch_name}")
                except Exception:
                    pass
            time.sleep(0.5)
        print("\nLaunch rules, downloads, and v0.0.11-beta announcement posted!")
        return

    existing_cats = {c["name"].lower(): c for c in existing_channels if c.get("type") == 4}
    existing_by_key = {(c.get("parent_id"), c["name"].lower()): c for c in existing_channels if c.get("type") != 4}

    existing_roles = discord_req("GET", f"/guilds/{guild_id}/roles", token)
    existing_role_names = {r["name"].lower() for r in existing_roles}
    for role_name, color in ROLES:
        if role_name.lower() not in existing_role_names:
            discord_req("POST", f"/guilds/{guild_id}/roles", token, {"name": role_name, "color": color, "mentionable": True})
            print(f"Created role: {role_name}")
            time.sleep(0.35)

    course_channel_urls = {}

    for cat in BLUEPRINT:
        cat_name = cat["category"]
        cat_obj = existing_cats.get(cat_name.lower())
        if not cat_obj:
            cat_obj = discord_req("POST", f"/guilds/{guild_id}/channels", token, {"name": cat_name, "type": 4})
            print(f"Created category: {cat_name}")
            time.sleep(0.35)
        cat_id = cat_obj["id"]

        for ch in cat["channels"]:
            ch_name = ch["name"]
            existing = existing_by_key.get((cat_id, ch_name.lower()))
            if not existing:
                payload = {"name": ch_name, "type": ch["type"], "parent_id": cat_id}
                if ch.get("topic") and ch["type"] == 0:
                    payload["topic"] = ch["topic"]
                existing = discord_req("POST", f"/guilds/{guild_id}/channels", token, payload)
                print(f"  Created channel: {ch_name}")
                time.sleep(0.4)
                if ch.get("welcome_post"):
                    msg = discord_req("POST", f"/channels/{existing['id']}/messages", token, {"content": ch["welcome_post"]})
                    if msg.get("id"):
                        try:
                            discord_req("PUT", f"/channels/{existing['id']}/pins/{msg['id']}", token)
                        except Exception:
                            pass
            else:
                print(f"  Exists: {ch_name}")

            if ch.get("lang"):
                course_channel_urls[ch["lang"]] = f"https://discord.com/channels/{guild_id}/{existing['id']}"

    update_config_js(course_channel_urls)
    print("\nAll Polygot Discord channels and course links are ready!")


if __name__ == "__main__":
    main()
