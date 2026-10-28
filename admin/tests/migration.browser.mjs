import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const admin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.dirname(admin);
const data = await mkdtemp(path.join(os.tmpdir(), "moment-oneui-ui-"));
const output = path.join(admin, "test-results");
const apiPort = 19998,
  uiPort = 5176;
const base = `http://localhost:${uiPort}/admin`;
const children = [],
  failures = [],
  consoleErrors = [];
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
    { MOMENT_DEV_API: `http://127.0.0.1:${apiPort}` },
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
  page.on("pageerror", (error) => consoleErrors.push(error.message));
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
    await page.waitForURL("**/workbench");
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
        canvas.width = 192;
        canvas.height = 128;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#5067b8";
        ctx.fillRect(0, 0, 192, 128);
        return canvas.toDataURL("image/png").split(",")[1];
      });
      await page
        .locator('input[type="file"]')
        .setInputFiles({
          name: "migration.png",
          mimeType: "image/png",
          buffer: Buffer.from(pixels, "base64"),
        });
      await page.locator(".photo-editor-card").waitFor();
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
      await page.getByRole("button", { name: "图片操作", exact: true }).click();
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
    for (const route of [
      "workbench",
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
      await page.getByRole("button", { name: "打开导航", exact: true }).click();
      await page.getByRole("link", { name: "工作台", exact: true }).click();
      await page.waitForURL("**/workbench");
    },
  );
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
