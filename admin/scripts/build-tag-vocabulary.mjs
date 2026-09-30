import {
  AutoTokenizer,
  CLIPTextModelWithProjection,
  env,
} from "@huggingface/transformers";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

// Maintainer tool. The browser ships the small text vectors, and downloads only
// the vision model. No user photos or runtime credentials are used here.
const cache = process.argv[2];
if (!cache)
  throw new Error(
    "Usage: node scripts/build-tag-vocabulary.mjs <model-cache-directory>",
  );
env.cacheDir = resolve(cache);
const offline = process.argv.includes("--offline");
env.allowLocalModels = offline;
env.localModelPath = resolve(cache) + "/";
env.allowRemoteModels = !offline;
const vocabulary = JSON.parse(
  await readFile(
    new URL("../src/lib/tag-vocabulary.json", import.meta.url),
    "utf8",
  ),
);
const options = { revision: vocabulary.revision, dtype: "q8" };
const tokenizer = await AutoTokenizer.from_pretrained(
  vocabulary.model,
  options,
);
const model = await CLIPTextModelWithProjection.from_pretrained(
  vocabulary.model,
  options,
);
try {
  const vectors = new Float32Array(
    vocabulary.labels.length * vocabulary.dimensions,
  );
  // Bound the generation tool's memory; only the resulting vectors are shipped.
  for (let start = 0; start < vocabulary.labels.length; start += 8) {
    const labels = vocabulary.labels.slice(start, start + 8);
    const inputs = tokenizer(
      labels.map((item) => item[1]),
      { padding: true, truncation: true },
    );
    const output = await model(inputs);
    const rows = output.text_embeds.tolist();
    rows.forEach((row, index) => {
      const norm = Math.hypot(...row);
      if (
        row.length !== vocabulary.dimensions ||
        !Number.isFinite(norm) ||
        norm === 0
      )
        throw new Error("Invalid embedding");
      row.forEach(
        (value, column) =>
          (vectors[(start + index) * vocabulary.dimensions + column] =
            value / norm),
      );
    });
    Object.values(inputs).forEach((t) => t.dispose?.());
    Object.values(output).forEach((t) => t.dispose?.());
  }
  const bytes = Buffer.alloc(vectors.length * 4);
  vectors.forEach((value, i) => bytes.writeFloatLE(value, i * 4));
  const directory = new URL("../public/tag-model/", import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL("vocabulary-v1.bin", directory), bytes);
  await writeFile(
    new URL("vocabulary-v1.sha256", directory),
    createHash("sha256").update(bytes).digest("hex") + "\n",
  );
  console.log(
    `Generated ${vocabulary.labels.length} labels, ${bytes.length} bytes`,
  );
} finally {
  await model.dispose();
}
