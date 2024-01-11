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

// Check if courses are still free
export async function checkCourses(courseData) {
  const transaction = startTransaction({ op: 'checkCourses', name: 'Check if courses are still free' });

  try {
    const cookieString = fs.readFileSync('data/cookiesString.txt', 'utf8')

    const span1 = transaction.startChild({ op: 'extractCourseInfo', description: 'Extract course IDs and coupon codes' });
    const courseIds = courseData.map(course => course.id);
    const couponCodes = courseData.map(course => course.coupon);
    span1.finish();

    const urlPriceCheck = `https://www.udemy.com/api-2.0/pricing/?course_ids=${courseIds.join(',')}&fields[pricing_result]=price,price_detail&discountCode=${couponCodes.join(',')}`

    addBreadcrumb({
      category: 'Course Validation',
      message: 'Initiating check for free courses',
      level: 'info',
      data: {
        totalCoursesChecked: courseIds.length,
        courseIds: courseIds,
        couponCodes: couponCodes,
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
        receivedData: JSON.stringify(data, null, 2),
      },
    });

    const span3 = transaction.startChild({ op: 'findFreeCourses', description: 'Find free courses in the response data' });
    const freeCourses = Object.entries(data.courses)
      .filter(([, course]) => course.price['amount'] === 0 && course.price['price_string'] === 'Free')
      .map(([id]) => courseData.find(course => course.id === Number(id)));
    span3.finish();

    addBreadcrumb({
      category: 'Course Validation',
      message: `Completed check for free courses. Found ${freeCourses.length} free courses.`,
      level: 'info',
      data: {
        totalFreeCourses: freeCourses.length,
        freeCourseIds: freeCourses.map(course => course.id),
      },
    });

    if (freeCourses.length === 0) {
      return null;
    }

    return freeCourses;
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

  try {

    addBreadcrumb({
      category: 'Course Enrollment Check',
      message: `Initiating enrollment check for course with ID: ${course.id}`,
      level: 'info',
      data: {
        courseId: course.id,
        couponCode: course.coupon,
      },
    });

    const cookieString = fs.readFileSync('data/cookiesString.txt', 'utf8')

    addBreadcrumb({
      category: 'HTTP Request',
      message: `Sending request to redeem coupon for course with ID: ${course.id}`,
      level: 'info',
      data: {
        courseId: course.id,
        requestUrl: `https://www.udemy.com/api-2.0/course-landing-components/${course.id}/me/?components=redeem_coupon`,
      },
    });

    const span1 = transaction.startChild({ op: 'checkCourseEnrollment', description: 'Make HTTP request to check course enrollment and parse response' });
    const response = await fetch(`https://www.udemy.com/api-2.0/course-landing-components/${course.id}/me/?components=redeem_coupon`, {
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
      message: `Completed enrollment check for course with ID: ${course.id}. ${hasAlreadyPurchased ? 'Course already purchased.' : 'Course not purchased yet.'}`,
      level: 'info',
      data: {
        courseId: course.id,
        couponCode: course.coupon,
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