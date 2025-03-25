import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Logs into Udemy and saves the cookies to a file.
 * Navigates to the Udemy login page, enters the email and password, and submits the form.
 * Saves the cookies to 'data/cookies.json'.
 * @param {Object} page - The Puppeteer page object.
 * @returns {Promise<void>}
 */
async function login (page) {
  await page.goto('https://www.udemy.com/join/login-popup/')

  await page.waitForSelector('#form-group--1')
  await page.type('#form-group--1', process.env.EMAIL)
  await new Promise((resolve) => setTimeout(resolve, 500))

  await page.waitForSelector('#form-group--3')
  await page.type('#form-group--3', process.env.PASSWORD)

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('form[data-disable-loader="true"] > button[type="submit"]')
  ])

  const cookies = await page.cookies()
  fs.writeFileSync('data/cookies.json', JSON.stringify(cookies))

  console.log('New cookies written from Log in')
}

/**
 * Checks if the user is logged in to Udemy.
 * Navigates to the Udemy login page and checks the current URL.
 * If the user is not logged in, it calls the login function.
 * @param {Object} page - The Puppeteer page object.
 * @returns {Promise<void>}
 */
async function checkLogin (page) {
  await page.goto('https://www.udemy.com/join/login-popup/')

  const currentUrl = page.url()
  if (currentUrl === 'https://www.udemy.com/') {
    console.log('Logged in')
  } else {
    console.log('Not logged in')
    await login(page)
  }
}

/**
 * Sets the cookies for the Puppeteer page.
 * Reads the cookies from 'data/cookies.json' and sets them on the page.
 * If no cookies are found, it calls the login function to generate new cookies.
 * Also writes the cookies as a string to 'data/cookiesString.txt'.
 * @param {Object} page - The Puppeteer page object.
 * @returns {Promise<void>}
 */
export default async function setCookies (page) {
  const cookiesFilePath = 'data/cookies.json'
  const cookiesStringFilePath = 'data/cookiesString.txt'
  if (!fs.existsSync(cookiesFilePath)) {
    console.log('No cookies found - logging in')
    await login(page)
  }

  console.log('Checking Log in')

  const cookies = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf8'))
  const cookieString = cookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')
  fs.writeFileSync(cookiesStringFilePath, cookieString)

  await page.setCookie(...cookies)

  await checkLogin(page)
}
