"""Archive the public Edition assets and create a reproducible local document.

Published client bundles are kept intact except for public asset URL relocation.
This preserves the original Remix hydration, shaders and Theatre timelines.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit, unquote
from urllib.request import Request, urlopen
import hashlib
import html
import json
import re
import time

ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / "reference"
PUBLIC = ROOT / "public"
MANIFEST = REFERENCE / "asset-manifest.json"
SOURCE_URL = "https://www.shopify.com/editions/winter2026"
ASSET_HOSTS = {"cdn.shopify.com", "editions-winter-2026.myshopify.com", "www.gstatic.com", "cdn.jsdelivr.net", "unpkg.com"}
EXTENSIONS = {"js", "css", "json", "txt", "wasm", "glb", "gltf", "ktx2", "basis", "bin", "woff", "woff2", "ttf", "otf", "png", "jpg", "jpeg", "webp", "avif", "svg", "gif", "mp4", "webm", "riv", "mp3", "ogg"}
URL_PATTERN = re.compile(r'https?://[^\s\"\'<>\\`]+')
REL_PATTERN = re.compile(r'''["']((?:\./|\.\./|assets/)[^"'\s]+\.(?:js|css))["']''')


def canonical(url):
    # Keep one original-resolution copy per CDN path; resize parameters are not
    # needed on disk. Original query strings remain in the local request URL.
    parts = urlsplit(html.unescape(url).rstrip(");,"))
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def asset_url(url):
    try:
        p = urlsplit(url)
        return p.hostname in ASSET_HOSTS and p.path.rsplit(".", 1)[-1].lower() in EXTENSIONS
    except ValueError:
        return False


def local_url(url):
    p = urlsplit(url)
    return "/mirror/" + p.netloc + p.path


def find_assets(text, base):
    found = {canonical(m.group()) for m in URL_PATTERN.finditer(text) if asset_url(m.group())}
    if base.endswith((".js", ".css")):
        for relative in REL_PATTERN.findall(text):
            resolved = urljoin(base, relative[7:] if relative.startswith("assets/") else relative)
            if asset_url(resolved) and "/node_modules/" not in resolved:
                found.add(canonical(resolved))
    return found


def relocate(text):
    for host in ASSET_HOSTS:
        text = text.replace("https://" + host + "/", "/mirror/" + host + "/")
    # The original CDN lookup uses a one-argument URL constructor. Local asset
    # references are root-relative, so supply the browser origin explicitly.
    text = text.replace("new URL(n.url).pathname", "new URL(n.url,location.origin).pathname")
    # The Dux component only initializes Shopify production analytics; it emits
    # no SSR markup. Omit it in the local copy while retaining visual components.
    text = re.sub(r'r\.jsx\(W,\{service:"editions-winter-2026".*?disableLegacyTracking:!0\}\)', 'null', text)
    return text


def fetch(url):
    destination = PUBLIC / unquote(local_url(url)).lstrip("/")
    original = REFERENCE / "sources" / unquote(local_url(url)).removeprefix("/mirror/")
    is_text = urlsplit(url).path.endswith((".js", ".css", ".json", ".svg"))
    for attempt in range(3):
        try:
            if destination.exists() and (not is_text or original.exists()):
                data = original.read_bytes() if is_text else destination.read_bytes()
                mime = "cached"
            else:
                with urlopen(Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=45) as response:
                    data = response.read()
                    mime = response.headers.get("Content-Type", "")
            dependencies = set()
            destination.parent.mkdir(parents=True, exist_ok=True)
            if is_text:
                source = data.decode("utf-8")
                original.parent.mkdir(parents=True, exist_ok=True)
                original.write_bytes(data)
                dependencies = find_assets(source, url)
                destination.write_text(relocate(source))
            else:
                destination.write_bytes(data)
            return {"url": url, "local": local_url(url), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "contentType": mime}, dependencies
        except Exception as error:
            if attempt == 2:
                return {"url": url, "error": str(error)}, set()
            time.sleep(0.5 * (attempt + 1))


def prepare_document(source):
    result = relocate(source)
    # Do not insert new DOM nodes before hydration. CSP is an HTTP header, and
    # the local bootstrap runs in an existing script node.
    bootstrap = (PUBLIC / "local-runtime.js").read_text()
    result = re.sub(r'(<script[^>]*>)', lambda m: m.group(1) + bootstrap + "\n", result, count=1)
    (REFERENCE / "local.html").write_text(result)


def main():
    source = (REFERENCE / "original.html").read_text()
    pending = find_assets(source, SOURCE_URL)
    # Runtime-constructed decoder paths do not appear as complete file URLs.
    pending.update({
        "https://www.gstatic.com/draco/versioned/decoders/1.5.6/" + name
        for name in ("draco_decoder.js", "draco_wasm_wrapper.js", "draco_decoder.wasm")
    })
    pending.update({
        f"https://cdn.jsdelivr.net/npm/three@{version}/examples/jsm/libs/basis/{name}"
        for version in ("0.172.0", "0.169.0")
        for name in ("basis_transcoder.js", "basis_transcoder.wasm")
    })
    pending.update({"https://unpkg.com/@rive-app/webgl2@2.37.2/rive.wasm"})
    with urlopen("https://unpkg.com/detect-gpu@5.0.70/dist/benchmarks/?meta", timeout=30) as response:
        benchmark_files = json.load(response)["files"]
    pending.update("https://unpkg.com/detect-gpu@5.0.70" + f["path"] for f in benchmark_files if f["path"].endswith(".json"))
    seen = set()
    records = {}
    while pending:
        batch = sorted(pending - seen)
        pending = set()
        if not batch:
            break
        print(f"Fetching {len(batch)} assets ({len(seen)} already checked)...", flush=True)
        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = {pool.submit(fetch, url): url for url in batch}
            for future in as_completed(futures):
                record, dependencies = future.result()
                url = record["url"]
                seen.add(url)
                records[url] = record
                pending.update(dependencies - seen)
                if "error" in record:
                    print(f"FAILED {url}: {record['error']}", flush=True)
        MANIFEST.write_text(json.dumps({"source": SOURCE_URL, "assets": list(records.values())}, indent=2) + "\n")
    prepare_document(source)
    failed = [r for r in records.values() if "error" in r]
    total = sum(r.get("bytes", 0) for r in records.values())
    print(f"Saved {len(records) - len(failed)} assets, {total / 1024 / 1024:.1f} MiB; {len(failed)} failures.", flush=True)
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
