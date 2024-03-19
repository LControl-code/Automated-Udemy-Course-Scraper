import chalk from 'chalk'

export async function clickButton (
  page,
  pageTitle,
  buttonSelector,
  buttonToClick
) {
  try {
    await page.waitForSelector(buttonSelector)
    await page.waitForFunction(
      (selector) => {
        const button = document.querySelector(selector)
        return (
          button &&
          !button.disabled &&
          getComputedStyle(button).display !== 'none'
        )
      },
      { timeout: 5000 },
      buttonSelector
    )
    if (buttonToClick) {
      await buttonToClick.click()
    } else {
      await page.click(buttonSelector)
    }
  } catch (error) {
    console.log(chalk.bgRed('* Click Error:', pageTitle))
    throw new Error(`Failed to click button: ${pageTitle}`)
  }
}
