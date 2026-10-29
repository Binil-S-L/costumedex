import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotDir = join(__dirname, 'screenshots');
mkdirSync(screenshotDir, { recursive: true });

const BRAVE = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const BASE_URL = 'http://localhost:4173'; // vite preview

const VIEWPORTS = [
  { name: 'iPhone-SE-375x667',    width: 375, height: 667  },
  { name: 'iPhone-14-390x844',    width: 390, height: 844  },
  { name: 'iPhone-14Plus-430x932',width: 430, height: 932  },
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: BRAVE,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  });

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2, isMobile: true });

    // Stub getUserMedia
    await page.evaluateOnNewDocument(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = 'rgba(0,255,136,0.4)';
      ctx.font = '28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TEST SPECIMEN', 320, 240);
      const stream = canvas.captureStream(0);
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        writable: true, value: async () => stream
      });
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 });

    // Boot screen shot
    await page.waitForSelector('.bootScreen', { timeout: 5000 });
    await page.screenshot({ path: `${screenshotDir}/boot-${vp.name}.png` });
    console.log(`✓ boot-${vp.name}.png`);

    // Wait for camera view
    await page.waitForSelector('.cameraView', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: `${screenshotDir}/camera-${vp.name}.png` });
    console.log(`✓ camera-${vp.name}.png`);

    // Open history (press Enter = Start)
    await page.keyboard.press('Enter');
    await page.waitForSelector('.dexHistory', { timeout: 3000 });
    await page.screenshot({ path: `${screenshotDir}/history-${vp.name}.png` });
    console.log(`✓ history-${vp.name}.png`);

    await page.close();
  }

  await browser.close();
  console.log('\nAll screenshots saved to tests/screenshots/');
}

run().catch(e => { console.error(e); process.exit(1); });
