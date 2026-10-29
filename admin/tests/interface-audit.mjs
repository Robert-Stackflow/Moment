import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "playwright/test";

export async function auditInterface({
  page,
  context,
  base,
  api,
  postId,
  output,
  noOverflow,
}) {
  const origin = new URL(base).origin,
    results = [],
    pages = [];
  const mutate = async (url, method, data) => {
    const response = await page.request.fetch(origin + "/api/admin" + url, {
      method,
      headers: { Origin: origin },
      data,
    });
    assert.equal(
      response.status(),
      200,
      `${method} ${url}: ${await response.text()}`,
    );
    return (await response.json()).data;
  };
  const post = await api(`/posts/${postId}`);
  const payload = {
    title: "逐页检查样本",
    desc: "弹窗与移动布局检查",
    location: "",
    time: "2026-10-29T12:00:00",
    is_hidden: false,
    category_ids: [],
    images: post.images.map(({ id, ...image }) => image),
    discovery: {
      latitude: null,
      longitude: null,
      precision: "private",
      timeline: "show",
    },
  };
  const recycledId = await mutate("/posts", "POST", payload);
  const recycled = await api(`/posts/${recycledId.id}`);
  await mutate("/posts/batch", "POST", {
    action: "delete",
    targets: [{ id: recycled.id, revision: recycled.revision }],
  });
  const draftId = crypto.randomUUID();
  const draft = await mutate(`/drafts/${draftId}`, "PUT", {
    id: draftId,
    post_id: null,
    base_revision: 0,
    revision: 0,
    mutation_id: crypto.randomUUID(),
    payload: { ...payload, title: "检查发布计划" },
  });
  await mutate(`/drafts/${draftId}/schedule`, "PUT", {
    revision: 0,
    draft_revision: draft.revision,
    publish_at: Math.floor(Date.now() / 1000) + 86400,
  });
  const photos = await api("/photo-tags/photos?untagged=false&page_size=20");
  const photo = photos[0];
  await mutate("/photo-tags/apply", "POST", {
    id: crypto.randomUUID().replaceAll("-", ""),
    confirm: true,
    targets: [
      {
        id: photo.id,
        revision: photo.revision,
        image_url: photo.image_url,
        tags: ["逐页检查"],
      },
    ],
  });
  // Exercise real multi-page history, rather than only its single-record state.
  for (let i = 0; i < 10; i++) {
    const current = (
      await api("/photo-tags/photos?untagged=false&page_size=20")
    )[0];
    await mutate("/photo-tags/apply", "POST", {
      id: crypto.randomUUID().replaceAll("-", ""),
      confirm: true,
      targets: [
        {
          id: current.id,
          revision: current.revision,
          image_url: current.image_url,
          tags: [`分页检查${i}`],
        },
      ],
    });
  }
  await mutate("/backups", "POST", {});
  const share = (await api("/shares"))[0];
  const routes = [
    "workbench",
    "posts",
    "posts/new",
    `posts/${postId}`,
    "drafts",
    `drafts/${draftId}`,
    "schedules",
    "organize/duplicates",
    "organize/tags",
    "trash",
    "shares",
    "shares/new",
    `shares/${share.id}`,
    "categories",
    "settings/meta",
    "settings/content",
    "settings/storage",
    "settings/general",
    "settings/backups",
    "account",
    "account/security",
    "account/password",
    "account/sessions",
  ];
  let mode, width, currentCase;
  const visit = async (route) => {
    await page.goto(base + "/" + route);
    await noOverflow();
  };
  const inspect = async (title) => {
    currentCase = String(title);
    const dialog = page.getByRole("dialog", {
      name: title,
      exact: typeof title === "string",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("data-motion-phase", "visible");
    const geometry = await dialog.evaluate((el) => {
      const rect = el.getBoundingClientRect(),
        footer = el.querySelector(":scope > footer");
      const buttons = footer
        ? [...footer.children].filter(
            (b) => b.getBoundingClientRect().width > 0,
          )
        : [];
      const forms = [...el.querySelectorAll("button[form]")].every(
        (b) =>
          document.getElementById(b.getAttribute("form"))?.tagName === "FORM",
      );
      return {
        overflow: el.scrollWidth - el.clientWidth,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        height: innerHeight,
        width: innerWidth,
        forms,
        footer: !!footer,
        gap: footer ? getComputedStyle(footer).gap : null,
        buttons: buttons.map((b) => {
          const r = b.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        }),
      };
    });
    assert.ok(
      geometry.overflow <= 1,
      `${currentCase}: horizontal overflow ${geometry.overflow}`,
    );
    assert.ok(
      geometry.left >= 0 && geometry.right <= geometry.width + 1,
      `${currentCase}: outside viewport ${JSON.stringify(geometry)}`,
    );
    assert.ok(
      geometry.top >= 0 && geometry.bottom <= geometry.height + 1,
      `${currentCase}: outside vertical viewport ${JSON.stringify(geometry)}`,
    );
    assert.ok(
      geometry.forms,
      `${currentCase}: submit lost its form association`,
    );
    if (geometry.footer) assert.equal(geometry.gap, "8px");
    for (let i = 1; i < geometry.buttons.length; i++) {
      const a = geometry.buttons[i - 1],
        b = geometry.buttons[i];
      assert.ok(
        b.top >= a.bottom - 1 || b.left >= a.right + 7,
        `${currentCase}: actions overlap or have no gap`,
      );
    }
    results.push({ mode, width, title: currentCase, footer: geometry.footer });
    return dialog;
  };
  const dismiss = async (dialog) => {
    const handle = await dialog.elementHandle();
    await page.keyboard.press("Escape");
    await page.waitForFunction((el) => !el.isConnected || !el.open, handle);
    await handle.dispose();
  };
  const open = async (button, title, returnTo = button) => {
    await button.click();
    const dialog = await inspect(title);
    await dismiss(dialog);
    await expect(returnTo).toBeFocused();
  };
  try {
    for (mode of ["light", "dark"])
      for (width of [1280, 390, 320]) {
        await page.setViewportSize({
          width,
          height: width < 768 ? 844 : 900,
        });
        await page.evaluate(
          (mode) => localStorage.setItem("moment.admin.color-mode", mode),
          mode,
        );
        for (const route of routes) {
          await visit(route);
          assert.equal(
            await page.locator("html").getAttribute("data-theme"),
            mode,
          );
          pages.push({ mode, width, route });
        }
        await page.goto(base + "/missing-audit-page");
        await expect(
          page.getByRole("heading", { name: "找不到这个页面" }),
        ).toBeVisible();
        await expect(
          page.getByRole("link", { name: "返回工作台" }),
        ).toBeVisible();

        await visit("categories");
        await page
          .getByRole("button", { name: "新建分类", exact: true })
          .click();
        let dialog = await inspect("新建分类");
        if (mode === "light" && width === 1280)
          await dialog.screenshot({
            path: path.join(output, "audit-category-light.png"),
          });
        await dialog
          .getByRole("button", { name: "保存分类", exact: true })
          .click();
        await expect(
          dialog.getByRole("textbox", { name: "分类名称", exact: true }),
        ).toHaveAttribute("aria-invalid", "true");
        await dismiss(dialog);
        await open(
          page.getByRole("button", { name: /^编辑 / }).first(),
          "编辑分类",
        );
        await open(
          page.getByRole("button", { name: /^删除 / }).first(),
          "删除分类",
        );

        await visit("posts");
        await page
          .getByRole("checkbox", { name: "选择 OneUI 迁移验证", exact: true })
          .check();
        await open(
          page.getByRole("button", { name: "分类", exact: true }),
          "批量分类 · 1 篇帖子",
        );
        await open(
          page.getByRole("button", { name: "删除", exact: true }),
          "移入回收站",
        );
        await visit("posts/new");
        await open(
          page.getByRole("button", { name: "图片地址", exact: true }),
          "通过地址添加照片",
        );
        await page
          .getByRole("button", { name: "地图与时间线", exact: true })
          .click();
        await page
          .getByRole("button", { name: "在地图上选点", exact: true })
          .click();
        dialog = await inspect("选择拍摄位置");
        await expect(
          dialog.getByRole("button", { name: "放大地图", exact: true }),
        ).toBeVisible();
        const map = dialog.locator(".location-map-picker");
        await map.click({ position: { x: 110, y: 110 } });
        await expect(
          dialog.getByRole("button", { name: "使用此位置" }),
        ).toBeEnabled();
        await dialog
          .getByRole("button", { name: "放大地图", exact: true })
          .click();
        await dismiss(dialog);
        await visit(`posts/${postId}`);
        await open(
          page.getByRole("button", { name: "预览", exact: true }),
          "相册内容预览",
        );
        await page
          .getByRole("button", { name: "编辑图片 1", exact: true })
          .first()
          .click();
        dialog = await inspect("编辑图片信息");
        await dismiss(dialog);

        await visit("drafts");
        await open(
          page.locator('button[aria-label^="删除草稿 "]:enabled').first(),
          "删除这份草稿？",
        );
        await visit("schedules");
        await open(
          page.getByRole("button", { name: "修改时间", exact: true }).first(),
          "安排发布时间",
        );
        await open(
          page.getByRole("button", { name: "取消计划", exact: true }).first(),
          "取消发布计划？",
        );
        await visit("trash");
        await open(
          page.getByRole("button", { name: /^永久删除 / }).first(),
          /^永久删除 .*篇帖子？$/,
        );
        await page.locator(".trash-preview-target").first().click();
        dialog = await inspect("已删除的帖子");
        await dismiss(dialog);

        await visit("shares");
        for (const label of ["停用分享", "更换链接", "删除相册"]) {
          await page
            .getByRole("button", { name: "分享操作", exact: true })
            .first()
            .click();
          await open(
            page.getByRole("menuitem", { name: label, exact: true }),
            (label === "停用分享" ? "撤销分享" : label) + "？",
            page.getByRole("button", { name: "分享操作", exact: true }).first(),
          );
        }
        await page.evaluate(() =>
          Object.defineProperty(navigator.clipboard, "writeText", {
            configurable: true,
            value: async () => {
              throw new Error("clipboard unavailable in audit");
            },
          }),
        );
        await open(
          page.getByRole("button", { name: "复制链接", exact: true }).first(),
          "复制分享链接",
        );

        await visit(`shares/${share.id}`);
        await page
          .getByRole("textbox", { name: "相册名称", exact: true })
          .fill("未保存的相册");
        await page.keyboard.press("F5");
        dialog = await inspect("刷新当前页面？");
        await dismiss(dialog);
        await page.route(
          `**/api/admin/shares/${share.id}`,
          (route) =>
            route.request().method() === "PUT"
              ? route.fulfill({
                  status: 409,
                  contentType: "application/json",
                  body: JSON.stringify({
                    code: 409,
                    data: null,
                    msg: "检查并发修改",
                  }),
                })
              : route.continue(),
          { times: 1 },
        );
        await page
          .getByRole("button", { name: "保存相册", exact: true })
          .click();
        await open(
          page.getByRole("button", { name: "加载最新相册", exact: true }),
          "加载最新相册？",
        );
        if (width < 768)
          await page
            .getByRole("button", { name: "打开导航", exact: true })
            .click();
        await page.getByRole("link", { name: "工作台", exact: true }).click();
        dialog = await inspect("离开当前页面？");
        await dialog
          .getByRole("button", { name: "离开页面", exact: true })
          .click();
        await page.waitForURL("**/workbench");
        await visit("account/security");
        await open(
          page.getByRole("button", { name: "添加通行密钥", exact: true }),
          "添加通行密钥",
        );
        await open(
          page.getByRole("button", { name: /^重命名通行密钥 / }).first(),
          "重命名通行密钥",
        );
        await open(
          page.getByRole("button", { name: /^移除通行密钥 / }).first(),
          "移除通行密钥？",
        );
        await page
          .getByRole("button", { name: /^重命名通行密钥 / })
          .first()
          .click();
        dialog = await inspect("重命名通行密钥");
        await dialog
          .getByRole("textbox", { name: "密钥名称", exact: true })
          .fill("并发修改检查");
        await page.route(
          "**/api/admin/me/passkeys/*",
          (route) =>
            route.fulfill({
              status: 409,
              contentType: "application/json",
              body: JSON.stringify({
                code: 409,
                data: null,
                msg: "检查并发修改",
              }),
            }),
          { times: 1 },
        );
        await dialog.getByRole("button", { name: "保存", exact: true }).click();
        await dialog
          .getByRole("button", { name: "重新加载", exact: true })
          .click();
        let conflict = await inspect("放弃当前修改并重新加载？");
        await dismiss(conflict);
        await dismiss(dialog);
        await visit("account/sessions");
        await open(
          page.getByRole("button", { name: "退出当前会话", exact: true }),
          "退出当前会话？",
        );
        await visit("settings/backups");
        await open(
          page.getByRole("button", { name: "恢复", exact: true }).first(),
          "恢复整站备份",
        );
        await open(
          page.getByRole("button", { name: /^删除备份 / }).first(),
          "删除备份文件？",
        );

        await visit("organize/duplicates");
        await page
          .getByRole("button", { name: "处理记录", exact: true })
          .click();
        dialog = await inspect("处理记录");
        const pagination = dialog.getByRole("navigation", { name: "分页" });
        await expect(pagination).toBeVisible();
        const historyResponse = await page.request.get(
          origin + "/api/admin/photo-actions?page=1&page_size=10",
        );
        const historyTotal = (await historyResponse.json()).total;
        assert.ok(Number.isFinite(historyTotal) && historyTotal > 10);
        await expect(pagination).toContainText(`1–10 / ${historyTotal} 项`);
        if (mode === "light" && width === 320)
          await dialog.screenshot({
            path: path.join(output, "audit-history-light-narrow.png"),
          });
        await pagination
          .getByRole("button", { name: "下一页", exact: true })
          .click();
        await expect(
          pagination.getByRole("button", { name: "第 2 页", exact: true }),
        ).toHaveAttribute("aria-current", "page");
        await expect(pagination).toContainText(
          `11–${historyTotal} / ${historyTotal} 项`,
        );
        await inspect("处理记录");
        await pagination
          .getByRole("button", { name: "上一页", exact: true })
          .click();
        await dialog
          .getByRole("button", { name: "撤销", exact: true })
          .first()
          .click();
        let undo = await inspect("撤销这次标签整理？");
        await dismiss(undo);
        await dismiss(dialog);
        await page.getByRole("button", { name: "更多", exact: true }).click();
        await open(
          page.getByRole("menuitem", {
            name: "读取说明与未完成图片",
            exact: true,
          }),
          "读取说明",
          page.getByRole("button", { name: "更多", exact: true }),
        );
        await open(
          page.getByRole("button", {
            name: /^(重新扫描|开始扫描)$/,
            exact: true,
          }),
          "扫描重复图片",
        );
        let releaseStep, stepStarted, scanId;
        const gate = new Promise((resolve) => (releaseStep = resolve)),
          started = new Promise((resolve) => (stepStarted = resolve));
        await page.route(
          "**/api/admin/duplicates/scans/*/step",
          async (route) => {
            scanId = new URL(route.request().url()).pathname.split("/").at(-2);
            stepStarted();
            await gate;
            await route.continue();
          },
          { times: 1 },
        );
        await page
          .getByRole("button", { name: /^(重新扫描|开始扫描)$/, exact: true })
          .click();
        await page
          .getByRole("dialog", { name: "扫描重复图片", exact: true })
          .getByRole("button", { name: "开始检测", exact: true })
          .click();
        await started;
        await open(
          page.getByRole("button", { name: "取消扫描", exact: true }),
          "取消这次扫描？",
        );
        releaseStep();
        await expect
          .poll(async () => (await api(`/duplicates/scans/${scanId}`)).status)
          .toBe("ready");
        await page
          .getByRole("button", { name: /^比较分组 / })
          .first()
          .click();
        dialog = await inspect(/张$/);
        await dialog
          .getByRole("button", { name: /^查看原图 / })
          .first()
          .click();
        let nested = await inspect(/^原图 ·/);
        await dismiss(nested);
        await dialog
          .getByRole("checkbox", { name: /^选择图片 / })
          .first()
          .check();
        await dialog
          .getByRole("button", { name: "隐藏所选", exact: true })
          .click();
        nested = await inspect(/^隐藏这 .*张照片？$/);
        await dismiss(nested);
        await dialog
          .getByRole("button", { name: "关闭弹窗", exact: true })
          .click();
        nested = await inspect("清空选择并关闭？");
        await nested
          .getByRole("button", { name: "清空并关闭", exact: true })
          .click();
        await page.locator("dialog[open]").waitFor({ state: "hidden" });

        await visit("organize/tags");
        const untagged = page.getByRole("checkbox", {
          name: "只看未设置标签",
          exact: true,
        });
        if (await untagged.isChecked()) await untagged.uncheck();
        await page.getByRole("button", { name: "更多", exact: true }).click();
        await open(
          page.getByRole("menuitem", { name: "清除识别模型缓存", exact: true }),
          "清除模型缓存？",
          page.getByRole("button", { name: "更多", exact: true }),
        );
        await page
          .getByRole("button", { name: /^选择照片 / })
          .first()
          .click();
        await open(
          page.getByRole("button", { name: "识别所选照片", exact: true }),
          "识别照片标签",
        );
        await page
          .getByRole("button", { name: "手动整理", exact: true })
          .click();
        dialog = await inspect("核对照片标签");
        if (mode === "dark" && width === 390)
          await page.screenshot({
            path: path.join(output, "audit-tags-dark-mobile.png"),
          });
        await dialog
          .getByRole("button", { name: /^查看照片 / })
          .first()
          .click();
        nested = await inspect("OneUI 迁移验证");
        await dismiss(nested);
        const tags = dialog
          .getByRole("textbox", { name: /待保存标签/ })
          .first();
        await tags.fill("布局检查");
        await tags.press("Enter");
        await dialog
          .getByRole("button", { name: "保存标签", exact: true })
          .click();
        nested = await inspect("保存所选标签？");
        await dismiss(nested);
        await dismiss(dialog);
        await page
          .getByRole("button", { name: "放弃本次结果", exact: true })
          .click();
        dialog = await inspect("放弃本次结果？");
        await dialog
          .getByRole("button", { name: "确认放弃", exact: true })
          .click();
        await page.locator("dialog[open]").waitFor({ state: "hidden" });

        const loginContext = await context
          .browser()
          .newContext({ viewport: { width, height: 844 } });
        await loginContext.addInitScript(
          (mode) => localStorage.setItem("moment.admin.color-mode", mode),
          mode,
        );
        const login = await loginContext.newPage();
        await login.goto(base + "/login");
        await expect(
          login.getByRole("heading", { name: "Moment" }),
        ).toBeVisible();
        assert.ok(
          await login.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        const dividerOffsets = await login
          .locator(".login-divider")
          .evaluate((el) => {
            const label = el.querySelector("span").getBoundingClientRect(),
              mid = label.y + label.height / 2;
            return [...el.querySelectorAll('[role="separator"]')].map(
              (line) => {
                const r = line.getBoundingClientRect();
                return Math.abs(r.y + r.height / 2 - mid);
              },
            );
          });
        assert.ok(
          dividerOffsets.every((offset) => offset <= 1),
          "login divider must align with the label",
        );
        if (mode === "light" && width === 1280)
          await login.screenshot({
            path: path.join(output, "audit-login-light.png"),
          });
        await login.getByRole("button", { name: "登录", exact: true }).click();
        await expect(
          login.getByRole("textbox", { name: "用户名", exact: true }),
        ).toHaveAttribute("aria-invalid", "true");
        await loginContext.close();
        pages.push({ mode, width, route: "login" });
        console.log(`MODE PASS ${mode} ${width}`);
        await writeFile(
          path.join(output, "interface-audit.json"),
          JSON.stringify({ pages, dialogs: results }, null, 2),
        );
      }
    // A short landscape viewport exercises scrollable dialogs as well as columns.
    width = 844;
    await page.setViewportSize({ width, height: 390 });
    for (mode of ["light", "dark"]) {
      await page.evaluate(
        (value) => localStorage.setItem("moment.admin.color-mode", value),
        mode,
      );
      for (const route of routes) {
        await visit(route);
        pages.push({ mode, width, height: 390, route });
      }
      await visit("categories");
      await open(
        page.getByRole("button", { name: "新建分类", exact: true }),
        "新建分类",
      );
      await visit("account/security");
      await open(
        page.getByRole("button", { name: "添加通行密钥", exact: true }),
        "添加通行密钥",
      );
    }
    await page.evaluate(() =>
      localStorage.setItem("moment.admin.color-mode", "system"),
    );
    await visit("workbench");
    for (const colorScheme of ["dark", "light"]) {
      await page.emulateMedia({ colorScheme });
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        colorScheme,
      );
    }
    // Explicit selection must still take precedence over the device theme.
    await page.evaluate(() =>
      localStorage.setItem("moment.admin.color-mode", "dark"),
    );
    await visit("workbench");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.setViewportSize({ width: 320, height: 844 });
    width = 320;
    mode = "dark";
    await visit("settings/backups");
    await page
      .getByRole("button", { name: "恢复", exact: true })
      .first()
      .click();
    let restored = await inspect("恢复整站备份");
    await restored
      .getByLabel("当前账户密码", { exact: true })
      .fill("Migration.Test.2026");
    await restored
      .getByRole("textbox", { name: "输入「恢复备份」确认", exact: true })
      .fill("恢复备份");
    await restored
      .getByRole("button", { name: "确认恢复", exact: true })
      .click();
    await inspect("恢复完成");
  } catch (error) {
    throw new Error(`${mode}/${width}/${currentCase}: ${error.message}`, {
      cause: error,
    });
  } finally {
    await writeFile(
      path.join(output, "interface-audit.json"),
      JSON.stringify({ pages, dialogs: results }, null, 2),
    );
  }
  return { pages: pages.length, dialogChecks: results.length };
}
