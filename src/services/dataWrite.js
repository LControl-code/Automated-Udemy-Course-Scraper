import fs from "fs";
import { addBreadcrumb } from "@sentry/node";


function readPreviousLinks() {
  if (!fs.existsSync('data/previousRunSiteList.json')) {
    return [];
  }

  const previousLinksData = fs.readFileSync('data/previousRunSiteList.json', 'utf8');
  return previousLinksData ? JSON.parse(previousLinksData) : [];
}


/**
 * Writes the provided courses to a file.
 * 
 * This function performs the following steps:
 * 1. Reads the previous run site list from a file.
 * 2. Filters the provided courses to include only those that are enrolled, or are not free, or do not have an error.
 * 3. Concatenates the filtered courses with the courses from the previous run site list.
 * 4. Slices the first 20 courses from the combined list.
 * 5. Writes the sliced courses to the previous run site list file.
 * 
 * @param {Array} courses - The courses to write.
 * @throws {Error} If there is an error during the operation.
 */
export default async function dataWrite(courses) {
  // Read the previousRunSiteList.json file
  const previousRunSiteList = readPreviousLinks();

  // Filter the courses that are enrolled and free and do not have an error
  const filteredCourses = courses.filter(course => !course.debug.error.status || course.debug.isEnrolled || !course.debug.isFree);

  addBreadcrumb({
    category: 'dataWrite',
    message: 'Filtered courses',
    level: 'info',
    data: {
      filteredCourses: filteredCourses || "No courses found",
    },
  });

  // Concatenate the filtered courses with the courses from previousRunSiteList.json
  const combinedCourses = [...filteredCourses.map(course => course.udemyUrls.courseLink), ...previousRunSiteList];

  addBreadcrumb({
    category: 'dataWrite',
    message: 'Combined courses',
    level: 'info',
    data: {
      length: combinedCourses.length,
      combinedCourses: combinedCourses || "No courses found",
    },
  });

  // Slice the first 20 courses
  const slicedCourses = combinedCourses.slice(0, 20);

  addBreadcrumb({
    category: 'dataWrite',
    message: 'Sliced courses',
    level: 'info',
    data: {
      length: combinedCourses.length,
      slicedCourses: slicedCourses || "No courses found",
    },
  });

  // Write the sliced courses to the previousRunSiteList.json file
  fs.writeFileSync('data/previousRunSiteList.json', JSON.stringify(slicedCourses, null, 2));
}