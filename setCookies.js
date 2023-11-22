// setCookiesUdemy.js
import fs from 'fs';
import dotenv from 'dotenv'

dotenv.config();

async function login(page) {
  await page.goto('https://www.udemy.com/join/login-popup/');

  // Wait for the username field to appear
  await page.waitForSelector('#form-group--1');
  await page.type('#form-group--1', process.env.EMAIL);
  await new Promise((resolve) => setTimeout(resolve, 500));

  await page.waitForSelector('#form-group--3');
  await page.type('#form-group--3', process.env.PASSWORD);

  // Click the login button
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('form[data-disable-loader="true"] > button[type="submit"]'),
  ]);

  // Now you are logged in
  // Get cookies and save them to a file
  const cookies = await page.cookies();
  fs.writeFileSync('./cookies.json', JSON.stringify(cookies));

  console.log("New cookies written from Log in")
}

async function checkLogin(page) {
  // Navigate to the login page
  await page.goto('https://www.udemy.com/join/login-popup/');

  // Check if the page redirects to the Udemy homepage
  const currentUrl = page.url();
  if (currentUrl === 'https://www.udemy.com/') {
    console.log("Logged in");

  } else {
    console.log("Not logged in");
    await login(page);
  }
  await page.close()
}


export default async function setCookies(page) {
  // Check if the cookies file exists

  const cookiesFilePath = './cookies.json';
  if (!fs.existsSync(cookiesFilePath)) {
    console.log("No cookies found - logging in")

    await login(page);
  }

  console.log("Checking Log in")

  // Read cookies from file and set them in the page
  const cookies = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf8'));
  await page.setCookie(...cookies);

  await checkLogin(page);
}

