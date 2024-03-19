import axios from 'axios'
import axiosRetry from 'axios-retry'
import fs from 'fs/promises'
import dotenv from 'dotenv'
import path from 'path'
import { writeLog } from '../helperServices/loggingHelpers.js'
import {
  addBreadcrumb,
  captureException,
  startTransaction
} from '@sentry/node'
dotenv.config()

axiosRetry(axios, {
  retries: 3,
  retryCondition: (error) => {
    console.error('Error:', error.message)
    return (
      error.code === 'EAI_AGAIN' ||
      axiosRetry.isNetworkOrIdempotentRequestError(error)
    )
  },
  retryDelay: (retryCount) => {
    console.log(`Retry attempt #${retryCount}`)
    return retryCount * 1000
  }
})

export default async function shouldScrape () {
  const transaction = startTransaction({
    op: 'shouldScrape',
    name: 'Check for updates'
  })

  try {
    const url = process.env.BACKEND_URL_POLLING_IP

    const span = transaction.startChild({
      op: 'getETag',
      description: 'Getting ETag'
    })
    const eTagFilePath = path.resolve('data', 'eTag.json')
    const eTag = await getETag(eTagFilePath)

    addBreadcrumb({
      category: 'shouldScrape',
      message: 'Checking for updates',
      level: 'info',
      data: {
        backendUrl: url,
        savedETag: eTag || '(No ETag)'
      }
    })

    span.finish()

    const span2 = transaction.startChild({
      op: 'checkForUpdates',
      description: 'Checking for updates'
    })
    const newETag = await checkForUpdates(url, eTag).catch((error) => {
      captureException(error)
      return null
    })
    span2.finish()

    addBreadcrumb({
      category: 'checkForUpdates',
      message: 'Fetched new ETag',
      level: 'info',
      data: {
        newETag: newETag || eTag + '(No updates)'
      }
    })

    if (newETag === null) {
      return false
    }

    const span3 = transaction.startChild({
      op: 'writeLog',
      description: 'Writing new ETag to log'
    })
    await writeLog(
      eTagFilePath,
      JSON.stringify({ eTag: newETag }, null, 2),
      'r'
    )
    span3.finish()

    return true
  } catch (error) {
    captureException(error)
    throw error
  } finally {
    transaction.finish()
  }
}

async function getETag (eTagFilePath) {
  const transaction = startTransaction({
    op: 'getETag',
    name: 'Fetch ETag'
  })

  try {
    const span = transaction.startChild({
      op: 'fs.access',
      description: 'Accessing ETag file'
    })
    await fs.access(eTagFilePath)
    span.finish()
  } catch (error) {
    captureException(error)
    await writeLog(eTagFilePath, JSON.stringify({ eTag: '' }, null, 2), 'r')
    console.error('Error: eTag.json file not found. Creating new file.')
  }

  let eTagData = { eTag: '' }
  const span2 = transaction.startChild({
    op: 'fs.readFile',
    description: 'Reading ETag file'
  })
  const fileContent = await fs.readFile(eTagFilePath, 'utf8')
  span2.finish()

  if (fileContent) {
    eTagData = JSON.parse(fileContent)
  }

  addBreadcrumb({
    category: 'getETag',
    message: 'Fetched ETag',
    level: 'info',
    data: {
      eTag: eTagData.eTag
    }
  })

  transaction.finish()
  return eTagData.eTag
}

async function checkForUpdates (url, oldETag) {
  const transaction = startTransaction({
    op: 'checkForUpdates',
    name: 'Check for updates'
  })

  try {
    const span = transaction.startChild({
      op: 'axios.head',
      description: 'Sending HEAD request'
    })
    const response = await axios.head(url, {
      headers: {
        'If-None-Match': oldETag,
        Host: 'findmycourse-backend.findmycourse.in'
      },
      validateStatus: function (status) {
        return (status >= 200 && status < 300) || status === 304
      }
    })
    span.finish()

    addBreadcrumb({
      category: 'checkForUpdates',
      message: 'Received response',
      level: 'info',
      data: {
        status: response.status,
        headers: response.headers
      }
    })

    if (response.status === 200) {
      const newETag = response.headers.etag
      return newETag
    }
    return null
  } catch (error) {
    console.error('Error:', error.message)
    error.message = 'Error in checkForUpdates: ' + error.message
    captureException(error)
    throw new Error(error)
  } finally {
    transaction.finish()
  }
}
