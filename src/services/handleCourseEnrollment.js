import { bringPageToFront, getPageTitle, createNewPageAndGoToLink } from '../helperServices/pageHelpers.js';
import { waitForUrl, waitForUrlChange } from '../helperServices/navigationHelpers.js';
import { logEnrollmentStatus } from '../helperServices/loggingHelpers.js';
import { clickButton } from '../helperServices/buttonClickHelpers.js';
import { Mutex } from 'async-mutex';
import { addBreadcrumb } from '@sentry/node';

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
  let pageUrl = null;
  const release = await mutex.acquire();
  try {
    checkoutPage = await createNewPageAndGoToLink(pageLink);
    pageUrl = checkoutPage.url();

    await bringPageToFront(checkoutPage);
    await new Promise(resolve => setTimeout(resolve, 750));
    await clickButtonWithEnvCheck(checkoutPage, course, 'CHECKOUT_BUTTON');
    await new Promise(resolve => setTimeout(resolve, 250));
  } finally {
    release();
  }
  const resultPage = await waitForUrlChange(checkoutPage, pageUrl);
  if (resultPage !== true) {
    addBreadcrumb({
      category: 'checkout',
      message: `Checkout redirect took too long. Error in pages: ${resultPage}`,
      level: 'warning',
    });
    console.error("Error: checkout redirect took too long", resultPage);
  }

  await checkoutPage.close();
}