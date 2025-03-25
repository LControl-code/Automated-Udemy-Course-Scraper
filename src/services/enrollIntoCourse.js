import { logButtonText, logCheckingLink, createNewPageAndGoToLink, getPageTitle, isButtonAvailable, getButtonToClick, getButtonText } from '../helperServices/pageHelpers.js';

/**
 * Enrolls into a course.
 * Logs the link being checked, creates a new page, retrieves the page title and button to click,
 * checks if the button is available, logs the button text, and clicks the "Enroll now" button if available.
 * @param {Object} course - The course object containing the Udemy link.
 * @returns {Promise<Object|null>} The page and button to click if enrollment is possible, otherwise null.
 */
export default async function enrollIntoCourse(course) {
  const link = course.udemyLink;
  logCheckingLink(link);
  if (!link) { return null; }

  const page = await createNewPageAndGoToLink(link);

  const pageTitle = await getPageTitle(page);
  const buttonToClick = await getButtonToClick(page, pageTitle);

  if (!buttonToClick) {
    await page.close();
    return null;
  }

  course.name = pageTitle;

  if (!isButtonAvailable(buttonToClick, pageTitle)) {
    await page.close();
    return null;
  }

  const buttonText = await getButtonText(page, buttonToClick);
  logButtonText(buttonText, course);

  if (buttonText === "Enroll now") { return { page, buttonToClick }; } else {
    await page.close();
    return null;
  }
}
