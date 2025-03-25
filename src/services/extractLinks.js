/**
 * Extracts links from the page.
 * Waits for the links to be available and then extracts them.
 * @param {Object} page - The Puppeteer page object.
 * @returns {Promise<Array<string>>} An array of extracted links.
 */
export default async function extractLinks (page) {
  await page.waitForSelector('a[href^="/course/"]')

  const links = await page.$$eval('a', (anchors) => {
    return anchors
      .map((anchor) => anchor.href)
      .filter((link) => link.startsWith('https://findmycourse.in/course/'))
  })

  return links
}
