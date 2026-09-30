import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

test("shipped tag vectors match the pinned vocabulary and remain finite normalized rows", async () => {
  const vocabulary = JSON.parse(
    await readFile(new URL("../src/lib/tag-vocabulary.json", import.meta.url)),
  );
  const vectorData = JSON.parse(
    await readFile(
      new URL("../public/tag-model/vocabulary-v1.json", import.meta.url),
    ),
  );
  const checksum = (
    await readFile(
      new URL("../public/tag-model/vocabulary-v1.sha256", import.meta.url),
      "utf8",
    )
  ).trim();
  const bytes = Buffer.from(vectorData.data, "base64");
  assert.equal(vectorData.version, vocabulary.version);
  assert.equal(vectorData.dimensions, vocabulary.dimensions);
  assert.equal(
    bytes.length,
    vocabulary.labels.length * vocabulary.dimensions * 4,
  );
  assert.equal(createHash("sha256").update(bytes).digest("hex"), checksum);
  assert.match(vocabulary.revision, /^[a-f0-9]{40}$/);
  assert.equal(
    new Set(vocabulary.labels.map(([label]) => label)).size,
    vocabulary.labels.length,
  );
  for (let row = 0; row < vocabulary.labels.length; row++) {
    let square = 0;
    for (let column = 0; column < vocabulary.dimensions; column++) {
      const value = bytes.readFloatLE(
        (row * vocabulary.dimensions + column) * 4,
      );
      assert(Number.isFinite(value));
      square += value * value;
    }
    assert(Math.abs(square - 1) < 1e-5, `Vector ${row} is not normalized`);
  }
});
