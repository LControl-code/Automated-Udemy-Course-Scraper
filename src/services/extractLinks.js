export default async function extractLinks(page) {
  await page.waitForSelector('a[href^="/course/"]');

  const links = await page.$$eval('a', anchors => {
    return anchors
      .map(anchor => anchor.href)
      .filter(link => link.startsWith('https://findmycourse.in/course/'));
  });

  console.log(links, 'Course links');

  return links;
}