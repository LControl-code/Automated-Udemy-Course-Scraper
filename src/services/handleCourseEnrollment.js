import { bringPageToFront, getPageTitle, createNewPageAndGoToLink } from '../helperServices/pageHelpers.js';
import { waitForUrl } from '../helperServices/navigationHelpers.js';
import { logEnrollmentStatus } from '../helperServices/loggingHelpers.js';
import { clickButton } from '../helperServices/buttonClickHelpers.js';
import { Mutex } from 'async-mutex';

const mutex = new Mutex();

export async function clickButtonWithEnvCheck(page, pageTitle, envVar, buttonToClick) {
  const buttonSelector = process.env[envVar];
  if (!buttonSelector) {
    console.error(`Error: ${envVar} environment variable is not set`);
    throw new Error(`${envVar} environment variable is not set`);
  }
  await clickButton(page, pageTitle, buttonSelector, buttonToClick);
}

export async function logEnrollmentStatusAndClosePageIfOpen(page, url, pageTitle, isPageClosed) {
  if (!page) {
    console.error("Error: page is not defined:", pageTitle);
    return;
  }

  await logEnrollmentStatus(url, pageTitle);
  if (page && !isPageClosed) {
    await page.close();
  }
}

export async function handleCourseEnrollment(courseResult) {
  const { page, buttonToClick } = courseResult;
  let isPageClosed = false;

  try {
    await bringPageToFront(page);
    const pageTitle = await getPageTitle(page);

    await clickButtonWithEnvCheck(page, pageTitle, 'BUY_BUTTON', buttonToClick);
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

export default async function checkoutCourse(course) {
  const { id, coupon } = course;
  const pageLink = `https://www.udemy.com/payment/checkout/express/course/${id}/?discountCode=${coupon}`

  let checkoutPage = null;
  const release = await mutex.acquire();
  try {
    checkoutPage = await createNewPageAndGoToLink(pageLink);
    const pageTitle = await getPageTitle(checkoutPage);

    await bringPageToFront(checkoutPage);
    await new Promise(resolve => setTimeout(resolve, 750));
    await clickButtonWithEnvCheck(checkoutPage, pageTitle, 'CHECKOUT_BUTTON');
    await waitForUrl(checkoutPage, "https://www.udemy.com/cart/success/");
  } finally {
    release();
  }


  await checkoutPage.close();

}