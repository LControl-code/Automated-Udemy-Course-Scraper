import axios from 'axios';
import axiosRetry from 'axios-retry';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';
import { writeLog } from '../helperServices/loggingHelpers.js';
dotenv.config();

axiosRetry(axios, {
  retries: 3,
  retryCondition: (error) => {
    console.error('Error:', error.message);
    return error.code === 'EAI_AGAIN' || axiosRetry.isNetworkOrIdempotentRequestError(error);
  },
  retryDelay: (retryCount) => {
    console.log(`Retry attempt #${retryCount}`);
    return retryCount * 1000;
  },
});

export default async function shouldScrape() {
  const url = process.env.BACKEND_URL_POLLING_IP;
  const eTagFilePath = path.resolve('data', 'eTag.json');
  const eTag = await getETag(eTagFilePath);

  const newETag = await checkForUpdates(url, eTag);
  if (newETag === null) {
    return false;
  }

  await writeLog(eTagFilePath, JSON.stringify({ eTag: newETag }), 'r');
  return true
}

async function getETag(eTagFilePath) {
  try {
    await fs.access(eTagFilePath);
  } catch (error) {
    await writeLog(eTagFilePath, JSON.stringify({ eTag: '' }), 'r');
    console.error('Error: eTag.json file not found. Creating new file.');
  }

  let eTagData = { eTag: '' };
  const fileContent = await fs.readFile(eTagFilePath, 'utf8');
  if (fileContent) {
    eTagData = JSON.parse(fileContent);
  }

  return eTagData.eTag;
}

async function checkForUpdates(url, oldETag) {
  try {
    const response = await axios.head(url, {
      headers: {
        'If-None-Match': oldETag,
        'Host': 'findmycourse-backend.findmycourse.in'
      },
      validateStatus: function (status) {
        return (status >= 200 && status < 300) || status === 304;
      },
    });

    if (response.status === 200) {
      // Update your stored ETag
      const newETag = response.headers.etag;
      return newETag;
    }
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error(error)
  }
  return null;
}

