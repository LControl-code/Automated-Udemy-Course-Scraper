import { browser } from '../main/scrapeSite.js';

/**
 * Get an instance of the browser.
 * If the browser is not already launched, it launches a new instance.
 * @returns {Promise<Browser>} The browser instance.
 */
export async function getBrowserInstance() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
      timeout: 100000,
    });
  }
  return browser;
}

/**
 * Close the browser instance if it is open.
 * Sets the browser variable to null after closing.
 * @returns {Promise<void>}
 */
export async function closeBrowserInstance() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
