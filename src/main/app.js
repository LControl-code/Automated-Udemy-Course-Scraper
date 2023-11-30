import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import accessFreeCourseWebsite from '../services/accessFreeCourseWebsite.js'
import extractLinks from '../services/extractLinks.js';
import extractInformation from '../services/extractInformation.js';
import enrollIntoCourse from '../services/enrollIntoCourse.js'
import setCookies from '../services/setCookies.js'
import checkoutCourse from '../services/checkoutCourse.js'
import findNewCourses from '../services/findNewCourses.js'

puppeteer.use(StealthPlugin());

export const browser = await puppeteer.launch({
  headless: 'new',
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

let courses = newLinks.map(link => {
  let course = new Course();
  course.findmycourseLink = link;
  return course;
});

await Promise.all(courses.map(async (course) => {
  await extractInformation(course);
}));

const tempCookiePage = await browser.newPage();
await tempCookiePage.setViewport({
  width: 1920,
  height: 1080,
});
await setCookies(tempCookiePage);

console.log(`\n--------------------------\nEnrolling into ${courses.length} courses\n--------------------------`);


const results = await Promise.all(courses.map(async (course) => {
  return await enrollIntoCourse(course);
}));


for (const result of results) {
  if (result) {
    await checkoutCourse(result);
  }
}

const endTime = new Date();
const executionTime = endTime - startTime;

console.log(`Program completed in ${(executionTime / 1000).toFixed(2)}s`);

await browser.close();