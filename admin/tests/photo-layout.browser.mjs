import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "playwright/test";

export async function auditPhotoLayout({
  page,
  base,
  postId,
  output,
  noOverflow,
}) {
  const checks = [];
  for (const mode of ["light", "dark"])
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(
        (value) => localStorage.setItem("moment.admin.color-mode", value),
        mode,
      );
      await page.goto(base + `/posts/${postId}`);
      const cover = page.locator(".editor-cover-thumb");
      await expect(cover).toBeVisible();
      const editor = await page.evaluate(() => {
        const title = getComputedStyle(
          document.querySelector(".editor-title-input"),
        );
        const location = getComputedStyle(
          document.querySelector(".editor-meta-fields input"),
        );
        const fields = [
          ...document.querySelector(".editor-meta-fields").children,
        ].map((el) => el.getBoundingClientRect());
        return {
          titleSize: title.fontSize,
          fieldSize: location.fontSize,
          titleWeight: Number(title.fontWeight),
          gaps: fields.slice(1).map((r, i) => r.top - fields[i].bottom),
        };
      });
      assert.equal(
        editor.titleSize,
        editor.fieldSize,
        "title uses standard input typography",
      );
      assert.ok(editor.titleWeight < 600);
      assert.ok(
        editor.gaps.every((gap) => gap >= 14 && gap <= 18),
        "publishing fields use compact consistent spacing",
      );
      const imageBounds = await cover.evaluate((el) => {
        const image = el.getBoundingClientRect(),
          card = el.closest("section").getBoundingClientRect();
        return {
          width: image.width,
          height: image.height,
          right: image.right,
          cardRight: card.right,
          fit: getComputedStyle(el).objectFit,
        };
      });
      assert.equal(imageBounds.width, 76);
      assert.equal(imageBounds.height, 76);
      assert.ok(imageBounds.right < imageBounds.cardRight);
      assert.equal(imageBounds.fit, "cover");
      await noOverflow();
      const trigger = page.getByRole("button", {
        name: "图片操作 1",
        exact: true,
      });
      assert.ok((await trigger.boundingBox()).width <= 40);
      await trigger.click();
      const sheet = page.getByRole("dialog", { name: "图片操作", exact: true });
      await expect(sheet).toBeVisible();
      await sheet
        .getByRole("button", { name: "编辑图片信息", exact: true })
        .click();
      const details = page.getByRole("dialog", {
        name: "编辑图片信息",
        exact: true,
      });
      await expect(details).toBeVisible();
      assert.equal(await page.locator("dialog[open]").count(), 1);
      await page.keyboard.press("Escape");
      await expect(details).toHaveCount(0);
      await expect(trigger).toBeFocused();
      const upload = await page.locator(".upload-zone").evaluate((el) => {
        const copy = el
          .querySelector(".upload-zone-copy")
          .getBoundingClientRect();
        const button = el.querySelector("button").getBoundingClientRect();
        return {
          sameRow:
            Math.abs(
              (copy.top + copy.bottom - button.top - button.bottom) / 2,
            ) <= 1,
          below: button.top >= copy.bottom + 10,
        };
      });
      assert.ok(width > 600 ? upload.sameRow : upload.below);
      if (mode === "light" && width === 1440) {
        await cover.scrollIntoViewIfNeeded();
        const main = await page.locator("main").first().boundingBox();
        await page.screenshot({
          path: path.join(output, "photo-editor-layout.png"),
          scale: "css",
          clip: {
            x: main.x,
            y: 0,
            width: Math.min(1280, width - main.x),
            height: 900,
          },
        });
      }
      await page.goto(base + "/settings/meta");
      const description = page.getByRole("textbox", {
        name: "网站描述",
        exact: true,
      });
      await expect(description).toBeVisible();
      const label = await description.evaluate((el) => {
        const a = el.getBoundingClientRect(),
          b = el
            .closest("[data-layout]")
            .querySelector("label")
            .getBoundingClientRect();
        return { offset: b.top - a.top, above: b.bottom <= a.top };
      });
      assert.ok(
        width > 700 ? label.offset >= 0 && label.offset < 18 : label.above,
      );
      await noOverflow();
      await page.goto(base + "/organize/tags");
      await page
        .getByRole("textbox", { name: "搜索待整理照片", exact: true })
        .waitFor();
      const onlyUntagged = page.getByRole("checkbox", {
        name: "只看未设置标签",
        exact: true,
      });
      if (await onlyUntagged.isChecked()) await onlyUntagged.uncheck();
      const image = page.locator(".tag-photo-image img").first();
      await expect(image).toBeVisible();
      await image.evaluate((el) => el.decode());
      const photo = await image.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return {
          fit: getComputedStyle(el).objectFit,
          ratio: rect.width / rect.height,
          naturalRatio: el.naturalWidth / el.naturalHeight,
        };
      });
      assert.equal(photo.fit, "cover");
      assert.ok(Math.abs(photo.ratio - 4 / 3) < 0.01);
      assert.ok(
        Math.abs(photo.ratio - photo.naturalRatio) > 0.1,
        "fixture needs a different aspect ratio to expose stretching",
      );
      await noOverflow();
      const selectionGeometry = () =>
        page.evaluate(() => {
          const panel = document
            .querySelector(".tag-controls-panel")
            .getBoundingClientRect();
          const bar = document
            .querySelector(".organize-resultbar")
            .getBoundingClientRect();
          const card = document
            .querySelector(".tag-photo")
            .getBoundingClientRect();
          return {
            panelHeight: panel.height,
            barHeight: bar.height,
            cardTop: card.top,
            cardHeight: card.height,
            cardWidth: card.width,
          };
        });
      const initial = await selectionGeometry();
      const stable = async () => {
        const current = await selectionGeometry();
        for (const key of Object.keys(initial))
          assert.ok(
            Math.abs(current[key] - initial[key]) < 1,
            `selection must not move ${key}`,
          );
      };
      const toggle = page.getByRole("button", { name: /^选择照片 / }).first();
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      await stable();
      await toggle.press("Space");
      await expect(toggle).toHaveAttribute("aria-pressed", "false");
      await stable();
      await page
        .getByRole("checkbox", { name: "选择本页", exact: true })
        .check();
      await stable();
      if (mode === "light" && width === 1440) {
        await page.locator(".tag-controls-panel").scrollIntoViewIfNeeded();
        const panel = await page.locator(".tag-controls-panel").boundingBox();
        const left = panel.x;
        await page.screenshot({
          path: path.join(output, "tag-selection-layout.png"),
          clip: {
            x: left,
            y: Math.max(0, panel.y),
            width: Math.min(1280, width - left),
            height: Math.min(700, 900 - Math.max(0, panel.y)),
          },
        });
      }
      await page.getByRole("button", { name: "清空选择", exact: true }).click();
      await expect(toggle).toHaveAttribute("aria-pressed", "false");
      await stable();
      if (mode === "light" && width === 1440)
        await page
          .locator(".tag-photo")
          .first()
          .screenshot({ path: path.join(output, "tag-photo-crop.png") });
      checks.push({
        mode,
        width,
        coverBounded: true,
        photoCrop: true,
        textareaLabelAligned: true,
        sheetToEditor: true,
        stableSelectionGeometry: true,
        standardTitleTypography: true,
        compactPublishingFields: true,
        uploadAligned: true,
      });
    }
  await writeFile(
    path.join(output, "photo-layout.json"),
    JSON.stringify(checks, null, 2),
  );
  return { checks: checks.length, overflows: 0 };
}
