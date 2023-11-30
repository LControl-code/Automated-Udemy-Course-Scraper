import chalk from 'chalk'
export default async function checkoutCourse(result) {
  const { page, buttonToClick } = result;

  await page.bringToFront();

  const pageTitle = (await page.title()).split('|')[0].trim();

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const buttonSelector = 'div[data-purpose="sidebar-container"]  button[data-purpose="buy-this-course-button"]';
  await page.waitForSelector(buttonSelector);
  await buttonToClick.click();

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const checkoutButtonSelector = "button.checkout-button--checkout-button--button--1S-XD"
  await page.waitForSelector(checkoutButtonSelector);
  await page.click(checkoutButtonSelector);

  console.log(chalk.white.bgGreen("+ Enrolled:", pageTitle));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await page.close();
}
