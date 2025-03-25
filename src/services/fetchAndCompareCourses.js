import fs from 'fs';
import fetch from 'node-fetch';
import { addBreadcrumb, captureException, startTransaction } from '@sentry/node';

/**
 * Reads the previous run site list from a file.
 * @returns {Array} An array of previous links.
 */
function readPreviousLinks() {
  if (!fs.existsSync('data/previousRunSiteList.json')) {
    return [];
  }

  const previousLinksData = fs.readFileSync('data/previousRunSiteList.json', 'utf8');
  return previousLinksData ? JSON.parse(previousLinksData) : [];
}

/**
 * Finds new links by comparing current links with previous links.
 * @param {Array} currentLinks - The current links to compare.
 * @param {Array} previousLinks - The previous links to compare against.
 * @returns {Array} An array of new links.
 */
function findNewLinks(currentLinks, previousLinks) {
  return currentLinks.filter(link => !previousLinks.includes(link));
}

/**
 * Writes the current links to a file.
 * @param {Array} currentLinks - The current links to write.
 */
function writeCurrentLinks(currentLinks) {
  fs.writeFileSync('data/previousRunSiteList.json', JSON.stringify(currentLinks, null, 2));
}

/**
 * Transforms the fetched courses into a desired format.
 * @param {Array} courses - The courses to transform.
 * @returns {Array} An array of transformed courses.
 */
function transformCourses(courses) {
  return courses.map(course => ({
    udemyCourseId: course.udemyCourseId,
    couponCode: course.courseLink?.split('=')[1] || '',
    udemyUrls: {
      courseLink: course.courseLink,
      checkoutLink: `https://www.udemy.com/payment/checkout/express/course/${course.udemyCourseId}/?discountCode=${course.courseLink?.split('=')[1] || ''}`,
    },
    courseInfo: {
      title: course.title,
      description: course.description,
      originalPrice: parseFloat(course.originalPrice.replace(/[^\d.-]/g, '')),
      category: course.category,
      language: course.language,
      createdAt: course.createdAt,
      imageLink: course.imageLink,
    },
    instructor: {
      name: course.instructorName,
      jobTitle: course.instructorJobTitle,
      image: course.instructorImage,
      link: course.instructorLink,
    },
    courseSlug: course.courseSlug,

    debug: {
      isFree: false,
      isEnrolled: false,
      error: {
        status: false,
        message: '',
        stack: '',
      }
    }
  }));
}

/**
 * Fetches and compares courses from a backend service.
 * 
 * This function performs the following steps:
 * 1. Starts a transaction for the operation.
 * 2. Fetches all courses from the backend service.
 * 3. Filters out courses that already exist in the local data.
 * 4. Transforms the fetched courses into a desired format.
 * 5. Adds a breadcrumb for tracking purposes.
 * 6. Returns the new courses.
 * 
 * @returns {Promise<Array>} An array of new courses, or undefined if there are no new courses.
 * @throws {Error} If there is an error fetching the courses from the backend.
 */
export default async function fetchAndCompareCourses() {
  const transaction = startTransaction({
    op: "fetchAndCompareCourses",
    name: "Fetch and compare courses",
  });

  try {
    const span = transaction.startChild({
      op: 'fetchCourses',
      description: 'Fetching courses from backend'
    });
    const existingLinks = readPreviousLinks();
    const response = await fetch('https://findmycourse-backend.findmycourse.in/all');

    if (!response.ok) {
      throw new Error('Could not fetch courses from backend');
    }

    const data = await response.json();
    const fetchedCourses = data.courses.filter(course => !existingLinks.includes(course.courseLink));
    span.finish();

    const span2 = transaction.startChild({
      op: 'compareCourses',
      description: 'Comparing new and existing courses'
    });

    const courses = transformCourses(fetchedCourses);
    span2.finish();

    addBreadcrumb({
      category: 'fetchAndCompareCourses',
      message: 'Courses fetched and compared',
      level: 'info',
      data: {
        newCourses: courses,
      },
    });

    if (courses.length === 0) {
      return;
    }

    return courses;
  } catch (error) {
    captureException(error);
    transaction.setStatus('error');
    throw error;
  } finally {
    transaction.finish();
  }
}
