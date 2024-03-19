import { browser } from '../main/scrapeSite.js'

export async function getBrowserInstance () {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      defaultViewport: {
        width: 1920,
        height: 1080
      },

      timeout: 100000
    })
  }
  return browser
}

export async function closeBrowserInstance () {
  if (browser) {
    await browser.close()
    browser = null
  }
}
