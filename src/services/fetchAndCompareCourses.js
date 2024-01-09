import fs from 'fs';
import fetch from 'node-fetch';

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
  fs.writeFileSync('data/previousRunSiteList.json', JSON.stringify(currentLinks));
}


// export default function findNewCourses(currentLinks) {
//   const previousLinks = readPreviousLinks();
//   const newLinks = findNewLinks(currentLinks, previousLinks);

//   if (newLinks.length > 0) {
//     writeCurrentLinks(currentLinks);
//   }

//   return newLinks;
// }

export default async function fetchAndCompareCourses() {
  const existingLinks = readPreviousLinks();
  const response = await fetch('https://findmycourse-backend.findmycourse.in/all');
  const data = await response.json();

  const newCourses = data.courses.filter(course => !existingLinks.includes(course.courseLink))
    .map(course => {
      const courseCoupon = course.courseLink.split('=').pop();
      return { ...course, courseCoupon };
    });

  const allLinks = data.courses.map(course => course.courseLink);
  writeCurrentLinks(allLinks);

  if (newCourses.length === 0) {
    console.log('No new courses found');
    return;
  }

  return newCourses;
}