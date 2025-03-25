/**
 * Waits for the page URL to include the specified URL.
 * @param {Object} page - The Puppeteer page object.
 * @param {string} url - The URL to wait for.
 * @returns {Promise<string>} The current page URL.
 */
export async function waitForUrl(page, url) {
  try {
    await page.waitForFunction(
      (expectedUrl) => window.location.href.includes(expectedUrl),
      {},
      url
    );
    return page.url();
  } catch (error) {
    console.error(`Failed to wait for URL: ${url}`, error);
    return page.url();
  }
}

/**
 * Waits for the page URL to change from the original URL.
 * @param {Object} page - The Puppeteer page object.
 * @param {string} originalUrl - The original URL to wait for a change from.
 * @returns {Promise<boolean|Array>} True if the URL changed, or an array with the original and current URLs if it didn't change within the timeout.
 */
export async function waitForUrlChange(page, originalUrl) {
  try {
    await page.waitForFunction(
      (oldUrl) => window.location.href !== oldUrl,
      { timeout: 5000 },
      originalUrl
    );
  } catch (error) {
    console.error(`Failed to wait for URL change from: ${originalUrl} to a different URL within 5 seconds. \nCurrent URL: ${page.url()}`, error);
    return [originalUrl, page.url()];
  }
  return true;
}
