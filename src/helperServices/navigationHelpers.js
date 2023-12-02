export async function waitForUrl(page, url) {
  try {
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

    await page.waitForFunction(
      (expectedUrl) => window.location.href.includes(expectedUrl),
      {},
      url
    );

    return page.url();
  } catch (error) {
    console.error(`Failed to wait for URL: ${url}`, error);
    throw error;
  }
}