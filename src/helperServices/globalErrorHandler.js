import fs from 'fs'
import * as Sentry from '@sentry/node'

/**
 * Logs the error to a file and clears the previous run site list.
 * Also captures the exception using Sentry.
 * @param {Error} error - The error to log and clear.
 */
function logAndClear (error) {
  const date = new Date()
  const formattedDate = date.toLocaleString('en-GB')
  const [datePart, timePart] = formattedDate.split(', ')
  const formattedDatePart = datePart.replace(/\//g, '.')
  const errorMessage = `\n${timePart} - ${formattedDatePart} - Error: ${error.stack}\n`

  fs.appendFileSync('logs/error.log', errorMessage)
  fs.writeFileSync('data/previousRunSiteList.json', '')

  Sentry.captureException(error)
}

/**
 * Handles uncaught exceptions and unhandled rejections.
 * Logs the error and clears the previous run site list.
 * Also captures the exception using Sentry.
 */
export function handleUncaughtErrors () {
  process.on('uncaughtException', (err) => {
    console.error('There was an uncaught error', err)
    logAndClear(err)
    throw err
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
    logAndClear(reason)
  })
}

/**
 * Wraps a function with error handling.
 * Logs the error and clears the previous run site list if an error occurs.
 * Also captures the exception using Sentry.
 * @param {Function} fn - The function to wrap with error handling.
 * @returns {Function} The wrapped function.
 */
export function withErrorHandling (fn) {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (error) {
      logAndClear(error)
      throw error
    }
  }
}
