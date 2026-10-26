"""Verify the local archive and the actual GLB/Theatre payloads."""
from pathlib import Path
from urllib.parse import unquote
from collections import Counter
import hashlib
import json
import struct

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "reference/asset-manifest.json").read_text())
native_manifest = json.loads((ROOT / "reference/native-asset-manifest.json").read_text())
manifest["assets"].extend(native_manifest["assets"])
errors = []
counts = Counter()
timeline_count = 0
for item in manifest["assets"]:
    if "error" in item:
        errors.append(item["url"] + ": " + item["error"])
        continue
    target = ROOT / "public" / unquote(item["local"]).lstrip("/")
    if not target.is_file():
        errors.append("Missing " + str(target))
        continue
    data = target.read_bytes()
    counts[target.suffix] += 1
    source = ROOT / "reference/sources" / unquote(item["local"]).removeprefix("/mirror/")
    original = source.read_bytes() if source.is_file() else data
    if hashlib.sha256(original).hexdigest() != item["sha256"]:
        errors.append("Checksum mismatch: " + item["local"])
    if target.suffix == ".glb":
        magic, version, length = struct.unpack_from("<4sII", data)
        if magic != b"glTF" or version != 2 or length != len(data):
            errors.append("Invalid GLB: " + item["local"])
    if "theatre" in target.name and target.suffix == ".json":
        state = json.loads(data)
        if not state.get("sheetsById"):
            errors.append("Missing Theatre scene: " + target.name)
        timeline_count += 1
report = {
    "passed": not errors,
    "assets": sum(counts.values()),
    "bytes": sum(item.get("bytes", 0) for item in manifest["assets"]),
    "byExtension": dict(sorted(counts.items())),
    "theatreTimelines": timeline_count,
    "errors": errors,
}
(ROOT / "reference/asset-verification.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
raise SystemExit(0 if not errors else 1)
