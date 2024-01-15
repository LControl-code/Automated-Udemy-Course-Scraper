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