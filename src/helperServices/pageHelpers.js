import chalk from 'chalk'

import { browser } from '../main/scrapeSite.js'
export function logButtonText(buttonText, course) {
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

export function logCheckingLink(link) {
  console.log(chalk.blue("Checking:", link || "No Udemy link found"));
}

export async function createNewPageAndGoToLink(link) {
  const page = await browser.newPage();
  await page.goto(link);
  return page;
}

export async function getPageTitle(page) {
  const title = await page.title();
  const pageTitle = title.split('| Udemy')[0].trim();
  return pageTitle;
}

export function isButtonAvailable(buttonToClick, pageTitle) {
  if (!buttonToClick) {
    console.log(chalk.bgRed("* Failed:", pageTitle));
    return false;
  }
  return true;
}

export async function getButtonText(page, buttonToClick) {
  return await page.evaluate(element => element.textContent, buttonToClick);
}

export async function getButtonToClick(page, pageTitle) {
  const buttonSelector = 'div[data-purpose="sidebar-container"]  button[data-purpose="buy-this-course-button"]';
  try {
    await page.waitForSelector(buttonSelector);
    return await page.$(buttonSelector);
  } catch (error) {
    console.log(chalk.bgRed("* Timeout exceeded:", pageTitle));
    return null;
  }
}

export async function bringPageToFront(page) {
  await page.bringToFront();
}

