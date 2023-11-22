import { browser } from './app.js'
import chalk from 'chalk'

export default async function enrollIntoCourse(course) {
  const link = course.udemyLink;
  const page = await browser.newPage();
  await page.goto(link);

  const buttonSelector = 'div[data-purpose="sidebar-container"]  button[data-purpose="buy-this-course-button"]';
  await page.waitForSelector(buttonSelector);

  const buttonToClick = await page.$(buttonSelector);
  const pageTitle = (await page.title()).split('|')[0].trim();
  course.name = pageTitle;

  if (!buttonToClick) {
    console.log(chalk.bgRed("* Failed:", pageTitle));
    await page.close();
    return;
  }

  const buttonText = await page.evaluate(element => element.textContent, buttonToClick);
  logButtonText(buttonText, course);

  if (buttonText === "Enroll now") { return { page, buttonToClick }; }
}

function logButtonText(buttonText, course) {
  if (buttonText === "Go to course") {
    console.log(chalk.yellow("= Already enrolled:", course.name));
    course.status = "Enrolled"
  } else if (buttonText === "Enroll now") {
    console.log(chalk.green("~ Ready to enroll:", course.name));
    course.status = "Free"
  } else if (buttonText === "Buy now") {
    console.log(chalk.red("- Too late:", course.name));
    course.status = "Paid"
  } else {
    console.log(chalk.bgRed("* Failed:", pageTitle));
  }
}