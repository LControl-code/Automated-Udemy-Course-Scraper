import { browser } from '../main/app.js'
import chalk from 'chalk'

export default async function enrollIntoCourse(course) {
  const link = course.udemyLink;
  logCheckingLink(link);
  if (!link) { return null; }

  const page = await createNewPageAndGoToLink(link);

  const pageTitle = await getPageTitle(page);
  const buttonToClick = await getButtonToClick(page, pageTitle);
  course.name = pageTitle;


  if (!isButtonAvailable(buttonToClick, pageTitle)) {
    await page.close();
    return null;
  }

  const buttonText = await getButtonText(page, buttonToClick);
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

function logCheckingLink(link) {
  console.log(chalk.blue("Checking:", link || "No Udemy link found"));
}

async function createNewPageAndGoToLink(link) {
  const page = await browser.newPage();
  await page.goto(link);
  return page;
}

async function getPageTitle(page) {
  return (await page.title()).split('|')[0].trim();
}

function isButtonAvailable(buttonToClick, pageTitle) {
  if (!buttonToClick) {
    console.log(chalk.bgRed("* Failed:", pageTitle));
    return false;
  }
  return true;
}

async function getButtonText(page, buttonToClick) {
  return await page.evaluate(element => element.textContent, buttonToClick);
}

async function getButtonToClick(page, pageTitle) {
  const buttonSelector = 'div[data-purpose="sidebar-container"]  button[data-purpose="buy-this-course-button"]';
  try {
    await page.waitForSelector(buttonSelector, { timeout: 6000 });
    return await page.$(buttonSelector);
  } catch (error) {
    console.log(chalk.bgRed("* Timeout exceeded:", pageTitle));
    await page.close();
  }
}