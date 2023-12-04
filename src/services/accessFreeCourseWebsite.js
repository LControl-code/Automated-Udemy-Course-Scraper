import { browser } from '../main/scrapeSite.js';

export default async function accessFreeCourseWebsite() {
  let page = (await browser.pages())[0];
  if (!page) {
    page = await browser.newPage();
  }
  await page.goto('https://findmycourse.in/', { waitUntil: 'networkidle2', timeout: 60000 })
  return page
}