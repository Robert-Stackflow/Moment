import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "playwright/test";

export async function auditOrganize({ page, base, api, output, noOverflow }) {
  const results = [];
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const mode of ["light", "dark"])
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(
        (value) => localStorage.setItem("moment.admin.color-mode", value),
        mode,
      );
      await page.goto(base + "/organize/duplicates");
      await noOverflow();
      await expect(
        page.getByRole("heading", { name: "照片整理", exact: true }),
      ).toBeVisible();
      if (!(await api("/duplicates/scans/latest"))) {
        await expect(
          page.locator(".organize-panel [data-card-body]"),
        ).toHaveCount(0);
        await page
          .getByRole("button", { name: "开始扫描", exact: true })
          .click();
        await page
          .getByRole("dialog", { name: "扫描重复图片", exact: true })
          .getByRole("button", { name: "开始检测", exact: true })
          .click();
      }
      await expect(
        page.getByRole("group", { name: "重复分组状态", exact: true }),
      ).toBeVisible();
      const filter = page.getByRole("combobox", {
        name: "重复类型",
        exact: true,
      });
      const edges = await filter.evaluate((el) => ({
        control: el.getBoundingClientRect().right,
        container: el.closest(".organize-controls").getBoundingClientRect()
          .right,
      }));
      assert.ok(
        Math.abs(edges.control - edges.container) <= 1,
        "filter aligns to panel content edge",
      );
      const group = page.getByRole("group", {
        name: "照片整理方式",
        exact: true,
      });
      const node = await group.elementHandle();
      const token = `${mode}-${width}-${Date.now()}`;
      const origin = await page.evaluate((value) => {
        window.__organizeToken = value;
        window.__segmentTransitions = [];
        document
          .querySelector(".organize-navigation [data-segment-indicator]")
          .addEventListener("transitionrun", (e) =>
            window.__segmentTransitions.push(e.propertyName),
          );
        return performance.timeOrigin;
      }, token);
      if (mode === "light" && width === 1280)
        await page.screenshot({
          path: path.join(output, "organize-duplicates-light.png"),
        });
      await group
        .getByRole("button", { name: "智能标签", exact: true })
        .click();
      await page.waitForURL("**/organize/tags");
      await page
        .getByRole("textbox", { name: "搜索待整理照片", exact: true })
        .waitFor();
      const photo = page.locator(".tag-photo").first();
      if (await photo.count()) {
        const geometry = await photo.evaluate((el) => {
          const image = el
            .querySelector(".tag-photo-image")
            .getBoundingClientRect();
          const checkbox = el
            .querySelector(".tag-photo-select")
            .getBoundingClientRect();
          const title = el.querySelector("p").getBoundingClientRect();
          return {
            belowImage: checkbox.top >= image.bottom,
            besideTitle: checkbox.left >= title.right,
          };
        });
        assert.ok(
          geometry.belowImage && geometry.besideTitle,
          "photo selection must not overlap the image or title",
        );
      }
      assert.ok(
        await group.evaluate(
          (current, previous) => current === previous && previous.isConnected,
          node,
        ),
      );
      assert.equal(await page.evaluate(() => window.__organizeToken), token);
      assert.equal(await page.evaluate(() => performance.timeOrigin), origin);
      await page.waitForFunction(() =>
        window.__segmentTransitions.includes("transform"),
      );
      const selectAll = page.getByRole("checkbox", {
        name: "选择本页",
        exact: true,
      });
      if ((await selectAll.count()) && (await selectAll.isEnabled())) {
        await selectAll.check();
        await expect(
          page.getByRole("button", { name: "清空选择", exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "清空选择", exact: true })
          .click();
      }
      await expect(
        page.getByRole("button", { name: "清空选择", exact: true }),
      ).toHaveCount(0);
      await noOverflow();
      await page.getByRole("button", { name: "更多", exact: true }).click();
      await expect(
        page.getByRole("menuitem", { name: "清除识别模型缓存", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      if (mode === "dark" && width === 390)
        await page.screenshot({
          path: path.join(output, "organize-tags-dark-mobile.png"),
        });
      await group
        .getByRole("button", { name: "重复图片", exact: true })
        .click();
      await page.waitForURL("**/organize/duplicates");
      assert.ok(
        await group.evaluate(
          (current, previous) => current === previous && previous.isConnected,
          node,
        ),
      );
      await noOverflow();
      results.push({
        mode,
        width,
        persistentSegmented: true,
        documentReloads: 0,
        animated: true,
        sharedPanel: true,
      });
      await node.dispose();
    }
  await writeFile(
    path.join(output, "organize-layout.json"),
    JSON.stringify(results, null, 2),
  );
  return { checks: results.length, documentReloads: 0, animated: true };
}
