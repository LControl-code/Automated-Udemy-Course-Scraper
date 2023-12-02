// Description: Main file for the application. This file is responsible for the main flow of the application.

process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});


// Importing external libraries
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Importing services
import accessFreeCourseWebsite from '../services/accessFreeCourseWebsite.js'
import extractLinks from '../services/extractLinks.js';
import extractInformation from '../services/extractInformation.js';
import enrollIntoCourse from '../services/enrollIntoCourse.js'
import setCookies from '../services/setCookies.js'
import handleCourseEnrollment from '../services/handleCourseEnrollment.js'
import findNewCourses from '../services/findNewCourses.js'

puppeteer.use(StealthPlugin());
export const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: {
    width: 1920,
    height: 1080,
  },
});

class Course {
  name = '';
  status = '';
  udemyLink = '';
  findmycourseLink = '';
  description = '';
  price = '';
  rating = '';
  lengthInHours = '';
}

const startTime = new Date();

const page = await accessFreeCourseWebsite()

console.log(`--------------------------\nAccessing free courses website\n--------------------------`);
const links = await extractLinks(page);

const newLinks = findNewCourses(links);

console.log(`--------------------------\nFound ${newLinks.length} new courses\n--------------------------\n`);

if (newLinks.length === 0) {
  await browser.close();
  process.exit(0);
}

const courses = newLinks.map(link => {
  const course = new Course();
  course.findmycourseLink = link;
  return course;
});

try {
  await Promise.all(courses.map(extractInformation));
} catch (error) {
  console.error('An error occurred during information extraction:', error.message);
}

let tempCookiePage;
try {
  tempCookiePage = await browser.newPage();
  await tempCookiePage.setViewport({
    width: 1920,
    height: 1080,
  });
  await setCookies(tempCookiePage);
} catch (error) {
  console.error('An error occurred while setting up cookies:', error.message);
} finally {
  if (tempCookiePage) {
    await tempCookiePage.close();
  }
}


console.log(`\n--------------------------\nEnrolling into ${courses.length} courses\n--------------------------`);


try {
  const enrollmentResults = await Promise.all(courses.map(enrollIntoCourse));

  for (const enrollmentResult of enrollmentResults) {
    if (enrollmentResult != null) {
      await handleCourseEnrollment(enrollmentResult);
    }
  }
} catch (error) {
  console.error('An error occurred during enrollment:', error.message);
}

const endTime = new Date();
const executionTime = endTime - startTime;

console.log(`Program completed in ${(executionTime / 1000).toFixed(2)}s`);

await browser.close();