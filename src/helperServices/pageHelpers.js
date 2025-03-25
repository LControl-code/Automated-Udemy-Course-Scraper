import chalk from 'chalk'

import { browser } from '../main/scrapeSite.js'

/**
 * Logs the button text and updates the course status based on the button text.
 * @param {string} buttonText - The text of the button.
 * @param {Object} course - The course object.
 */
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

/**
 * Logs the link being checked.
 * @param {string} link - The link being checked.
 */
export function logCheckingLink(link) {
  console.log(chalk.blue("Checking:", link || "No Udemy link found"));
}

/**
 * Creates a new page and navigates to the specified link.
 * @param {string} link - The link to navigate to.
 * @returns {Promise<Object>} The Puppeteer page object.
 */
export async function createNewPageAndGoToLink(link) {
  const page = await browser.newPage();
  await page.goto(link);
  return page;
}

/**
 * Retrieves the title of the page.
 * @param {Object} page - The Puppeteer page object.
 * @returns {Promise<string>} The title of the page.
 */
export async function getPageTitle(page) {
  const title = await page.title();
  const pageTitle = title.split('| Udemy')[0].trim();
  return pageTitle;
}

/**
 * Checks if the button is available on the page.
 * @param {Object} buttonToClick - The button element to check.
 * @param {string} pageTitle - The title of the page.
 * @returns {boolean} True if the button is available, false otherwise.
 */
export function isButtonAvailable(buttonToClick, pageTitle) {
  if (!buttonToClick) {
    console.log(chalk.bgRed("* Failed:", pageTitle));
    return false;
  }
  return true;
}

/**
 * Retrieves the text content of the button.
 * @param {Object} page - The Puppeteer page object.
 * @param {Object} buttonToClick - The button element to get the text from.
 * @returns {Promise<string>} The text content of the button.
 */
export async function getButtonText(page, buttonToClick) {
  return await page.evaluate(element => element.textContent, buttonToClick);
}

/**
 * Retrieves the button element to click on the page.
 * @param {Object} page - The Puppeteer page object.
 * @param {string} pageTitle - The title of the page.
 * @returns {Promise<Object|null>} The button element, or null if not found.
 */
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

/**
 * Brings the page to the front.
 * @param {Object} page - The Puppeteer page object.
 * @returns {Promise<void>}
 */
export async function bringPageToFront(page) {
  await page.bringToFront();
}
