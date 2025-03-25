import chalk from 'chalk'

/**
 * Clicks a button on the page.
 * Waits for the button to be available and then clicks it.
 * @param {Object} page - The Puppeteer page object.
 * @param {string} pageTitle - The title of the page.
 * @param {string} buttonSelector - The selector for the button to click.
 * @param {Object} [buttonToClick] - The button element to click (optional).
 * @throws {Error} If the button click fails.
 */
export async function clickButton(page, pageTitle, buttonSelector, buttonToClick) {
  try {
    await page.waitForSelector(buttonSelector);
    await page.waitForFunction(
      (selector) => {
        const button = document.querySelector(selector);
        return button && !button.disabled && getComputedStyle(button).display !== 'none';
      },
      { timeout: 5000 },
      buttonSelector
    );
    if (buttonToClick) {
      await buttonToClick.click();
    } else {
      await page.click(buttonSelector);
    }
  } catch (error) {
    console.log(chalk.bgRed("* Click Error:", pageTitle));
    throw new Error(`Failed to click button: ${pageTitle}`);
  }
}
