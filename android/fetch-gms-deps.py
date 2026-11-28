#!/usr/bin/env python3
"""
Downloads and extracts Google Play Services Auth (AuthorizationClient) Maven artifacts
into android/libs/ for Polygot's zero-Gradle aapt2+javac+d8 Android build pipeline.
"""
import os
import shutil
import sys
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

REPOS = [
    "https://dl.google.com/dl/android/maven2",
    "https://repo1.maven.org/maven2",
]

ROOTS = [
    ("com.google.android.gms", "play-services-auth", "21.3.0"),
]

OUT_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "libs")


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Polygot-Builder/1.0"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read()


def fetch_pom(g, a, v):
    gp = g.replace(".", "/")
    for repo in REPOS:
        url = f"{repo}/{gp}/{a}/{v}/{a}-{v}.pom"
        try:
            return repo, fetch(url)
        except Exception:
            continue
    raise RuntimeError(f"Could not fetch POM for {g}:{a}:{v}")


def strip_ns(tag):
    return tag.split("}", 1)[-1]


def parse_ver(v):
    v = v.strip()
    if v.startswith("[") or v.startswith("("):
        v = v.strip("[]()").split(",")[0].strip()
    return v


def ver_tuple(v):
    parts = []
    for p in v.replace("-", ".").split("."):
        try:
            parts.append((0, int(p)))
        except ValueError:
            parts.append((1, p))
    return tuple(parts)


def main():
    visited = {}
    queue = list(ROOTS)
    while queue:
        g, a, v = queue.pop(0)
        v = parse_ver(v)
        key = (g, a)
        if key in visited and ver_tuple(v) <= ver_tuple(visited[key][0]):
            continue
        repo, pom_bytes = fetch_pom(g, a, v)
        root = ET.fromstring(pom_bytes)
        packaging = "jar"
        props = {}
        deps = []
        for ch in root:
            t = strip_ns(ch.tag)
            if t == "packaging" and ch.text:
                packaging = ch.text.strip()
            elif t == "properties":
                for p in ch:
                    props[strip_ns(p.tag)] = (p.text or "").strip()
            elif t == "dependencies":
                for d in ch:
                    if strip_ns(d.tag) != "dependency":
                        continue
                    dg = da = dv = dscope = dopt = ""
                    for f in d:
                        ft = strip_ns(f.tag)
                        txt = (f.text or "").strip()
                        if ft == "groupId":
                            dg = txt
                        elif ft == "artifactId":
                            da = txt
                        elif ft == "version":
                            dv = txt
                        elif ft == "scope":
                            dscope = txt
                        elif ft == "optional":
                            dopt = txt
                    if dopt == "true" or dscope in ("test", "provided"):
                        continue
                    if dv.startswith("${") and dv.endswith("}"):
                        dv = props.get(dv[2:-1], dv)
                    if dg and da and dv:
                        deps.append((dg, da, parse_ver(dv)))
        visited[key] = (v, packaging, repo)
        for dep in deps:
            queue.append(dep)

    os.makedirs(OUT_DIR, exist_ok=True)
    jars_dir = os.path.join(OUT_DIR, "jars")
    res_dir = os.path.join(OUT_DIR, "res")
    manifests_dir = os.path.join(OUT_DIR, "manifests")
    for d in (jars_dir, res_dir, manifests_dir):
        if os.path.exists(d):
            shutil.rmtree(d)
        os.makedirs(d, exist_ok=True)

    total_bytes = 0
    for (g, a), (v, pkg, repo) in sorted(visited.items()):
        gp = g.replace(".", "/")
        ext = "aar" if pkg == "aar" else "jar"
        url = f"{repo}/{gp}/{a}/{v}/{a}-{v}.{ext}"
        data = fetch(url)
        total_bytes += len(data)
        safe = f"{g}_{a}_{v}"
        if ext == "jar":
            with open(os.path.join(jars_dir, f"{safe}.jar"), "wb") as f:
                f.write(data)
        else:
            aar_path = os.path.join(OUT_DIR, f"{safe}.aar")
            with open(aar_path, "wb") as f:
                f.write(data)
            with zipfile.ZipFile(aar_path, "r") as zf:
                if "classes.jar" in zf.namelist():
                    with open(os.path.join(jars_dir, f"{safe}.jar"), "wb") as jf:
                        jf.write(zf.read("classes.jar"))
                if "AndroidManifest.xml" in zf.namelist():
                    with open(os.path.join(manifests_dir, f"{safe}.xml"), "wb") as mf:
                        mf.write(zf.read("AndroidManifest.xml"))
                for name in zf.namelist():
                    if name.startswith("res/") and not name.endswith("/"):
                        rel = name[4:]
                        dest = os.path.join(res_dir, safe, rel)
                        os.makedirs(os.path.dirname(dest), exist_ok=True)
                        with open(dest, "wb") as rf:
                            rf.write(zf.read(name))
            os.remove(aar_path)
    print(f"Downloaded & extracted {len(visited)} artifacts ({total_bytes / 1024:.1f} KB) to {OUT_DIR}")


if __name__ == "__main__":
    main()
