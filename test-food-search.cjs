const { chromium } = require('playwright');

const URL = 'https://apex-nl.vercel.app';
const EMAIL = 'nmalanders@yahoo.com';
const PASSWORD = 'Qazwsx123456!';
const DIR = '/Users/neillanders/Desktop/apex-tests';

(async () => {
  const fs = require('fs');
  fs.mkdirSync(DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    serviceWorkers: 'block',
  });
  const page = await context.newPage();

  // Collect console output
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warn') {
      console.log(`  [${msg.type()}] ${msg.text().substring(0, 120)}`);
    }
  });

  // Login
  console.log('Logging in...');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // Go to Nutrition
  await page.goto(`${URL}/nutrition`, { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(2000);

  // Click ADD FOOD on Breakfast
  console.log('Opening meal logger...');
  await page.click('text=ADD FOOD');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${DIR}/food-01-modal.png` });

  // The modal has icon buttons in the header: barcode scanner, search (Q), close (X)
  // Click "Search food database" button or the magnifying glass icon
  console.log('Switching to search view...');
  const searchFoodBtn = await page.$('button:has-text("Search food")');
  if (searchFoodBtn) {
    await searchFoodBtn.click();
  } else {
    // Click the magnifying glass icon in the modal header
    const modalBtns = await page.$$('.fixed button');
    for (const btn of modalBtns) {
      const html = await btn.innerHTML();
      // Look for the search/magnifying glass icon (svg with circle and line)
      if (html.includes('search') || html.includes('Search')) {
        await btn.click();
        break;
      }
    }
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${DIR}/food-02-search-view.png` });

  // Find the search text input
  const searchInput = await page.$('.fixed input[type="text"]');
  if (!searchInput) {
    console.log('ERROR: No search input found after switching to search view');
    // Dump all modal content
    const modalContent = await page.evaluate(() => {
      const m = document.querySelector('.fixed');
      return m ? m.innerHTML.substring(0, 2000) : 'no modal';
    });
    console.log('Modal HTML:', modalContent.substring(0, 500));
    await browser.close();
    return;
  }

  // Test searches
  const searches = ['eggs', 'chicken', 'rice', 'banana', 'oats'];
  for (const term of searches) {
    console.log(`\nSearching: "${term}"...`);
    await searchInput.fill(term);

    // Submit the search — press Enter or click search button
    await searchInput.press('Enter');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${DIR}/food-search-${term}.png` });

    // Get visible results
    const results = await page.evaluate(() => {
      const modal = document.querySelector('.fixed');
      if (!modal) return [];
      // Results are likely buttons with food name + calories
      const btns = modal.querySelectorAll('button');
      return [...btns]
        .filter(b => b.offsetParent !== null && b.textContent.length > 5 && b.textContent.length < 200)
        .map(b => b.textContent.trim().replace(/\s+/g, ' ').substring(0, 100))
        .filter(t => t.includes('cal') || t.includes('g') || t.includes('Protein'))
        .slice(0, 8);
    });

    if (results.length > 0) {
      console.log(`  ✅ Found ${results.length} results:`);
      results.forEach(r => console.log(`     ${r}`));
    } else {
      console.log(`  ❌ No results`);
      // Get full modal text for debugging
      const modalText = await page.evaluate(() => {
        const m = document.querySelector('.fixed');
        return m ? m.textContent.substring(0, 500) : '';
      });
      console.log(`  Modal text: ${modalText.substring(0, 200)}`);
    }
  }

  await browser.close();
  console.log('\nDone.');
})();
