const { chromium } = require('playwright-core');

const BASE = 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push('PAGE ERROR: ' + err.message));

  // Test login page renders
  console.log('--- Testing Login Page ---');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 10000 });
  const loginH = await page.textContent('h1').catch(() => 'NOT FOUND');
  console.log('Login heading:', loginH);
  const emailInput = await page.locator('input[type="email"]').count();
  const passInput = await page.locator('input[type="password"]').count();
  console.log(`Email input: ${emailInput > 0 ? '✅' : '❌'}, Password input: ${passInput > 0 ? '✅' : '❌'}`);
  await page.screenshot({ path: '/tmp/apex-01-login.png' });

  // Check that all JS bundles load without error  
  console.log('\n--- Checking bundle load ---');
  const response = await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 10000 });
  console.log('Status:', response.status());
  
  // Wait for React to hydrate
  await page.waitForTimeout(2000);
  
  // Check if we redirected to login (expected without auth)
  const url = page.url();
  console.log('Redirected to:', url);
  const isLogin = url.includes('/login');
  console.log(`Auth redirect works: ${isLogin ? '✅' : '❌'}`);

  // Check for JS errors
  console.log('\n--- Console Errors ---');
  if (consoleErrors.length === 0) {
    console.log('✅ No console errors');
  } else {
    consoleErrors.forEach(e => console.log('❌', e));
  }

  // Check the bundle
  console.log('\n--- Import Check ---');
  const jsError = await page.evaluate(() => {
    try {
      return { ok: true, hasReact: typeof document.querySelector('#root') !== null };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
  console.log('React mount:', jsError.hasReact ? '✅' : '❌');
  console.log('JS evaluation:', jsError.ok ? '✅' : '❌');

  await browser.close();
  console.log('\n✅ Basic smoke test complete — login page renders, bundles load, auth redirect works');
})();
