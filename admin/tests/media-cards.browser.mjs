import assert from "node:assert/strict";
import path from "node:path";
import { expect } from "playwright/test";

export async function auditMediaCards({
  page,
  base,
  postId,
  output,
  noOverflow,
}) {
  const checks = [];
  const cardForPost = () =>
    page.locator(".post-card").filter({
      has: page.locator(`h3 a[href$="/posts/${postId}"]`),
    });
  const appearance = (card) =>
    card.evaluate((el) => {
      const image = el.querySelector("img"),
        title = el.querySelector("h3");
      const frame = el
        .querySelector("[data-media-frame]")
        .getBoundingClientRect();
      return {
        radius: getComputedStyle(el).borderRadius,
        titleSize: getComputedStyle(title).fontSize,
        titleColor: getComputedStyle(title).color,
        fit: getComputedStyle(image).objectFit,
        position: getComputedStyle(image).objectPosition,
        ratio: Number((frame.width / frame.height).toFixed(3)),
        source: image.getAttribute("src"),
      };
    });
  for (const mode of ["light", "dark"])
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(
        (value) => localStorage.setItem("moment.admin.color-mode", value),
        mode,
      );
      await page.goto(base + "/overview");
      let card = cardForPost();
      await expect(card).toBeVisible();
      await expect(card.locator("img")).toBeVisible();
      await expect(card.locator("[data-media-footer]")).toHaveCount(0);
      await expect(card.getByRole("button", { name: /^选择 / })).toHaveCount(0);
      const compact = await appearance(card);
      assert.equal(compact.fit, "cover");
      assert.ok(Math.abs(compact.ratio - 4 / 3) < 0.01);
      await noOverflow();
      const token = Date.now();
      const origin = await page.evaluate((value) => {
        window.__mediaToken = value;
        return performance.timeOrigin;
      }, token);
      await card.locator("h3 a").click();
      await page.waitForURL(`**/posts/${postId}`);
      assert.equal(await page.evaluate(() => window.__mediaToken), token);
      assert.equal(await page.evaluate(() => performance.timeOrigin), origin);

      await page.goto(base + "/posts");
      card = cardForPost();
      await expect(card).toBeVisible();
      await expect(card.locator("[data-media-footer]")).toBeVisible();
      assert.deepEqual(
        await appearance(card),
        compact,
        "compact and full use the same cover and typography",
      );
      const toggle = card.getByRole("button", { name: /^选择 / });
      await card.scrollIntoViewIfNeeded();
      await page
        .locator(".post-grid")
        .evaluate((el) =>
          Promise.all(
            el
              .getAnimations({ subtree: true })
              .map((animation) => animation.finished.catch(() => {})),
          ),
        );
      const initial = await card.boundingBox();
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      assert.equal(new URL(page.url()).pathname, "/admin/posts");
      const selected = await card.boundingBox();
      for (const key of ["y", "width", "height"])
        assert.ok(
          Math.abs(selected[key] - initial[key]) < 1,
          `${mode}/${width}: selection preserves ${key}: ${initial[key]} -> ${selected[key]}`,
        );
      await toggle.press("Space");
      await expect(toggle).toHaveAttribute("aria-pressed", "false");
      await noOverflow();
      if (mode === "light" && width === 1440)
        await card.screenshot({
          path: path.join(output, "shared-post-card.png"),
        });
      const beforeEdit = await page.evaluate(() => performance.timeOrigin);
      await card.getByRole("button", { name: /^编辑 / }).click();
      await page.waitForURL(`**/posts/${postId}`);
      assert.equal(
        await page.evaluate(() => performance.timeOrigin),
        beforeEdit,
      );
      checks.push({
        mode,
        width,
        sharedAppearance: true,
        informationLevels: true,
        selectionStable: true,
        clientNavigation: true,
      });
    }
  // Failed cover decoding must settle on a bounded placeholder instead of a retry loop.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route(/\/(?:uploads|thumbnails)\//, (route) =>
    route.fulfill({ contentType: "image/png", body: "invalid image" }),
  );
  await page.goto(base + "/posts");
  const card = cardForPost();
  await expect(card).toBeVisible();
  await expect(card.locator("img")).toHaveCount(0);
  assert.ok(
    (await card.locator("[data-media-frame]").boundingBox()).height > 100,
  );
  await page.unroute(/\/(?:uploads|thumbnails)\//);
  return { checks: checks.length, placeholder: true, overflows: 0 };
}
