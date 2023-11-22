import { browser } from './app.js';

export default async function accessFreeCourseWebsite() {
  const page = (await browser.pages())[0];
  await page.goto('https://findmycourse.in/')
  return page
}