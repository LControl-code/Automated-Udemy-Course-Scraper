// Description: Main file for the application. This file is responsible for the main flow of the application.
import { handleUncaughtErrors, withErrorHandling } from '../helperServices/globalErrorHandler.js';
handleUncaughtErrors();

// Importing external libraries
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';


// Importing services
// import accessFreeCourseWebsiteOriginal from '../services/accessFreeCourseWebsite.js'
// import extractLinksOriginal from '../services/extractLinks.js';
// import extractInformationOriginal from '../services/extractInformation.js';
// import enrollIntoCourseOriginal from '../services/enrollIntoCourse.js'
// import setCookiesOriginal from '../services/setCookies.js'
// import handleCourseEnrollmentOriginal from '../services/handleCourseEnrollment.js'
// import findNewCoursesOriginal from '../services/findNewCourses.js'

// import accessFreeCourseWebsite from '../services/accessFreeCourseWebsite.js'
// import extractLinks from '../services/extractLinks.js';
import { checkCourses, checkEnrollment } from '../services/extractInformation.js';
// import enrollIntoCourse from '../services/enrollIntoCourse.js'
import setCookies from '../services/setCookies.js'
import checkoutCourse from '../services/handleCourseEnrollment.js'
import fetchAndCompareCourses from '../services/fetchAndCompareCourses.js'
// import { checkEnrollment } from '../services/extractInformation.js';


// function wrapWithErrorHandler(functions) {
//   return functions.map(fn => withErrorHandling(fn));
// }

puppeteer.use(StealthPlugin());

export let browser;

async function getBrowserInstance() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      defaultViewport: {
        width: 1920,
        height: 1080,
      },

      timeout: 200000,
    });
  }
  return browser;
}

async function closeBrowserInstance() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export default async function scrapeSite() {
  const browser = await getBrowserInstance();

  // const [
  //   accessFreeCourseWebsite,
  //   extractLinks,
  //   extractInformation,
  //   enrollIntoCourse,
  //   setCookies,
  //   handleCourseEnrollment,
  //   findNewCourses,
  // ] = wrapWithErrorHandler([
  //   accessFreeCourseWebsiteOriginal,
  //   extractLinksOriginal,
  //   extractInformationOriginal,
  //   enrollIntoCourseOriginal,
  //   setCookiesOriginal,
  //   handleCourseEnrollmentOriginal,
  //   findNewCoursesOriginal
  // ]);

  const startTime = new Date();

  // const page = await accessFreeCourseWebsite(browser)

  // const links = await extractLinks(page);

  // const newLinks = await findNewCourses(links);

  const courses = await fetchAndCompareCourses();


  // await Promise.all(courses.map(extractInformation));


  const tempCookiePage = await browser.newPage();
  await tempCookiePage.setViewport({
    width: 1920,
    height: 1080,
  });
  await setCookies(tempCookiePage);
  if (tempCookiePage) {
    await tempCookiePage.close();
  }

  // Extract Udemy IDs and coupon codes from the courses array
  // console.log(courses);
  const courseIds = courses.map(course => course.udemyCourseId);
  const couponCodes = courses.map(course => course.courseCoupon);

  console.log(courseIds);
  console.log(couponCodes);


  // Pass the Udemy IDs and coupon codes to the checkCourses function
  const freeCourses = await checkCourses(courseIds, couponCodes);

  console.log(freeCourses);

  // Check enrollment for all courses concurrently
  const enrollmentStatuses = await Promise.all(freeCourses.map(course => checkEnrollment(course.courseId)));

  // Filter out already enrolled courses
  const notEnrolledCourses = freeCourses.filter((course, index) => {
    if (enrollmentStatuses[index]) {
      console.log(`You are already enrolled in course ${course.courseId}`);
      return false;
    }
    return true;
  });

  console.log(notEnrolledCourses);

  // const resultCheckoutCourses = await Promise.all(notEnrolledCourses.map(checkoutCourse));

  // const enrollmentResults = await Promise.all(courses.map(enrollIntoCourse));

  // const enrollmentResults = await Promise.all(freeCourseIds.map(checkoutCourse));

  // for (const enrollmentResult of enrollmentResults) {
  //   if (enrollmentResult != null) {
  //     await handleCourseEnrollment(enrollmentResult);
  //   }
  // }


  const endTime = new Date();
  const executionTime = endTime - startTime;

  console.log(`Enrollment completed in ${(executionTime / 1000).toFixed(2)}s`);

  await closeBrowserInstance();

}