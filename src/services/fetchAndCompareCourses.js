import fs from 'fs';
import fetch from 'node-fetch';
import { addBreadcrumb, captureException, startTransaction } from '@sentry/node';

function readPreviousLinks() {
  if (!fs.existsSync('data/previousRunSiteList.json')) {
    return [];
  }

  const previousLinksData = fs.readFileSync('data/previousRunSiteList.json', 'utf8');
  return previousLinksData ? JSON.parse(previousLinksData) : [];
}

function findNewLinks(currentLinks, previousLinks) {
  return currentLinks.filter(link => !previousLinks.includes(link));
}

function writeCurrentLinks(currentLinks) {
  fs.writeFileSync('data/previousRunSiteList.json', JSON.stringify(currentLinks, null, 2));
}

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
    const data = await response.json();
    span.finish();

    const span2 = transaction.startChild({
      op: 'compareCourses',
      description: 'Comparing new and existing courses'
    });

    const newCourses = data.courses.filter(course => !existingLinks.includes(course.courseLink))
      .map(course => {
        let courseCoupon = '';
        if (course.courseLink) {
          courseCoupon = course.courseLink.split('=').pop();
        }
        return { ...course, courseCoupon };
      });
    span2.finish();

    const allLinks = data.courses.map(course => course.courseLink);
    writeCurrentLinks(allLinks);

    addBreadcrumb({
      category: 'fetchAndCompareCourses',
      message: 'Courses fetched and compared',
      level: 'info',
      data: {
        newCourses: newCourses,
      },
    });

    if (newCourses.length === 0) {
      return;
    }

    return newCourses;
  } catch (error) {
    captureException(error);
    transaction.setStatus('error');
    throw error;
  } finally {
    transaction.finish();
  }
}