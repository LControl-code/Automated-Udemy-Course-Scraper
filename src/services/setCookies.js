// setCookiesUdemy.js
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

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
