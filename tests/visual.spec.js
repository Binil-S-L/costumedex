import { test, expect } from '@playwright/test';

// Stub getUserMedia so tests pass without a real camera
async function stubCamera(page) {
  await page.addInitScript(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = 'rgba(0,255,136,0.3)';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TEST SPECIMEN', 320, 240);
    const stream = canvas.captureStream(0);
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      writable: true,
      value: async () => stream,
    });
  });
}

test.describe('CostumeDex boot & shell', () => {
  test.beforeEach(async ({ page }) => {
    await stubCamera(page);
    await page.goto('/');
  });

  test('boot screen renders on all viewports', async ({ page }, testInfo) => {
    // Boot screen should be visible immediately
    await expect(page.locator('.bootScreen')).toBeVisible({ timeout: 3000 });
    await page.screenshot({
      path: `tests/screenshots/boot-${testInfo.project.name.replace(' ', '-')}.png`,
      fullPage: false,
    });
  });

  test('device shell fills viewport', async ({ page }) => {
    const device = page.locator('.device');
    await expect(device).toBeVisible({ timeout: 3000 });
    const box = await device.boundingBox();
    const vp = page.viewportSize();
    // Device should fill at least 95% of viewport height
    expect(box.height).toBeGreaterThan(vp.height * 0.94);
  });

  test('transitions to camera view after boot', async ({ page }, testInfo) => {
    await page.waitForSelector('.cameraView', { timeout: 12_000 });
    await page.screenshot({
      path: `tests/screenshots/camera-${testInfo.project.name.replace(' ', '-')}.png`,
    });
  });

  test('controls are all visible', async ({ page }) => {
    await page.waitForSelector('.controlPanel', { timeout: 3000 });
    await expect(page.locator('.btnA')).toBeVisible();
    await expect(page.locator('.btnB')).toBeVisible();
    await expect(page.locator('.dpad')).toBeVisible();
  });

  test('mini status screen shows SCANS', async ({ page }) => {
    await expect(page.locator('.miniScreen')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.miniScreen')).toContainText('SCANS');
  });

  test('no horizontal overflow', async ({ page }) => {
    await page.waitForSelector('.device', { timeout: 3000 });
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientW = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollW).toBeLessThanOrEqual(clientW + 2); // 2px tolerance
  });
});

test.describe('DEX history', () => {
  test.beforeEach(async ({ page }) => {
    await stubCamera(page);
    // Seed localStorage with a fake entry
    await page.addInitScript(() => {
      const fakeEntry = {
        id: 1,
        data: {
          species_name: 'The Reluctant Vampire',
          types: ['BASIC', 'STORE-BOUGHT'],
          stats: { creativity: 20, effort: 30, scare_factor: 15, cringe: 80 },
          rarity: 'COMMON',
          weakness: 'Weak to: direct sunlight and follow-up questions',
          description: 'A classic specimen of the Laziness genus. The cape appears store-bought. The fangs are from a party pack.'
        },
        image: '',
        thumbnail: '',
        timestamp: Date.now(),
      };
      localStorage.setItem('costumedex_history', JSON.stringify([fakeEntry]));
    });
    await page.goto('/');
    await page.waitForSelector('.cameraView', { timeout: 12_000 });
  });

  test('Start button opens history grid', async ({ page }, testInfo) => {
    await page.keyboard.press('Enter');
    await expect(page.locator('.dexHistory')).toBeVisible({ timeout: 2000 });
    await page.screenshot({
      path: `tests/screenshots/history-${testInfo.project.name.replace(' ', '-')}.png`,
    });
  });
});
