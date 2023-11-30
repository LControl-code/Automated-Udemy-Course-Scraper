import fs from 'fs';

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


export default function findNewCourses(currentLinks) {
  const previousLinks = readPreviousLinks();
  const newLinks = findNewLinks(currentLinks, previousLinks);

  if (newLinks.length > 0) {
    writeCurrentLinks(currentLinks);
  }

  return newLinks;
}