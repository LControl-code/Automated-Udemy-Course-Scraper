import { bringPageToFront, getPageTitle } from '../helperServices/pageHelpers.js';
import { waitForUrl } from '../helperServices/navigationHelpers.js';
import { logEnrollmentStatus } from '../helperServices/loggingHelpers.js';
import { clickButton } from '../helperServices/buttonClickHelpers.js';
import { wait } from '../helperServices/utilityHelpers.js';

const WAIT_TIME_MS = 1500;

async function clickButtonWithEnvCheck(page, pageTitle, envVar, buttonToClick) {
  const buttonSelector = process.env[envVar];
  if (!buttonSelector) {
    console.error(`Error: ${envVar} environment variable is not set`);
    throw new Error(`${envVar} environment variable is not set`);
  }
  await clickButton(page, pageTitle, buttonSelector, buttonToClick);
}

async function logEnrollmentStatusAndClosePageIfOpen(page, url, pageTitle, isPageClosed) {
  if (!page) {
    console.error("Error: page is not defined:", pageTitle);
    return;
  }

  await logEnrollmentStatus(url, pageTitle);
  if (page && !isPageClosed) {
    await page.close();
  }
}

export default async function handleCourseEnrollment(courseResult) {
  const { page, buttonToClick } = courseResult;
  let isPageClosed = false;

  try {
    await bringPageToFront(page);
    const pageTitle = await getPageTitle(page);

    await wait(WAIT_TIME_MS);
    await clickButtonWithEnvCheck(page, pageTitle, 'BUY_BUTTON', buttonToClick);

    await wait(WAIT_TIME_MS);
    await clickButtonWithEnvCheck(page, pageTitle, 'CHECKOUT_BUTTON');

    const url = await waitForUrl(page, "https://www.udemy.com/cart/success/");
    await logEnrollmentStatusAndClosePageIfOpen(page, url, pageTitle, isPageClosed);

    isPageClosed = true;
  } catch (error) {
    console.log(error.message);
    await logEnrollmentStatusAndClosePageIfOpen(page, null, null, isPageClosed);
    return;
  }
}