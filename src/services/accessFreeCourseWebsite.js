import { browser } from '../main/scrapeSite.js';

/**
 * Accesses the free course website.
 * If a page is already open, it uses that page; otherwise, it opens a new page.
 * Navigates to the 'https://findmycourse.in/' website.
 * @returns {Promise<Object>} The Puppeteer page object.
 */
export default async function accessFreeCourseWebsite() {
  let page = (await browser.pages())[0];
  if (!page) {
    page = await browser.newPage();
  }
  await page.goto('https://findmycourse.in/', { waitUntil: 'networkidle2', timeout: 60000 })
  return page
}
