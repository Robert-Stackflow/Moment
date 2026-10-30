import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium } from 'playwright'
import { expect } from 'playwright/test'
import { installFixtures } from './fixtures.mjs'

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  output = path.join(web, 'test-results')
const port = Number(process.env.MOMENT_GALLERY_TEST_PORT || 5183),
  base = `http://127.0.0.1:${port}`
const adminServer = createServer((request, response) => {
  if (!request.url.startsWith('/admin/')) return response.writeHead(404).end()
  response.writeHead(200, { 'Content-Type': 'text/html' })
  response.end('<h1>Admin application</h1>')
})
await new Promise((resolve) => adminServer.listen(0, '127.0.0.1', resolve))
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  {
    cwd: web,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, MOMENT_DEV_API: `http://127.0.0.1:${adminServer.address().port}` },
  },
)
let logs = ''
for (const stream of [server.stdout, server.stderr])
  stream.on('data', (value) => {
    logs = (logs + value).slice(-3000)
  })
let browser, activePage
const errors = [],
  checks = []
try {
  await mkdir(output, { recursive: true })
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base)).ok) break
    } catch {}
    if (i === 59) throw new Error(logs)
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  browser = await chromium.launch({
    ...(process.env.MOMENT_TEST_CHANNEL || (process.platform === 'win32' ? 'msedge' : '')
      ? { channel: process.env.MOMENT_TEST_CHANNEL || 'msedge' }
      : {}),
  })
  for (const width of [1280, 390, 320]) {
    const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
        hasTouch: width < 500,
      }),
      page = await context.newPage()
    activePage = page
    const state = await installFixtures(page)
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' && /ReferenceError|TypeError|React error/.test(message.text()))
        errors.push(message.text())
    })
    await page.goto(base)
    await expect(page.locator('.thumb.is-revealed').first()).toBeVisible()
    if (width > 736) {
      const sizes = await page.locator('#header nav .gallery-button').evaluateAll((buttons) =>
        buttons.map((button) => {
          const rect = button.getBoundingClientRect()
          return [rect.width, rect.height]
        }),
      )
      assert.ok(sizes.every(([width, height]) => width === 36 && height === 36))
      const full = page.getByRole('button', { name: '全屏浏览', exact: true })
      await full.hover()
      await expect(page.getByRole('tooltip', { name: '全屏浏览', exact: true })).toBeVisible()
      assert.ok(await full.getAttribute('aria-describedby'))
      await page.keyboard.press('Escape')
      await expect(page.getByRole('tooltip', { name: '全屏浏览', exact: true })).toBeHidden()
      await full.click()
      await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
      await page.getByRole('button', { name: '退出全屏', exact: true }).click()
      await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false)
    } else {
      await expect(page.getByRole('button', { name: '全屏浏览', exact: true })).toBeHidden()
    }
    await page.locator('.gallery-sentinel').scrollIntoViewIfNeeded()
    if ((await page.locator('.thumb-a').count()) < 5) {
      const more = page
        .locator('.gallery-sentinel')
        .getByRole('button', { name: '加载更多', exact: true })
      if (await more.isVisible()) await more.click()
    }
    await expect(page.locator('.thumb-a')).toHaveCount(5)
    await page.evaluate(() => window.scrollTo(0, 0))
    const stamp = await page.evaluate(() => {
      window.__gallerySPA = 'preserved'
      return performance.timeOrigin
    })
    const sameDocument = async () => {
      assert.equal(await page.evaluate(() => performance.timeOrigin), stamp)
      assert.equal(await page.evaluate(() => window.__gallerySPA), 'preserved')
    }
    const noOverflow = async () =>
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    await page.getByRole('button', { name: '关于', exact: true }).click()
    await expect(page.locator('#footer')).toHaveClass(/active/)
    await expect(page.locator('#footer')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: '关于', exact: true })).toBeFocused()
    const card = await page.locator('.thumb').first().elementHandle()
    await page.locator('.thumb-a').first().click()
    await expect(page.locator('.viewer-photo[aria-hidden="false"]')).toBeVisible()
    assert.ok(
      await card.evaluate((element) => element.isConnected),
      'photo wall remains mounted behind the viewer',
    )
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    assert.ok(
      await page.evaluate(() =>
        document.querySelector('.gallery-viewer').contains(document.activeElement),
      ),
      'focus stays inside the viewer',
    )
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.viewer-counter')).toContainText('2')
    await expect(page.locator('.viewer-photo[aria-hidden="false"]')).toBeVisible()
    const information = page.getByRole('button', { name: '照片信息', exact: true })
    const informationInitiallyOpen = (await information.getAttribute('aria-pressed')) === 'true'
    if (!informationInitiallyOpen) {
      await information.click()
      await expect(page.locator('.viewer-caption')).toBeVisible()
    }
    await information.click()
    await expect(page.locator('.viewer-caption')).toHaveCount(0)
    await page.getByRole('button', { name: '照片信息', exact: true }).click()
    await expect(page.locator('.viewer-caption')).toBeVisible()
    if (!informationInitiallyOpen) await information.click()
    await page.getByRole('button', { name: '缩略图', exact: true }).click()
    await expect(page.locator('.viewer-thumbnails')).toHaveCount(0)
    await page.getByRole('button', { name: '缩略图', exact: true }).click()
    await expect(page.locator('.viewer-thumbnails')).toBeVisible()
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error('Clipboard unavailable')
          },
        },
      })
    })
    await page.getByRole('button', { name: '分享当前照片', exact: true }).click()
    await expect(page.getByLabel('复制照片链接', { exact: true })).toHaveValue(/post\/1\?photo=2$/)
    await page.keyboard.press('Escape')
    await expect(page.locator('.viewer-share')).toHaveCount(0)
    await page.getByRole('button', { name: '放大 · 双击照片', exact: true }).click()
    await expect(page.locator('.viewer-stage')).toHaveClass(/is-zoomed/)
    await page.keyboard.press('Escape')
    await expect(page.locator('.viewer-stage')).not.toHaveClass(/is-zoomed/)
    if (width < 500) {
      const session = await context.newCDPSession(page),
        box = await page.locator('.viewer-stage').boundingBox(),
        x = box.x + box.width / 2,
        y = box.y + box.height / 3
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [
          { x: x - 30, y, id: 1 },
          { x: x + 30, y, id: 2 },
        ],
      })
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: x - 75, y, id: 1 },
          { x: x + 75, y, id: 2 },
        ],
      })
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await expect(page.locator('.viewer-stage')).toHaveClass(/is-zoomed/)
      await page.keyboard.press('Escape')
      await expect(page.locator('.viewer-stage')).not.toHaveClass(/is-zoomed/)
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: x + 65, y, id: 1 }],
      })
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x - 65, y, id: 1 }],
      })
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await expect(page.locator('.viewer-counter')).toContainText('3')
      await session.detach()
    }
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: '照片浏览', exact: true })).toHaveCount(0)
    await sameDocument()
    await page.getByRole('button', { name: '分类', exact: true }).click()
    await page
      .locator('#gallery-categories')
      .getByRole('link', { name: '生活', exact: true })
      .click()
    await page.waitForURL('**/category/life')
    await expect(page.locator('.thumb-a').first()).toBeVisible()
    await sameDocument()
    await page.getByRole('button', { name: '分类', exact: true }).click()
    await expect(page.locator('#gallery-categories a.router-link-exact-active')).toHaveText('生活')
    await page.keyboard.press('Escape')
    await page
      .locator('.tag-categories')
      .first()
      .getByRole('link', { name: '杭州', exact: true })
      .click()
    await page.waitForURL('**/location/*')
    await sameDocument()
    await page.getByRole('link', { name: '地图', exact: true }).click()
    await expect(page.locator('.photo-map-canvas')).toBeVisible()
    await expect(page.locator('.explore-map-marker')).toBeVisible()
    await sameDocument()
    await page.getByRole('button', { name: '加载详细地图', exact: true }).click()
    await expect(page.getByRole('dialog', { name: '加载详细地图', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '暂不加载', exact: true }).click()
    await page.getByRole('link', { name: '拍摄时间线', exact: true }).click()
    await expect(page.locator('.explore-photo')).toHaveCount(7)
    await sameDocument()
    await page.getByRole('button', { name: /2026 年，7 张照片/ }).click()
    await page.waitForURL('**/timeline?year=2026')
    await sameDocument()
    await page.locator('.explore-photo').first().click()
    await expect(page.getByRole('dialog', { name: '照片浏览', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: '照片浏览', exact: true })).toHaveCount(0)
    await sameDocument()
    await noOverflow()
    await page.goto(base + '/post/1?photo=2')
    await expect(page.locator('.viewer-counter')).toContainText('2')
    await page.keyboard.press('Escape')
    await page.waitForURL(base + '/')
    await noOverflow()
    await page.goto(base + '/share/migration-album')
    await expect(page.getByRole('heading', { name: '为你分享的相册' })).toBeVisible()
    await page.getByLabel('访问密码', { exact: true }).fill('wrong')
    await page.getByRole('button', { name: '打开相册', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('密码不正确')
    await page.getByLabel('访问密码', { exact: true }).fill('gallery-password')
    await page.getByRole('button', { name: '打开相册', exact: true }).click()
    await expect(page.locator('.shared-wall .thumb-a')).toHaveCount(2)
    await page.locator('.shared-wall .thumb-a').first().click()
    await expect(page.locator('.viewer-photo[aria-hidden="false"]')).toBeVisible()
    assert.equal(
      await page.locator('.viewer-caption a').count(),
      0,
      'shared albums do not expose navigation into the public gallery',
    )
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: '照片浏览', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: '锁定相册', exact: true }).click()
    await expect(page.getByLabel('访问密码', { exact: true })).toBeVisible()
    await page.getByLabel('访问密码', { exact: true }).fill('gallery-password')
    await page.getByRole('button', { name: '打开相册', exact: true }).click()
    await expect(page.locator('.shared-wall')).toBeVisible()
    state.revoked = true
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(page.getByRole('heading', { name: '分享已失效', exact: true })).toBeVisible()
    await expect(page.locator('.shared-wall')).toHaveCount(0)
    await noOverflow()
    await page.goto(base + '/post/not-a-number')
    await expect(page.getByRole('heading', { name: '找不到这个页面', exact: true })).toBeVisible()
    await page.getByRole('link', { name: '返回相册', exact: true }).click()
    await expect(page.locator('.thumb-a').first()).toBeVisible()
    checks.push({
      width,
      spaNavigation: true,
      retainedWall: true,
      viewerKeysAndZoom: true,
      touchPinchAndSwipe: width < 500,
      focusTrap: true,
      mapAndTimeline: true,
      directPhotoURL: true,
      shareUnlockLockAndRevocation: true,
      noOverflow: true,
    })
    await context.close()
  }
  const motionContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'no-preference',
    }),
    motionPage = await motionContext.newPage()
  await installFixtures(motionPage)
  motionPage.on('pageerror', (error) => errors.push(error.message))
  await motionPage.goto(base)
  await motionPage.locator('.thumb.is-revealed').first().waitFor()
  await motionPage.locator('.thumb-a').first().click()
  await expect(motionPage.locator('.viewer-photo[aria-hidden="false"]')).toBeVisible()
  await motionPage.evaluate(() => {
    window.__photoTransitions = []
    document
      .querySelector('.viewer-frame')
      .addEventListener('transitionrun', (event) =>
        window.__photoTransitions.push(event.propertyName),
      )
  })
  await motionPage.getByRole('button', { name: '下一张 · →', exact: true }).click()
  await expect
    .poll(() =>
      motionPage.evaluate(
        () =>
          window.__photoTransitions.includes('width') &&
          window.__photoTransitions.includes('opacity'),
      ),
    )
    .toBe(true)
  await expect(motionPage.locator('.viewer-photo[aria-hidden="false"]')).toBeVisible()
  const frame = await motionPage.locator('.viewer-frame').boundingBox()
  assert.ok(Math.abs(frame.width / frame.height - 0.6) < 0.01)
  await motionContext.close()
  const adminResponse = await fetch(base + '/admin/login?next=%2Fadmin%2Fposts', {
    redirect: 'manual',
  })
  assert.equal(adminResponse.status, 302)
  const adminTarget = new URL(adminResponse.headers.get('location'))
  assert.notEqual(adminTarget.origin, base)
  assert.equal(adminTarget.pathname, '/admin/login')
  assert.equal(adminTarget.searchParams.get('next'), '/admin/posts')
  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  activePage = adminPage
  await installFixtures(adminPage)
  let documents = 0
  adminPage.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === adminPage.mainFrame()) documents++
  })
  await adminPage.goto(base + '/admin/login?next=%2Fadmin%2Fposts')
  await expect(adminPage.getByRole('heading', { name: 'Admin application' })).toBeVisible()
  await adminPage.waitForTimeout(600)
  assert.equal(documents, 2, 'one handoff to the admin application, without a reload loop')
  await adminPage.goto(base)
  await expect(adminPage.locator('.thumb-a').first()).toBeVisible()
  const documentStamp = await adminPage.evaluate(() => {
    history.pushState({}, '', '/admin/login')
    dispatchEvent(new PopStateEvent('popstate'))
    return performance.timeOrigin
  })
  await expect(adminPage.getByRole('link', { name: '打开后台管理', exact: true })).toBeVisible()
  await adminPage.waitForTimeout(600)
  assert.equal(await adminPage.evaluate(() => performance.timeOrigin), documentStamp)
  await adminContext.close()
  assert.deepEqual(errors, [])
  console.log(
    JSON.stringify({
      checks: checks.length,
      animatedTransitions: true,
      adminHandoffWithoutReloadLoop: true,
      errors: errors.length,
      productionWrites: 0,
    }),
  )
} catch (error) {
  console.error(error)
  if (activePage && !activePage.isClosed())
    console.error(
      'STATE ' +
        JSON.stringify(
          await activePage.evaluate(() => ({
            url: location.href,
            active: document.activeElement?.className,
            inert: document.getElementById('app').inert,
            dialogs: [...document.querySelectorAll('[role=dialog]')].map((e) =>
              e.getAttribute('aria-label'),
            ),
          })),
        ),
    )
  process.exitCode = 1
} finally {
  await writeFile(path.join(output, 'gallery.json'), JSON.stringify({ checks, errors }, null, 2))
  await browser?.close()
  await new Promise((resolve) => adminServer.close(resolve))
  if (server.exitCode === null) {
    if (process.platform === 'win32')
      spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
      })
    else server.kill('SIGTERM')
  }
}
