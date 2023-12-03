import { browser } from '../main/scrapeSite.js'

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


