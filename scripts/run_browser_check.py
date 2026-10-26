"""Run a saved check through the user-required Playwright CLI wrapper."""
from pathlib import Path
import os
import json
import re
import subprocess
import sys
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
script = ROOT / "scripts" / (sys.argv[1] if len(sys.argv) > 1 else "qa-desktop.js")
environment = dict(os.environ)
session = os.environ.get("PLAYWRIGHT_SESSION", "refop")
result = subprocess.run([
    str(Path.home() / ".codex/skills/playwright/scripts/playwright_cli.sh"),
    "--session", session, "run-code", script.read_text().strip().removesuffix(";"),
], cwd=ROOT, env=environment, text=True, capture_output=True)
match = re.search(r"### Result\n([^\n]+)", result.stdout)
if match:
    data = json.loads(match.group(1))
    # Retain diagnostic paths, not third-party analytics query strings.
    for failure in data.get("failures", []):
        url = urlsplit(failure["url"])
        failure["url"] = urlunsplit((url.scheme, url.netloc, url.path, "", ""))
    data["externalHosts"] = sorted({urlsplit(url).netloc for url in data.pop("externalRequests", [])})
    report = ROOT / "output/playwright" / (script.stem + ".json")
    report.write_text(json.dumps(data, indent=2) + "\n")
    print(json.dumps(data, indent=2))
else:
    print(result.stdout[:4000])
if result.stderr:
    print(result.stderr[:2000], file=sys.stderr)
raise SystemExit(result.returncode or (1 if not match else 0))
