import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Optional same-origin deployment. Keep weights out of Git and verify every file
// against this fixed model revision, including when copying an offline download.
const revision = "d15189d7028b43f1d3e65039190477f6af591c2a";
const model = "Xenova/clip-vit-base-patch32";
const files = {
  "config.json":
    "493ef57ff783e42d1530c91b53469b7fdf8db8a9c1408e86998fcb7899a4f495",
  "preprocessor_config.json":
    "6f638fb9401a6d6296feff533ee7efe657b787c49f954f82f5906b36ef2a1b1f",
  "onnx/vision_model_quantized.onnx":
    "583fd1110a514667812fee7d684952aaf82a99b959760c8d7dca7e0ab9839299",
};
const args = process.argv.slice(2);
const fromIndex = args.indexOf("--from");
const from = fromIndex >= 0 ? args[fromIndex + 1] : null;
if (fromIndex >= 0 && !from)
  throw new Error("--from requires a model directory");
const output = resolve(
  args[0] && args[0] !== "--from"
    ? args[0]
    : fileURLToPath(new URL("../public/tag-model/local/", import.meta.url)),
);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
await mkdir(output, { recursive: true });
// Publish the manifest last, so interrupted installs are not advertised as ready.
await rm(resolve(output, "manifest.json"), { force: true });
for (const [file, expected] of Object.entries(files)) {
  const path = resolve(output, file);
  const existing = await readFile(path).catch(() => null);
  if (existing && hash(existing) === expected) {
    console.log(`Verified ${file}`);
    continue;
  }
  let bytes;
  if (from) bytes = await readFile(resolve(from, file));
  else {
    console.log(`Downloading ${file}`);
    const response = await fetch(
      `https://huggingface.co/${model}/resolve/${revision}/${file}`,
      { signal: AbortSignal.timeout(300_000) },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${file}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (hash(bytes) !== expected) throw new Error(`Checksum mismatch: ${file}`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path + ".part", bytes);
  await rename(path + ".part", path);
  console.log(`Installed ${file}`);
}
await writeFile(
  resolve(output, "manifest.json"),
  JSON.stringify({ model, revision, files }, null, 2) + "\n",
);
console.log(`Model ready in ${output}`);
