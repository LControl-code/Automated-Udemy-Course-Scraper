import chalk from 'chalk'

async function bringPageToFront(page) {
  await page.bringToFront();
}

async function clickBuyButton(page, pageTitle, buttonToClick) {
  try {
    const buttonSelector = 'div[data-purpose="sidebar-container"]  button[data-purpose="buy-this-course-button"]';
    await page.waitForSelector(buttonSelector);
    await buttonToClick.click();
  } catch (error) {
    console.log(chalk.bgRed("* Timeout exceeded:", pageTitle));
    await page.close();
    return false;
  }
  return true;
}

async function clickCheckoutButton(page, pageTitle) {
  try {
    const checkoutButtonSelector = "button.checkout-button--checkout-button--button--1S-XD"
    await page.waitForSelector(checkoutButtonSelector);
    await page.click(checkoutButtonSelector);
  } catch (error) {
    console.log(chalk.bgRed("* Timeout exceeded:", pageTitle));
    await page.close();
    return false;
  }
  return true;
}

export default async function checkoutCourse(result) {
  const { page, buttonToClick } = result;

  await bringPageToFront(page);

  const pageTitle = (await page.title()).split('|')[0].trim();

  await new Promise((resolve) => setTimeout(resolve, 1500));

  await clickBuyButton(page, pageTitle, buttonToClick);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (await clickCheckoutButton(page, pageTitle)) {
    console.log(chalk.white.bgGreen("+ Enrolled:", pageTitle));
  }
}
