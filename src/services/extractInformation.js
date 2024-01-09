import { browser } from '../main/scrapeSite.js'
import fs, { cp } from 'fs';
import fetch from 'node-fetch';

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
export async function checkCourses(courseIds, couponCodes) {
  const cookieString = fs.readFileSync('data/cookiesString.txt', 'utf8')
  const response = await fetch(`https://www.udemy.com/api-2.0/pricing/?course_ids=${courseIds.join(',')}&fields[pricing_result]=price,price_detail&discountCode=${couponCodes.join(',')}`, {
    headers: {
      'Cookie': cookieString
    }
  });

  const data = await response.json();

  console.log(data)

  const freeCourses = Object.entries(data.courses)
    .filter(([, course]) => course.price.amount === 0 && course.price.price_string === 'Free')
    .map(([id], index) => ({ courseId: id, couponCode: couponCodes[index] }));

  if (freeCourses.length === 0) {
    console.log('No free courses found.');
    return null;
  }

  return freeCourses;
};

// Check if a user is enrolled in a course
export async function checkEnrollment(courseId) {
  const cookieString = fs.readFileSync('data/cookiesString.txt', 'utf8')
  const response = await fetch(`https://www.udemy.com/api-2.0/course-landing-components/${courseId}/me/?components=redeem_coupon`, {
    headers: {
      'Cookie': cookieString
    }
  });

  const data = await response.json();

  console.log(data)

  return data?.redeem_coupon?.has_already_purchased;
};

// await checkEnrollment('5577250').then((result) => { console.log(result) })

await checkCourses(['5578468'], ['C5365D12E1725BAD4DAC']).then((result) => { console.log(result) })
