export async function waitForUrl(page, url) {
  await page.waitForNavigation({ url: new RegExp(`^${url}`) });
  return page.url();
}