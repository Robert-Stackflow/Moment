import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { auditInterface } from "./interface-audit.mjs";
import { auditEntryIcons } from "./entry-icons.browser.mjs";
import { auditOrganize } from "./organize.browser.mjs";
import { auditMediaCards } from "./media-cards.browser.mjs";
import { auditPhotoLayout } from "./photo-layout.browser.mjs";

const admin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.dirname(admin);
const data = await mkdtemp(path.join(os.tmpdir(), "moment-oneui-ui-"));
const output = path.join(admin, "test-results");
const apiPort = 19998,
  uiPort = 5176;
const base = `http://localhost:${uiPort}/admin`;
const children = [],
  failures = [],
  consoleErrors = [],
  runtimeEvidence = [];
let activeCheck = "setup";
let browser, page;
function start(command, args, cwd, env = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (chunk) => {
    log = (log + chunk).slice(-5000);
  });
  child.stderr.on("data", (chunk) => {
    log = (log + chunk).slice(-5000);
  });
  child.on("error", (error) => failures.push(error.message));
  children.push(child);
  return { child, log: () => log };
}
async function ready(url, process) {
  for (let i = 0; i < 100; i++) {
    if (process.child.exitCode !== null)
      throw new Error(process.log().slice(-600));
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Server did not start: " + process.log().slice(-600));
}
async function check(label, action) {
  if (
    process.env.MOMENT_UI_CHECK &&
    !new RegExp(process.env.MOMENT_UI_CHECK).test(label)
  )
    return;
  activeCheck = label;
  await action();
  console.log("PASS " + label);
}
async function api(url) {
  const response = await page.request.get(
    `http://localhost:${uiPort}/api/admin${url}`,
  );
  assert.equal(response.status(), 200, url);
  return (await response.json()).data;
}
async function noOverflow() {
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  await page.waitForFunction(
    () => !document.querySelector('[role="status"][data-full-page]'),
  );
  const overflow = await page.evaluate(() => {
    const main = document.querySelector("main");
    return {
      body: document.documentElement.scrollWidth - innerWidth,
      main: main ? main.scrollWidth - main.clientWidth : 0,
    };
  });
  assert.ok(overflow.body <= 1 && overflow.main <= 1, JSON.stringify(overflow));
}
async function searchIconAligned(label) {
  const input = page.getByRole("textbox", { name: label, exact: true });
  await input.waitFor();
  const offset = await input.evaluate((input) => {
    const icon = input.parentElement.querySelector("svg"),
      field = input.getBoundingClientRect(),
      rect = icon?.getBoundingClientRect();
    return rect
      ? Math.abs(rect.y + rect.height / 2 - field.y - field.height / 2)
      : Infinity;
  });
  assert.ok(offset <= 2, `${label}: search icon offset ${offset}px`);
}
try {
  await mkdir(output, { recursive: true });
  const server = start(
    "go",
    [
      "run",
      "./cmd/moment",
      "-addr",
      `127.0.0.1:${apiPort}`,
      "-data",
      data,
      "-dist",
      path.join(root, "dist"),
    ],
    root,
  );
  const frontend = start(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      String(uiPort),
      "--strictPort",
    ],
    admin,
    {
      MOMENT_DEV_API: `http://127.0.0.1:${apiPort}`,
      MOMENT_UI_TEST_CACHE: path.join(data, "vite-cache"),
    },
  );
  await Promise.all([
    ready(`http://127.0.0.1:${apiPort}/api/admin/setup`, server),
    ready(`http://127.0.0.1:${uiPort}/admin/`, frontend),
  ]);
  browser = await chromium.launch({
    headless: true,
    ...(process.env.MOMENT_TEST_CHANNEL
      ? { channel: process.env.MOMENT_TEST_CHANNEL }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  page = await context.newPage();
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
    runtimeEvidence.push({
      phase: activeCheck,
      url: page.url(),
      stack: error.stack,
    });
  });
  await check("shared login validation and real authentication", async () => {
    await page.goto(base + "/login");
    await page.getByRole("button", { name: "创建账户并进入" }).click();
    await page.getByText("请填写用户名。", { exact: true }).waitFor();
    assert.equal(
      await page.locator("form").evaluate((form) => form.noValidate),
      true,
    );
    await page.getByLabel("用户名", { exact: true }).fill("migration");
    await page
      .getByLabel("邮箱", { exact: true })
      .fill("migration@example.test");
    await page.getByLabel("密码", { exact: true }).fill("Migration.Test.2026");
    await page.getByRole("button", { name: "创建账户并进入" }).click();
    await page.waitForURL("**/overview");
    await page.goto(base + "/workbench");
    await page.waitForURL("**/overview");
    await page.getByRole("heading", { name: "概览", exact: true }).waitFor();
  });
  await check("map settings credentials and responsive layout", async () => {
    await page.goto(base + "/settings/maps");
    await page.getByLabel("API Key", { exact: true }).fill("ui-map-key");
    await page.getByLabel("安全密钥", { exact: true }).fill("ui-map-secret");
    const saved = page.waitForResponse(r => r.url().endsWith("/api/admin/settings/maps") && r.request().method() === "PATCH");
    await page.getByRole("button", { name: "保存设置", exact: true }).click();
    assert.equal((await saved).status(), 200);
    await page.getByText("已配置，留空保留当前凭据", { exact: true }).waitFor();
    assert.equal(await page.getByLabel("安全密钥", { exact: true }).inputValue(), "");
    const config = await page.request.get(new URL(base).origin + "/api/v1/visitor/maps/config");
    const configText = await config.text();
    assert.ok(configText.includes("ui-map-key"));
    assert.ok(!configText.includes("ui-map-secret"));
    for (const [width, theme] of [[1280, "light"], [390, "dark"]]) {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.getByRole("group", { name: "颜色模式", exact: true }).getByRole("button", { name: theme === "dark" ? "深色" : "浅色", exact: true }).click();
      await page.waitForFunction(() => !document.documentElement.dataset.themeChanging);
      await page.setViewportSize({ width, height: 800 });
      await noOverflow();
      assert.equal(await page.getByText("使用环境变量", { exact: true }).count(), 0);
      await page.screenshot({ path: path.join(output, `maps-settings-${width}-${theme}.png`) });
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("group", { name: "颜色模式", exact: true }).getByRole("button", { name: "浅色", exact: true }).click();
  });
  await check(
    "category form validation, child creation and shared tree table",
    async () => {
      await page.goto(base + "/categories");
      await page.getByRole("button", { name: "新建分类", exact: true }).click();
      await page.getByRole("button", { name: "保存分类", exact: true }).click();
      await page.getByText("请填写分类名称。", { exact: true }).waitFor();
      await page.getByLabel("分类名称", { exact: true }).fill("迁移分类");
      await page.getByLabel("访问别名", { exact: true }).fill("migration-life");
      await page.getByRole("button", { name: "保存分类", exact: true }).click();
      await page.getByRole("treegrid", { name: "分类与层级" }).waitFor();
      await page
        .getByRole("button", { name: "在 迁移分类 下添加分类", exact: true })
        .click();
      await page.getByLabel("分类名称", { exact: true }).fill("旅行");
      await page
        .getByLabel("访问别名", { exact: true })
        .fill("migration-travel");
      await page.getByRole("button", { name: "保存分类", exact: true }).click();
      await page.getByText("旅行", { exact: true }).waitFor();
      const categories = await api("/categories");
      assert.equal(categories[0].children[0].name, "旅行");
      await noOverflow();
    },
  );
  let postId;
  await check(
    "upload, photo drawer, tags, draft and published post",
    async () => {
      await page.goto(base + "/posts/new");
      await page
        .getByRole("textbox", { name: "帖子标题", exact: true })
        .fill("OneUI 迁移验证");
      const pixels = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#5067b8";
        ctx.fillRect(0, 0, 1200, 800);
        ctx.strokeStyle = "#dce7ff";
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.arc(600, 400, 220, 0, Math.PI * 2);
        ctx.stroke();
        return canvas.toDataURL("image/png").split(",")[1];
      });
      await page.locator('input[type="file"]').setInputFiles([
        {
          name: "migration.png",
          mimeType: "image/png",
          buffer: Buffer.from(pixels, "base64"),
        },
        {
          name: "migration-copy.png",
          mimeType: "image/png",
          buffer: Buffer.from(pixels, "base64"),
        },
      ]);
      await page.waitForFunction(
        () => document.querySelectorAll(".photo-editor-card").length === 2,
      );
      await page
        .getByRole("button", { name: "编辑图片 1", exact: true })
        .click();
      const drawer = page.getByRole("dialog", { name: "编辑图片信息" });
      await drawer.waitFor();
      const tag = drawer.getByRole("textbox", {
        name: "图片标签",
        exact: true,
      });
      await tag.fill("迁移验证");
      await tag.press("Enter");
      const focus = drawer.getByRole("button", {
        name: "调整封面焦点，方向键微调",
        exact: true,
      });
      await focus.focus();
      await focus.press("ArrowRight");
      assert.equal(
        await drawer
          .getByRole("slider", { name: /^焦点水平位置/ })
          .inputValue(),
        "51",
      );
      await drawer
        .getByRole("button", { name: "应用修改", exact: true })
        .click();
      await page
        .getByRole("button", { name: "保存并公开", exact: true })
        .click();
      await page.waitForURL(/\/posts\/\d+$/);
      postId = Number(page.url().split("/").at(-1));
      const post = await api(`/posts/${postId}`);
      assert.equal(post.title, "OneUI 迁移验证");
      assert.deepEqual(post.images[0].tags, ["迁移验证"]);
    },
  );
  await check(
    "shared date picker, independent category selection and photo menu",
    async () => {
      await page
        .getByRole("button", { name: /^图片操作 \d+$/ })
        .first()
        .click();
      await page
        .getByRole("menuitem", { name: "隐藏图片", exact: true })
        .waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("combobox", { name: "分类", exact: true }).click();
      await page.getByRole("treeitem", { name: /迁移分类/ }).click();
      await page.getByRole("button", { name: "完成", exact: true }).click();
      await page
        .getByRole("combobox", { name: "拍摄时间", exact: true })
        .click();
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "发布更新", exact: true }).click();
      await page.waitForTimeout(500);
      const post = await api(`/posts/${postId}`);
      assert.equal(
        post.category_ids.length,
        1,
        "parent selection must not select children",
      );
    },
  );
  await check("shared table view and all authenticated routes", async () => {
    await page.goto(base + "/posts");
    await page
      .getByRole("group", { name: "显示方式", exact: true })
      .getByRole("button", { name: "紧凑列表" })
      .click();
    await page.getByRole("table", { name: "帖子列表" }).waitFor();
    assert.equal(
      await page
        .locator(".desktop-table")
        .evaluate((el) => getComputedStyle(el).borderTopWidth),
      "0px",
      "table layout wrapper must not add another frame",
    );
    for (const route of [
      "overview",
      "organize",
      "organize/tags",
      "drafts",
      "schedules",
      "trash",
      "shares",
      "shares/new",
      "settings/meta",
      "settings/content",
      "settings/storage",
      "settings/general",
      "settings/backups",
      "account",
      "account/security",
      "account/password",
      "account/sessions",
    ]) {
      await page.goto(base + "/" + route);
      await page.locator("h1").waitFor();
      assert.equal(
        await page.getByText("Unexpected Application Error!").count(),
        0,
        route,
      );
      await noOverflow();
    }
  });
  await check("share form validation and shared action menu", async () => {
    await page.goto(base + "/shares/new");
    await page.getByRole("button", { name: "保存相册", exact: true }).click();
    await page.getByText("请填写相册名称。", { exact: true }).waitFor();
    await page
      .getByRole("textbox", { name: "相册名称", exact: true })
      .fill("迁移分享");
    await page
      .getByRole("button", { name: "生成随机密码", exact: true })
      .click();
    await page
      .getByRole("checkbox", { name: "选择 OneUI 迁移验证", exact: true })
      .check();
    await page.getByRole("button", { name: "保存相册", exact: true }).click();
    await page.waitForURL("**/shares");
    await page.getByRole("button", { name: "分享操作", exact: true }).click();
    await page
      .getByRole("menuitem", { name: "停用分享", exact: true })
      .waitFor();
    await page.keyboard.press("Escape");
  });
  await check("shared accordion and nullable decimal coordinates", async () => {
    await page.goto(base + "/posts/new");
    await noOverflow();
    const accordion = page
      .getByRole("button", { name: "地图与时间线", exact: true })
      .last();
    await accordion.click();
    const latitude = page
      .getByRole("spinbutton", { name: "纬度", exact: true })
      .last();
    await latitude.waitFor();
    assert.equal(await latitude.getAttribute("type"), "text");
    assert.equal(await latitude.inputValue(), "");
    await latitude.fill("30.123456");
    await latitude.press("Tab");
    assert.equal(await latitude.inputValue(), "30.123456");
    await latitude.fill("");
    await latitude.press("Tab");
    assert.equal(await latitude.inputValue(), "");
    assert.equal(await latitude.getAttribute("aria-valuenow"), null);
    await accordion.click();
    assert.equal(await accordion.getAttribute("aria-expanded"), "false");
  });
  await check(
    "settings, entries, card rows and search icon layout",
    async () => {
      await page.goto(base + "/settings/meta");
      await noOverflow();
      const settingsNavigation = page.getByRole("navigation", {
        name: "网站设置导航",
        exact: true,
      });
      assert.equal(
        await settingsNavigation.getAttribute("data-navigation"),
        "card",
      );
      for (const label of [
        "相册展示",
        "图片存储",
        "备份与恢复",
        "个性化",
        "网站信息",
      ]) {
        await settingsNavigation
          .getByRole("link", { name: label, exact: true })
          .click();
        await settingsNavigation
          .locator('a[aria-current="page"]')
          .filter({ hasText: label })
          .waitFor();
        await noOverflow();
        assert.equal(
          await settingsNavigation
            .getByRole("link", { name: label, exact: true })
            .getAttribute("aria-current"),
          "page",
        );
      }
      await page
        .getByRole("textbox", { name: "网站名称", exact: true })
        .fill("视觉验证");
      await page
        .getByRole("textbox", { name: "标题分隔符", exact: true })
        .fill("|");
      await page
        .getByRole("combobox", { name: "选择颜色 · 相册主题色", exact: true })
        .click();
      const themeColor = page.getByRole("textbox", {
        name: "相册主题色 HEX",
        exact: true,
      });
      await themeColor.fill("#3478AB");
      await themeColor.press("Tab");
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "添加入口", exact: true }).click();
      await page
        .getByRole("textbox", { name: "入口名称 1", exact: true })
        .fill("主页");
      await page
        .getByRole("textbox", { name: "入口地址 1", exact: true })
        .fill("https://example.test");
      assert.equal(
        await page.locator('.entry-row [role="combobox"]').count(),
        1,
      );
      const centers = await page.locator(".entry-row").evaluate((el) =>
        [...el.querySelectorAll('input,[role="combobox"]')].map((node) => {
          const b = node.getBoundingClientRect();
          return b.y + b.height / 2;
        }),
      );
      assert.ok(
        Math.max(...centers) - Math.min(...centers) < 1,
        "entry controls must share a vertical center",
      );
      const setting = page.getByRole("textbox", {
        name: "网站名称",
        exact: true,
      });
      assert.ok(
        await setting.evaluate((el) => {
          const label = document.querySelector(`label[for="${el.id}"]`);
          const row = el.closest("[data-align]");
          if (!label || !row || !row.contains(label)) return false;
          const inputBox = el.getBoundingClientRect();
          const labelBox = label.getBoundingClientRect();
          return (
            inputBox.left > labelBox.right &&
            Math.abs(
              inputBox.y +
                inputBox.height / 2 -
                labelBox.y -
                labelBox.height / 2,
            ) < 2
          );
        }),
        "shared setting row must link and align its label and control",
      );
      const entryBox = await page.locator(".entry-row").boundingBox();
      for (const button of await page.locator(".entry-actions button").all()) {
        const box = await button.boundingBox();
        assert.ok(
          box.y >= entryBox.y &&
            box.y + box.height <= entryBox.y + entryBox.height,
          "entry action must stay in its row",
        );
      }
      const saving = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/admin/settings/meta") &&
          response.request().method() === "PATCH",
      );
      await page.getByRole("button", { name: "保存设置", exact: true }).click();
      assert.equal((await saving).status(), 200);
      await page.waitForTimeout(150);
      const settings = await api("/settings");
      assert.equal(settings.meta.entries[0].name, "主页");
      assert.equal(settings.meta.primary_color.toLowerCase(), "#3478ab");
      await page.waitForFunction(
        () => document.title === "视觉验证 | 管理后台",
      );
      await page
        .locator("main")
        .evaluate((main) => (main.scrollTop = main.scrollHeight));
      await page.screenshot({
        path: path.join(output, "settings-entries-light.png"),
      });
      await page.goto(base + "/account/sessions");
      await noOverflow();
      assert.equal(
        await page
          .getByRole("navigation", { name: "账户设置导航", exact: true })
          .getAttribute("data-navigation"),
        "card",
      );
      assert.equal(await page.locator(".account-session-note").count(), 0);
      await page
        .getByRole("list", { name: "登录会话", exact: true })
        .getByRole("listitem")
        .first()
        .waitFor();
      assert.equal(
        await page
          .getByRole("list", { name: "登录会话", exact: true })
          .getByRole("listitem")
          .first()
          .evaluate((el) => getComputedStyle(el).borderRadius),
        await page
          .locator("html")
          .evaluate((el) =>
            getComputedStyle(el).getPropertyValue("--card-radius").trim(),
          ),
      );
      await page.screenshot({ path: path.join(output, "sessions-light.png") });
      await page.goto(base + "/account/security");
      await noOverflow();
      assert.equal(await page.getByRole("switch").count(), 0);
      const cdp = await context.newCDPSession(page);
      await cdp.send("WebAuthn.enable");
      const { authenticatorId } = await cdp.send(
        "WebAuthn.addVirtualAuthenticator",
        {
          options: {
            protocol: "ctap2",
            transport: "internal",
            hasResidentKey: true,
            hasUserVerification: true,
            isUserVerified: true,
            automaticPresenceSimulation: true,
          },
        },
      );
      await page
        .getByRole("button", { name: "添加通行密钥", exact: true })
        .click();
      const passkeyDialog = page.getByRole("dialog", {
        name: "添加通行密钥",
        exact: true,
      });
      await passkeyDialog
        .getByRole("textbox", { name: "密钥名称", exact: true })
        .fill("测试设备");
      await passkeyDialog
        .getByRole("button", { name: "验证并添加", exact: true })
        .click();
      await passkeyDialog.waitFor({ state: "hidden" });
      const passkeyList = page.getByRole("list", {
        name: "通行密钥",
        exact: true,
      });
      await passkeyList
        .getByRole("button", { name: "重命名通行密钥 测试设备", exact: true })
        .waitFor();
      assert.equal((await api("/me/passkeys")).length, 1);
      await page.locator("dialog[open]").waitFor({ state: "hidden" });
      await page.screenshot({
        path: path.join(output, "passkeys-shared-light.png"),
      });
      await passkeyList
        .getByRole("button", { name: "重命名通行密钥 测试设备", exact: true })
        .click();
      const rename = page.getByRole("dialog", {
        name: "重命名通行密钥",
        exact: true,
      });
      await rename
        .getByRole("textbox", { name: "密钥名称", exact: true })
        .fill("重命名设备");
      await rename.getByRole("button", { name: "保存", exact: true }).click();
      await rename.waitFor({ state: "hidden" });
      assert.equal((await api("/me/passkeys"))[0].name, "重命名设备");
      await cdp.send("WebAuthn.removeVirtualAuthenticator", {
        authenticatorId,
      });
      await cdp.detach();
      await page.goto(base + "/account/password");
      await noOverflow();
      assert.equal(
        await page
          .locator(".form-actions")
          .evaluate((el) => getComputedStyle(el).borderTopWidth),
        "0px",
      );
      const id = crypto.randomUUID(),
        origin = new URL(base).origin;
      const draft = await page.request.put(origin + "/api/admin/drafts/" + id, {
        headers: { Origin: origin },
        data: {
          id,
          post_id: null,
          base_revision: 0,
          revision: 0,
          mutation_id: crypto.randomUUID(),
          payload: {
            title: "排版验证草稿",
            desc: "草稿卡片与操作按钮",
            location: "",
            time: "2026-10-29T12:00:00",
            is_hidden: false,
            category_ids: [],
            images: [],
            discovery: {
              latitude: null,
              longitude: null,
              precision: "private",
              timeline: "show",
            },
          },
        },
      });
      assert.equal(draft.status(), 200);
      await page.goto(base + "/drafts");
      await noOverflow();
      await searchIconAligned("搜索草稿");
      const row = page
        .locator(".draft-row")
        .filter({ has: page.getByText("排版验证草稿", { exact: true }) });
      const content = await row.locator(".draft-row-main").boundingBox(),
        remove = await row
          .getByRole("button", { name: "删除草稿 排版验证草稿", exact: true })
          .boundingBox();
      assert.ok(
        remove.x >= content.x + content.width - 1,
        "draft action must be right aligned",
      );
      assert.ok(
        Math.abs(
          remove.y + remove.height / 2 - content.y - content.height / 2,
        ) <= 2,
        "draft action must align with content",
      );
      await page.goto(base + "/shares");
      await noOverflow();
      await searchIconAligned("搜索分享相册");
      await page.goto(base + "/schedules");
      await noOverflow();
      await searchIconAligned("搜索发布计划");
      await page.goto(base + "/organize/duplicates");
      await noOverflow();
      await page.getByRole("button", { name: "开始扫描", exact: true }).click();
      await page
        .getByRole("dialog", { name: "扫描重复图片", exact: true })
        .getByRole("button", { name: "开始检测", exact: true })
        .click();
      const comparison = page
        .getByRole("button", { name: /^比较分组/ })
        .first();
      await comparison.waitFor({ timeout: 20000 });
      assert.equal(
        await comparison.evaluate((el) => getComputedStyle(el).display),
        "grid",
      );
      await comparison.click();
      await page
        .getByRole("button", { name: /^查看原图/ })
        .first()
        .waitFor();
      await page.keyboard.press("Escape");
      await page.goto(base + "/organize/tags");
      await noOverflow();
      assert.equal(
        await page
          .getByRole("group", { name: "照片整理方式", exact: true })
          .count(),
        1,
      );
      await searchIconAligned("搜索待整理照片");
      const radii = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement),
          radius = parseFloat(root.getPropertyValue("--radius"));
        return {
          expected: radius - 3,
          actual: [...document.querySelectorAll("button")]
            .filter((button) => {
              const r = button.getBoundingClientRect();
              return (
                r.width &&
                r.height &&
                button.closest(".sidebar-footer") &&
                !button.closest('[role="group"]')
              );
            })
            .map((button) => parseFloat(getComputedStyle(button).borderRadius)),
        };
      });
      assert.ok(
        radii.actual.every((radius) => radius === radii.expected),
        "sidebar controls must use shared button radius",
      );
    },
  );
  await check(
    "light/dark themes and mobile navigation without horizontal overflow",
    async () => {
      await page.goto(base + "/categories");
      await page
        .getByRole("group", { name: "颜色模式", exact: true })
        .getByRole("button", { name: "深色", exact: true })
        .click();
      assert.equal(
        await page.locator("html").getAttribute("data-theme"),
        "dark",
      );
      await page.waitForFunction(
        () => !document.documentElement.dataset.themeChanging,
      );
      await page.screenshot({ path: path.join(output, "categories-dark.png") });
      await page.setViewportSize({ width: 390, height: 844 });
      await noOverflow();
      await page.goto(base + "/posts");
      await noOverflow();
      for (const control of await page
        .locator('.toolbar [role="combobox"]')
        .all())
        assert.ok(
          (await control.boundingBox()).width >= 140,
          "mobile filters must remain readable",
        );
      await page.screenshot({ path: path.join(output, "posts-mobile.png") });
      await page.goto(base + "/posts/new");
      await noOverflow();
      await page.goto(base + "/settings/meta");
      await noOverflow();
      for (const input of await page.locator(".entry-row input").all())
        assert.ok(
          (await input.boundingBox()).width >= 150,
          "mobile entry inputs must remain readable",
        );
      await page.goto(base + "/account/sessions");
      await noOverflow();
      for (const route of [
        "overview",
        "drafts",
        "schedules",
        "shares",
        "shares/new",
        "organize/duplicates",
        "organize/tags",
        "categories",
        "settings/content",
        "settings/storage",
        "settings/general",
        "settings/backups",
        "account",
        "account/security",
        "account/password",
      ]) {
        await page.goto(base + "/" + route);
        await noOverflow();
      }
      await page.getByRole("button", { name: "打开导航", exact: true }).click();
      await page.getByRole("link", { name: "概览", exact: true }).click();
      await page.waitForURL("**/overview");
    },
  );
  await check("shared built-in entry icon catalog", async () => {
    console.log(
      "ICONS " +
        JSON.stringify(
          await auditEntryIcons({ page, base, api, output, noOverflow }),
        ),
    );
  });
  await check("shared organize layout and animated navigation", async () => {
    console.log(
      "ORGANIZE " +
        JSON.stringify(
          await auditOrganize({ page, base, api, output, noOverflow }),
        ),
    );
  });
  await check(
    "reported photo cards, editor layout and shared action menu",
    async () => {
      console.log(
        "PHOTO_LAYOUT " +
          JSON.stringify(
            await auditPhotoLayout({ page, base, postId, output, noOverflow }),
          ),
      );
    },
  );
  await check("shared media cards and post detail levels", async () => {
    console.log(
      "MEDIA_CARDS " +
        JSON.stringify(
          await auditMediaCards({ page, base, postId, output, noOverflow }),
        ),
    );
  });
  await check("page and dialog light/dark desktop/mobile matrix", async () => {
    const results = await auditInterface({
      page,
      context,
      base,
      api,
      postId,
      output,
      noOverflow,
    });
    console.log("AUDIT " + JSON.stringify(results));
  });
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(failures, []);
  console.log("PASS no browser runtime errors; isolated data only");
} catch (error) {
  if (page)
    await page
      .screenshot({ path: path.join(output, "failure.png") })
      .catch(() => {});
  console.error(String(error.stack || error).slice(0, 2400));
  process.exitCode = 1;
} finally {
  await writeFile(
    path.join(output, "runtime-errors.json"),
    JSON.stringify(runtimeEvidence, null, 2),
  );
  await browser?.close();
  for (const child of children.reverse()) {
    if (child.exitCode !== null) continue;
    if (process.platform === "win32")
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    else child.kill("SIGTERM");
  }
  const resolved = path.resolve(data);
  if (
    path.dirname(resolved) === path.resolve(os.tmpdir()) &&
    path.basename(resolved).startsWith("moment-oneui-ui-")
  )
    await rm(resolved, {
      recursive: true,
      force: true,
      maxRetries: 1,
      retryDelay: 500,
    });
}
