// Description: Main file for the application. This file is responsible for the main flow of the application.
import { handleUncaughtErrors } from '../helperServices/globalErrorHandler.js';
handleUncaughtErrors();

// Importing external libraries
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { addBreadcrumb, captureException, captureMessage, startTransaction } from '@sentry/node';


// Importing services
import { checkCourses, checkEnrollment } from '../services/extractInformation.js';
import setCookies from '../services/setCookies.js'
import checkoutCourse from '../services/handleCourseEnrollment.js'
import fetchAndCompareCourses from '../services/fetchAndCompareCourses.js'

puppeteer.use(StealthPlugin());

export let browser;

async function getBrowserInstance() {
  try {
    if (!browser) {
      addBreadcrumb({
        category: 'browser',
        message: 'Launching new browser instance',
        level: 'info',
      });

      browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: {
          width: 1920,
          height: 1080,
        },
        timeout: 200000,
      });

      addBreadcrumb({
        category: 'browser',
        message: 'New browser instance launched',
        level: 'info',
      });
    }
    return browser;
  } catch (error) {
    captureException(error);
    throw error;
  }
}

async function closeBrowserInstance() {
  try {
    if (browser) {
      addBreadcrumb({
        category: 'browser',
        message: 'Closing browser instance',
        level: 'info',
      });

      await browser.close();
      browser = null;

      addBreadcrumb({
        category: 'browser',
        message: 'Browser instance closed',
        level: 'info',
      });
    }
  } catch (error) {
    captureException(error);
    throw error;
  }
}

export default async function scrapeSite() {
  const transaction = startTransaction({
    op: 'task',
    name: 'Scrape site',
  });

  try {
    const browser = await getBrowserInstance();

    addBreadcrumb({
      category: 'browser',
      message: 'Browser instance obtained',
      level: 'info',
    });

    const startTime = new Date();

    const courses = await fetchAndCompareCourses();

    if (!courses) {
      console.log('No new courses found');
      await closeBrowserInstance();
      return;
    }

    const tempCookiePage = await browser.newPage();
    await tempCookiePage.setViewport({
      width: 1920,
      height: 1080,
    });
    await setCookies(tempCookiePage);
    if (tempCookiePage) {
      await tempCookiePage.close();
    }

    addBreadcrumb({
      category: 'browser',
      message: 'Cookies set and temporary page closed',
      level: 'info',
    });

    // Extract Udemy IDs and coupon codes from the courses array
    const courseData = courses.map(course => ({
      id: course.udemyCourseId,
      coupon: course.courseCoupon
    }));

    addBreadcrumb({
      category: 'shouldScrape',
      message: 'Course IDs and coupon codes extracted',
      level: 'info',
      data: {
        courseData: courseData || "No course data found",
      },
    });

    // Pass the Udemy IDs and coupon codes to the checkCourses function
    const freeCourses = await checkCourses(courseData);

    addBreadcrumb({
      category: 'shouldScrape',
      message: 'Free courses checked',
      level: 'info',
      data: {
        freeCourses: freeCourses || "No courses found",
      },
    });

    if (!freeCourses || freeCourses?.length === 0) {
      console.log('No new courses found');
      await closeBrowserInstance();
      return;
    }

    // Check enrollment for all courses concurrently
    const enrollmentStatuses = await Promise.all(freeCourses.map(course => checkEnrollment(course)));

    // Filter out already enrolled courses
    const notEnrolledCourses = freeCourses.filter((course, index) => !enrollmentStatuses[index]);

    // Filter the courses array to include only the courses that are also in notEnrolledCourses
    const coursesToEnroll = courses.filter(course =>
      notEnrolledCourses.some(notEnrolledCourse => notEnrolledCourse.id === course.udemyCourseId)
    );

    addBreadcrumb({
      category: 'shouldScrape',
      message: 'Not enrolled and free courses filtered',
      level: 'info',
      data: {
        coursesToEnroll: coursesToEnroll || "No courses found",
      },
    });

    if (!coursesToEnroll || coursesToEnroll?.length === 0) {
      console.log('No new courses found');
      await closeBrowserInstance();
      return;
    }


    await Promise.all(coursesToEnroll.map(checkoutCourse));


    const endTime = new Date();
    const executionTime = endTime - startTime;

    console.log(`Enrollment completed in ${(executionTime / 1000).toFixed(2)}s`);

    await closeBrowserInstance();

    captureMessage('ScrapeSite ran successfully');
  } catch (error) {
    console.error('An error occurred while scraping the site:', error);
    captureException(error);
    throw error;
  } finally {
    transaction.finish();
  }
}