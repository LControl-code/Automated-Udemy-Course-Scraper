import fs from 'fs';

export default function findNewCourses(currentLinks) {
  let newLinks = [];

  if (fs.existsSync('previousRunSiteList.json')) {
    const previousLinks = JSON.parse(fs.readFileSync('previousRunSiteList.json', 'utf8'));

    newLinks = currentLinks.filter(link => !previousLinks.includes(link));
    if (newLinks.length > 0) {
      fs.writeFileSync('previousRunSiteList.json', JSON.stringify(currentLinks));
    }
  } else {
    fs.writeFileSync('previousRunSiteList.json', JSON.stringify(currentLinks));
    newLinks = currentLinks;
  }

  return newLinks;
}
