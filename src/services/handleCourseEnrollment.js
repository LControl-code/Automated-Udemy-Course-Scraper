import { bringPageToFront, getPageTitle } from '../helperServices/pageHelpers.js';
import { waitForUrl } from '../helperServices/navigationHelpers.js';
import { logEnrollmentStatus } from '../helperServices/loggingHelpers.js';
import { clickButton } from '../helperServices/buttonClickHelpers.js';
import { checkCourses } from './extractInformation.js';
import { createNewPageAndGoToLink } from '../helperServices/pageHelpers.js';

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
  const { courseId, couponCode } = course;
  const pageLink = `https://www.udemy.com/payment/checkout/express/course/${courseId}/?discountCode=${couponCode}`

  const checkoutPage = await createNewPageAndGoToLink(pageLink);

  const pageTitle = await getPageTitle(checkoutPage);

  await clickButtonWithEnvCheck(checkoutPage, pageTitle, 'CHECKOUT_BUTTON');

  await waitForUrl(checkoutPage, "https://www.udemy.com/cart/success/");

  await checkoutPage.close();

}