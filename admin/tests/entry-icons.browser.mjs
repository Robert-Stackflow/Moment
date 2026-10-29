import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "playwright/test";

export async function auditEntryIcons({ page, base, api, output, noOverflow }) {
  const original = (await api("/settings")).meta;
  const origin = new URL(base).origin;
  const catalog = JSON.parse(
    await readFile(
      new URL(
        "../node_modules/@robert-stackflow/oneui/assets/icon-catalog.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const chosen = "a-arrow-down";
  assert.ok(catalog.some((item) => item.name === chosen));
  const results = [];
  const saveMeta = async (data) => {
    const response = await page.request.patch(
      origin + "/api/admin/settings/meta",
      {
        headers: { Origin: origin },
        data,
      },
    );
    assert.equal(response.status(), 200, await response.text());
  };
  try {
    for (const mode of ["light", "dark"])
      for (const width of [1280, 390]) {
        await saveMeta({
          ...original,
          entries: [
            { name: "图标检查", icon: "ti:blog", url: "https://example.test" },
          ],
        });
        await page.setViewportSize({ width, height: 844 });
        await page.evaluate(
          (value) => localStorage.setItem("moment.admin.color-mode", value),
          mode,
        );
        await page.goto(base + "/settings/meta");
        await noOverflow();
        const trigger = page.getByRole("combobox", {
          name: "入口图标 图标检查",
          exact: true,
        });
        await expect(trigger).toContainText("book-open");
        assert.equal((await api("/settings")).meta.entries[0].icon, "ti:blog");
        await trigger.click();
        const picker = page.getByRole("dialog", {
          name: "入口图标 图标检查选择器",
          exact: true,
        });
        await expect(
          picker.getByText(catalog.length + " 个图标", { exact: true }),
        ).toBeVisible();
        assert.ok(catalog.length > 60);
        const geometry = await picker.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return {
            left: r.left,
            right: r.right,
            width: innerWidth,
            overflow: el.scrollWidth - el.clientWidth,
          };
        });
        assert.ok(
          geometry.left >= 0 &&
            geometry.right <= geometry.width + 1 &&
            geometry.overflow <= 1,
        );
        await picker.getByLabel("搜索图标", { exact: true }).fill(chosen);
        await picker
          .getByRole("button", { name: chosen, exact: true })
          .first()
          .click();
        await expect(trigger).toContainText(chosen);
        await expect(trigger).toBeFocused();
        const saving = page.waitForResponse(
          (response) =>
            response.url().endsWith("/api/admin/settings/meta") &&
            response.request().method() === "PATCH",
        );
        await page
          .getByRole("button", { name: "保存设置", exact: true })
          .click();
        assert.equal((await saving).status(), 200);
        assert.equal(
          (await api("/settings")).meta.entries[0].icon,
          "lucide:" + chosen,
        );
        await page.reload();
        await expect(trigger).toContainText(chosen);
        await trigger.click();
        await expect(
          picker.getByText(catalog.length + " 个图标", { exact: true }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(trigger).toBeFocused();
        results.push({
          mode,
          width,
          count: catalog.length,
          selected: "lucide:" + chosen,
          savedAndReloaded: true,
        });
      }
  } finally {
    await saveMeta(original);
    await writeFile(
      path.join(output, "entry-icons.json"),
      JSON.stringify(results, null, 2),
    );
  }
  return {
    checks: results.length,
    count: catalog.length,
    legacyValuePreserved: true,
  };
}
