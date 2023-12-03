import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { writeLog } from '../helperServices/loggingHelpers.js';

export default async function shouldScrape() {
  const url = process.env.BACKEND_URL_POLLING;
  const eTagFilePath = path.resolve('data', 'eTag.json')

  if (!fs.existsSync(eTagFilePath)) {
    await writeLog(eTagFilePath, JSON.stringify({ eTag: '' }), 'r');
  }

  let eTagData = { eTag: '' };
  const fileContent = fs.readFileSync(eTagFilePath, 'utf8');
  if (fileContent) {
    eTagData = JSON.parse(fileContent);
  }

  const response = await axios.get(url);
  const currentEtag = response.headers['etag'];
  if (currentEtag !== eTagData.eTag) {
    await writeLog(eTagFilePath, JSON.stringify({ eTag: currentEtag }), 'r');
  }
  return currentEtag !== eTagData.eTag;
}
