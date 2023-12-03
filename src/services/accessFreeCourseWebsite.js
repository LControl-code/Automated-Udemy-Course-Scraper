import { browser } from '../main/scrapeSite.js';

export default async function accessFreeCourseWebsite() {
  const page = (await browser.pages())[0];
  await page.goto('https://findmycourse.in/', { waitUntil: 'networkidle2', timeout: 60000 })
  return page
}