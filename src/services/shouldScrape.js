import fs from 'fs';
import axios from 'axios';

async function shouldScrape(url, lastEtag) {
  const response = await axios.get(url);
  const currentEtag = response.headers['etag'];

  return currentEtag;
}

console.log(await shouldScrape('https://findmycourse-backend.findmycourse.in/all?page=1'));