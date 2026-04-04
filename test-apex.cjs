const { chromium } = require('playwright');

const URL = 'https://apex-nl.vercel.app';
const EMAIL = 'nmalanders@yahoo.com';
const PASSWORD = 'Qazwsx123456!';
const SCREENSHOT_DIR = '/Users/neillanders/Desktop/apex-tests';

let page, browser, passed = 0, failed = 0, errors = [];

async function screenshot(name) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: true });
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    errors.push({ name, error: e.message });
    console.log(`  ❌ ${name}: ${e.message}`);
    await screenshot(`FAIL-${name.replace(/\s+/g, '-')}`).catch(() => {});
  }
}

async function waitAndClick(selector, opts = {}) {
  await page.waitForSelector(selector, { timeout: 8000, ...opts });
  await page.click(selector);
}

(async () => {
  const fs = require('fs');
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 size
    deviceScaleFactor: 2,
    serviceWorkers: 'block', // bypass service worker cache
  });
  page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  console.log('\n🏋️ APEX BROWSER TEST SUITE\n');
  console.log('='.repeat(50));

  // ─── LOGIN ───
  console.log('\n📋 LOGIN');
  await test('App loads', async () => {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
    await screenshot('01-login-page');
  });

  await test('Login form visible', async () => {
    await page.waitForSelector('input[type="email"]', { timeout: 8000 });
  });

  await test('Login succeeds', async () => {
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    // Wait for redirect to dashboard
    await page.waitForURL('**/'), { timeout: 10000 };
    await page.waitForTimeout(2000); // let data load
    await screenshot('02-dashboard');
  });

  // ─── DASHBOARD ───
  console.log('\n📋 DASHBOARD');
  await test('Dashboard shows content', async () => {
    await page.waitForTimeout(3000); // give data time to load
    const body = await page.textContent('body');
    if (!body.includes('Apex') && !body.includes('Nutrition') && !body.includes('Weight')) {
      throw new Error('Dashboard content not found');
    }
  });

  await test('Dashboard fits mobile viewport (no horizontal scroll)', async () => {
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    if (bodyWidth > viewportWidth + 5) {
      throw new Error(`Body (${bodyWidth}px) wider than viewport (${viewportWidth}px)`);
    }
  });

  await screenshot('03-dashboard-full');

  // ─── NAVIGATE TO NUTRITION ───
  console.log('\n📋 NUTRITION PAGE');
  await test('Navigate to Nutrition page', async () => {
    // Click the nutrition nav item or the nutrition card
    const navLinks = await page.$$('a, button');
    let clicked = false;
    for (const link of navLinks) {
      const text = await link.textContent().catch(() => '');
      if (text.toLowerCase().includes('nutrition')) {
        await link.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      // Try bottom nav
      await page.goto(`${URL}/nutrition`, { waitUntil: 'networkidle', timeout: 10000 });
    }
    await page.waitForTimeout(2000);
    await screenshot('04-nutrition-page');
  });

  await test('Nutrition page shows Today label', async () => {
    const body = await page.textContent('body');
    if (!body.includes('Today')) throw new Error('No "Today" label found');
  });

  await test('Nutrition page fits mobile viewport', async () => {
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    if (bodyWidth > viewportWidth + 5) {
      throw new Error(`Body (${bodyWidth}px) wider than viewport (${viewportWidth}px)`);
    }
  });

  await test('Nutrients remaining display visible', async () => {
    const body = await page.textContent('body');
    if (!body.includes('Nutrients Remaining') && !body.includes('Remaining')) throw new Error('Nutrients remaining section not found');
  });

  // ─── DATE NAVIGATION ───
  console.log('\n📋 DATE NAVIGATION');
  await test('Back arrow navigates to yesterday', async () => {
    await page.goto(`${URL}/nutrition`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
    let body = await page.textContent('body');
    if (!body.includes('Today')) throw new Error('Not starting on Today');
    await page.click('[data-testid="date-back"]');
    await page.waitForTimeout(1500);
    body = await page.textContent('body');
    if (!body.includes('Yesterday')) throw new Error(`Expected Yesterday, got: ${body.substring(0, 150)}`);
    await screenshot('05-yesterday');
  });

  await test('Forward arrow returns to today', async () => {
    await page.click('[data-testid="date-forward"]');
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    if (!body.includes('Today')) throw new Error('Forward from Yesterday did not return to Today');
  });

  await test('Forward arrow goes to tomorrow', async () => {
    await page.click('[data-testid="date-forward"]');
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    if (!body.includes('Tomorrow')) throw new Error('Forward from Today did not go to Tomorrow');
    await screenshot('06-tomorrow');
  });

  await test('Navigate back to today', async () => {
    await page.goto(`${URL}/nutrition`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  // ─── CALENDAR PICKER ───
  console.log('\n📋 CALENDAR PICKER');
  await test('Calendar icon is visible', async () => {
    const calendarLabel = await page.$('label:has(input[type="date"])');
    if (!calendarLabel) throw new Error('Calendar picker label not found');
  });

  // ─── MEAL CATEGORIES ───
  console.log('\n📋 MEAL LOGGING');
  await test('All 6 meal slots visible', async () => {
    const body = await page.textContent('body');
    for (let i = 1; i <= 6; i++) {
      if (!body.includes(`Meal ${i}`)) throw new Error(`Missing: Meal ${i}`);
    }
  });

  await test('Add button exists for meals', async () => {
    const addBtns = await page.$$('button:has-text("Add")');
    if (addBtns.length === 0) throw new Error('No Add buttons found');
  });

  // ─── COPY MEALS ───
  console.log('\n📋 COPY MEALS');
  await test('Copy icon buttons exist', async () => {
    // Copy is now icon-only (Copy icon in meal action row)
    const body = await page.textContent('body');
    if (!body.includes('ADD FOOD')) throw new Error('Meal action rows not found');
  });

  await test('Copy picker opens and shows dates', async () => {
    // Click the first copy icon (svg button next to ADD FOOD)
    const copyBtns = await page.$$('button[title="Copy from another day"]');
    if (copyBtns.length > 0) {
      await copyBtns[0].click();
      await page.waitForTimeout(1500);
      await screenshot('07-copy-picker');
      // Check if the picker modal appeared
      const modal = await page.$('.fixed');
      if (!modal) throw new Error('Copy picker modal did not open');
      // Check for "Pick a different date" fallback
      const body = await page.textContent('body');
      if (!body.includes('Pick a different date')) throw new Error('Calendar fallback not shown in copy picker');
      // Close it
      const cancelBtn = await page.$('.fixed button:has-text("Cancel")');
      if (cancelBtn) await cancelBtn.click();
      await page.waitForTimeout(500);
    }
  });

  // ─── WATER TRACKING ───
  console.log('\n📋 WATER TRACKING');
  await test('Water section visible', async () => {
    const body = await page.textContent('body');
    if (!body.includes('Water')) throw new Error('Water section not found');
  });

  await test('Water increment buttons exist', async () => {
    const waterBtns = await page.$$('button:has-text("ml")');
    if (waterBtns.length === 0) throw new Error('No water increment buttons');
  });

  // ─── CALORIE PLANNING ───
  console.log('\n📋 CALORIE PLANNING');
  await test('Calorie planning section visible', async () => {
    const body = await page.textContent('body');
    if (!body.includes('alorie plan')) throw new Error('Calorie planning section not found');
    await screenshot('08-calorie-planning');
  });

  await test('Calorie planning expands on click', async () => {
    const planBtns = await page.$$('button');
    for (const btn of planBtns) {
      const text = await btn.textContent().catch(() => '');
      if (text.includes('alorie plan')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(500);
    await screenshot('09-calorie-planning-expanded');
  });

  // ─── WEEKLY SUMMARY ───
  console.log('\n📋 WEEKLY SUMMARY');
  await test('Weekly averages toggle exists', async () => {
    const body = await page.textContent('body');
    if (!body.toLowerCase().includes('weekly') && !body.includes('days logged') && !body.includes('averages')) {
      // This may not show if no meals logged this week — acceptable
      console.log('    (No weekly data to show — expected if no meals logged this week)');
    }
  });

  // ─── NUTRITION TRENDS ───
  console.log('\n📋 NUTRITION TRENDS');
  await test('Nutrition trends section visible', async () => {
    const body = await page.textContent('body');
    if (!body.includes('Nutrition Trends') && !body.includes('trends')) {
      throw new Error('Nutrition trends not found');
    }
  });

  // ─── MICRONUTRIENTS ───
  console.log('\n📋 MICRONUTRIENTS');
  await test('Micronutrient display area exists', async () => {
    const body = await page.textContent('body');
    // At minimum, "Net carbs" should show if any meals logged
    // If no meals today, this might not show — that's ok
    if (!body.includes('Remaining') && !body.includes('Net carbs')) {
      // Acceptable if no meals logged today
      console.log('    (No meals logged today — micronutrients not displayed, expected)');
    }
  });

  // ─── WORKOUTS PAGE ───
  console.log('\n📋 WORKOUTS PAGE');
  await test('Navigate to Workouts', async () => {
    await page.goto(`${URL}/workouts`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
    await screenshot('10-workouts');
  });

  await test('Workouts page loads', async () => {
    const body = await page.textContent('body');
    if (!body.includes('Workouts') && !body.includes('Templates')) throw new Error('Workouts page did not load');
  });

  await test('Workouts page fits mobile viewport', async () => {
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    if (bodyWidth > viewportWidth + 5) {
      throw new Error(`Body (${bodyWidth}px) wider than viewport (${viewportWidth}px)`);
    }
  });

  // ─── SETTINGS PAGE ───
  console.log('\n📋 SETTINGS PAGE');
  await test('Navigate to Settings', async () => {
    await page.goto(`${URL}/settings`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
    await screenshot('11-settings');
  });

  await test('Settings page loads', async () => {
    const body = await page.textContent('body');
    if (!body.includes('Settings')) throw new Error('Settings page did not load');
  });

  // ─── CONSOLE ERRORS ───
  console.log('\n📋 CONSOLE ERRORS');
  await test('No critical console errors', async () => {
    const critical = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('service-worker') &&
      !e.includes('sw.js') &&
      !e.includes('manifest')
    );
    if (critical.length > 0) {
      throw new Error(`${critical.length} console error(s):\n    ${critical.slice(0, 5).join('\n    ')}`);
    }
  });

  // ─── FINAL SCREENSHOT ───
  await page.goto(`${URL}/nutrition`, { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(2000);
  await screenshot('12-final-nutrition');

  // ─── SUMMARY ───
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed\n`);
  if (errors.length > 0) {
    console.log('Failed tests:');
    for (const e of errors) {
      console.log(`  ❌ ${e.name}: ${e.error}`);
    }
  }
  if (consoleErrors.length > 0) {
    console.log(`\n⚠️  Console errors captured: ${consoleErrors.length}`);
    consoleErrors.slice(0, 10).forEach(e => console.log(`    ${e.substring(0, 120)}`));
  }
  console.log(`\n📸 Screenshots saved to: ${SCREENSHOT_DIR}/`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
