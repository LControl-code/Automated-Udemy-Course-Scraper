import { browser } from '../main/scrapeSite.js'
import fs from 'fs';
import fetch from 'node-fetch';
import { addBreadcrumb, captureException, startTransaction } from '@sentry/node';

export default async function extractInformation(course) {
  const link = course.findmycourseLink;
  const newPage = await browser.newPage();
  await newPage.goto(link);

  const udemyLink = await newPage.$$eval('a', anchors => {
    const link = anchors
      .map(anchor => anchor.href)
      .find(link => link.startsWith('https://www.udemy.com/course/'));
    return link;
  });
  course.udemyLink = udemyLink;

  await newPage.close();

}

/**
 * Checks if the provided courses are still free.
 * 
 * This function performs the following steps:
 * 1. Starts a transaction for the operation.
 * 2. Reads the cookie string from a file.
 * 3. Extracts the course IDs and coupon codes from the provided courses.
 * 4. Constructs the URL for the price check API.
 * 5. Makes an HTTP request to the price check API and parses the response.
 * 6. Finds the free courses in the response data.
 * 7. Updates the `debug.isFree` property of the free courses.
 * 8. Returns the free courses.
 * 
 * @param {Array} courses - The courses to check.
 * @returns {Promise<Array>} An array of free courses, or undefined if there are no free courses.
 * @throws {Error} If there is an error during the operation.
 */
export async function checkCourses(courses) {
  const transaction = startTransaction({ op: 'checkCourses', name: 'Check if courses are still free' });

  try {
    const cookieString = fs.readFileSync('data/cookiesString.txt', 'utf8')

    const span1 = transaction.startChild({ op: 'extractCourseInfo', description: 'Extract course IDs and coupon codes' });

    const coursesData = {
      id: courses.map(course => course.udemyCourseId),
      coupon: courses.map(course => course.couponCode),
    }
    span1.finish();

    const urlPriceCheck = `https://www.udemy.com/api-2.0/pricing/?course_ids=${coursesData.id.join(',')}&fields[pricing_result]=price,price_detail&discountCode=${coursesData.coupon.join(',')}`

    addBreadcrumb({
      category: 'Course Validation',
      message: 'Initiating check for free courses',
      level: 'info',
      data: {
        totalCoursesChecked: coursesData.id.length,
        courseIds: coursesData.id,
        couponCodes: coursesData.coupon,
        apiEndpoint: urlPriceCheck,
      },
    });

    const span2 = transaction.startChild({ op: 'checkCoursePrices', description: 'Make HTTP request to check course prices and parse response' });
    const response = await fetch(urlPriceCheck, {
      headers: {
        'Cookie': cookieString
      }
    });
    const data = await response.json();
    span2.finish();

    addBreadcrumb({
      category: 'checkCourses',
      message: 'Received data from API',
      level: 'info',
      data: {
        receivedData: JSON.stringify(data, null, 2) || "No data received",
      },
    });

    const span3 = transaction.startChild({ op: 'findFreeCourses', description: 'Find free courses in the response data' });

    let freeCourses;
    if (data && data.courses) {
      freeCourses = Object.entries(data.courses)
        .filter(([, course]) => course.price['amount'] === 0 && course.price['price_string'] === 'Free')
        .map(([id]) => courses.find(course => course.udemyCourseId === Number(id)));
    }
    if (!freeCourses || freeCourses?.length === 0) {
      addBreadcrumb({
        category: 'Course Validation',
        message: 'No free courses found',
        level: 'info',
      });
      return;
    }

    const freeCourseIds = freeCourses.map(course => Number(course.udemyCourseId));
    const filteredCourses = courses.filter(course => freeCourseIds.includes(Number(course.udemyCourseId)));
    courses.forEach(course => {
      if (freeCourseIds.includes(course.udemyCourseId)) {
        course.debug.isFree = true;
      }
    });

    span3.finish();

    addBreadcrumb({
      category: 'Course Validation',
      message: `Completed check for free courses. Found ${filteredCourses.length} free courses.`,
      level: 'info',
      data: {
        totalFreeCourses: filteredCourses.length,
        freeCourseIds: JSON.stringify(freeCourseIds, null, 2),
        freeCourses: JSON.stringify(filteredCourses, null, 2),
        freeCoursesData: JSON.stringify(freeCourses, null, 2),
      },
    });



    return filteredCourses;
  } catch (error) {
    captureException(error);
    throw error;
  } finally {
    transaction.finish();
  }
};

// Check if a user is enrolled in a course
export async function checkEnrollment(course) {
  const transaction = startTransaction({ op: 'checkEnrollment', name: 'Check course enrollment' });

  const courseId = course.udemyCourseId;
  const couponCode = course.couponCode;

  try {
    addBreadcrumb({
      category: 'Course Enrollment Check',
      message: `Initiating enrollment check for course with ID: ${courseId}`,
      level: 'info',
      data: {
        courseId: courseId,
        couponCode: couponCode,
      },
    });

    const cookieString = fs.readFileSync('data/cookiesString.txt', 'utf8')

    addBreadcrumb({
      category: 'HTTP Request',
      message: `Sending request to redeem coupon for course with ID: ${courseId}`,
      level: 'info',
      data: {
        courseId: courseId,
        requestUrl: `https://www.udemy.com/api-2.0/course-landing-components/${courseId}/me/?components=redeem_coupon`,
      },
    });

    const span1 = transaction.startChild({ op: 'checkCourseEnrollment', description: 'Make HTTP request to check course enrollment and parse response' });
    const response = await fetch(`https://www.udemy.com/api-2.0/course-landing-components/${courseId}/me/?components=redeem_coupon`, {
      headers: {
        'Cookie': cookieString
      }
    });

    const data = await response.json();
    span1.finish();

    const span2 = transaction.startChild({ op: 'checkPurchaseStatus', description: 'Check if course has already been purchased' });
    const hasAlreadyPurchased = data?.redeem_coupon?.has_already_purchased;
    span2.finish();

    addBreadcrumb({
      category: 'Course Enrollment Check',
      message: `Completed enrollment check for course with ID: ${courseId}. ${hasAlreadyPurchased ? 'Course already purchased.' : 'Course not purchased yet.'}`,
      level: 'info',
      data: {
        courseId: courseId,
        couponCode: couponCode,
        hasAlreadyPurchased: hasAlreadyPurchased,
      },
    });

    return hasAlreadyPurchased;
  } catch (error) {
    captureException(error);
    throw error;
  } finally {
    transaction.finish();
  }
};