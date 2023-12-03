// Description: Main file for the application. This file is responsible for the main flow of the application.
import { handleUncaughtErrors, withErrorHandling } from '../helperServices/globalErrorHandler.js';
handleUncaughtErrors();

// Importing external libraries
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';


// Importing services
import accessFreeCourseWebsiteOriginal from '../services/accessFreeCourseWebsite.js'
import extractLinksOriginal from '../services/extractLinks.js';
import extractInformationOriginal from '../services/extractInformation.js';
import enrollIntoCourseOriginal from '../services/enrollIntoCourse.js'
import setCookiesOriginal from '../services/setCookies.js'
import handleCourseEnrollmentOriginal from '../services/handleCourseEnrollment.js'
import findNewCoursesOriginal from '../services/findNewCourses.js'

function wrapWithErrorHandler(functions) {
  return functions.map(fn => withErrorHandling(fn));
}

const [
  accessFreeCourseWebsite,
  extractLinks,
  extractInformation,
  enrollIntoCourse,
  setCookies,
  handleCourseEnrollment,
  findNewCourses,
] = wrapWithErrorHandler([
  accessFreeCourseWebsiteOriginal,
  extractLinksOriginal,
  extractInformationOriginal,
  enrollIntoCourseOriginal,
  setCookiesOriginal,
  handleCourseEnrollmentOriginal,
  findNewCoursesOriginal
]);

puppeteer.use(StealthPlugin());

export let browser;

async function initializeBrowser() {
  browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });
}

export default async function scrapeSite() {
  if (!browser) {
    await initializeBrowser();
  }

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

  const links = await extractLinks(page);

  const newLinks = await findNewCourses(links);

  if (newLinks.length === 0) {
    await browser.close();
    console.log(`No new courses found`);
    return;
  }


  const courses = newLinks.map(link => {
    const course = new Course();
    course.findmycourseLink = link;
    return course;
  });


  await Promise.all(courses.map(extractInformation));


  const tempCookiePage = await browser.newPage();
  await tempCookiePage.setViewport({
    width: 1920,
    height: 1080,
  });
  await setCookies(tempCookiePage);
  if (tempCookiePage) {
    await tempCookiePage.close();
  }


  const enrollmentResults = await Promise.all(courses.map(enrollIntoCourse));

  for (const enrollmentResult of enrollmentResults) {
    if (enrollmentResult != null) {
      await handleCourseEnrollment(enrollmentResult);
    }
  }


  const endTime = new Date();
  const executionTime = endTime - startTime;

  console.log(`Enrollment completed in ${(executionTime / 1000).toFixed(2)}s`);

  await browser.close();

}