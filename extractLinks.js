export default async function extractLinks(page) {
  const links = await page.$$eval('a', anchors => {
    return anchors
      .map(anchor => anchor.href)
      .filter(link => link.startsWith('https://findmycourse.in/course/'));
  });

  return links;
}