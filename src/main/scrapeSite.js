/**
 * Main file for the application. This file is responsible for the main flow of the application.
 */

import { handleUncaughtErrors } from '../helperServices/globalErrorHandler.js'

// Importing external libraries
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import {
  addBreadcrumb,
  captureException,
  captureMessage,
  startTransaction
} from '@sentry/node'

// Importing services
import {
  checkCourses,
  checkEnrollment
} from '../services/extractInformation.js'
import setCookies from '../services/setCookies.js'
import checkoutCourse from '../services/handleCourseEnrollment.js'
import fetchAndCompareCourses from '../services/fetchAndCompareCourses.js'
import dataWrite from '../services/dataWrite.js'
import databaseWrite from '../services/databaseWrite.js'
handleUncaughtErrors()

puppeteer.use(StealthPlugin())

export let browser

/**
 * Get an instance of the browser.
 * If the browser is not already launched, it launches a new instance.
 * @returns {Promise<Browser>} The browser instance.
 */
async function getBrowserInstance () {
  try {
    if (!browser) {
      addBreadcrumb({
        category: 'browser',
        message: 'Launching new browser instance',
        level: 'info'
      })

      browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: {
          width: 1920,
          height: 1080
        },
        timeout: 200000
      })

      addBreadcrumb({
        category: 'browser',
        message: 'New browser instance launched',
        level: 'info'
      })
    }
    return browser
  } catch (error) {
    captureException(error)
    throw error
  }
}

/**
 * Close the browser instance if it is open.
 * Sets the browser variable to null after closing.
 * @returns {Promise<void>}
 */
async function closeBrowserInstance () {
  try {
    if (browser) {
      addBreadcrumb({
        category: 'browser',
        message: 'Closing browser instance',
        level: 'info'
      })

      await browser.close()
      browser = null

      addBreadcrumb({
        category: 'browser',
        message: 'Browser instance closed',
        level: 'info'
      })
    }
  } catch (error) {
    captureException(error)
    throw error
  }
}

/**
 * Main function to scrape the site.
 * This function fetches and compares courses, sets cookies, checks for free courses,
 * checks enrollment status, and enrolls in courses if necessary.
 * @returns {Promise<void>}
 */
export default async function scrapeSite () {
  const transaction = startTransaction({
    op: 'task',
    name: 'Scrape site'
  })

  try {
    const startTime = new Date()

    const courses = await fetchAndCompareCourses()

    if (!courses || courses?.length === 0) {
      console.log('No new courses found')
      return
    }

    const browser = await getBrowserInstance()

    addBreadcrumb({
      category: 'browser',
      message: 'Browser instance obtained',
      level: 'info'
    })

    const tempCookiePage = await browser.newPage()
    await tempCookiePage.setViewport({
      width: 1920,
      height: 1080
    })
    await setCookies(tempCookiePage)
    if (tempCookiePage) {
      await tempCookiePage.close()
    }

    addBreadcrumb({
      category: 'browser',
      message: 'Cookies set and temporary page closed',
      level: 'info'
    })

    // Pass the Udemy IDs and coupon codes to the checkCourses function
    const freeCourses = await checkCourses(courses)

    addBreadcrumb({
      category: 'shouldScrape',
      message: 'Free courses checked',
      level: 'info',
      data: {
        freeCourses: freeCourses || 'No courses found',
        courses: JSON.stringify(courses, null, 2) || 'No courses found'
      }
    })

    if (!freeCourses || freeCourses?.length === 0) {
      console.log('No new courses found')
      await closeBrowserInstance()
      await dataWrite(courses)
      return
    }

    // Check enrollment for all courses concurrently
    const enrollmentStatuses = await Promise.all(
      freeCourses.map((course) => checkEnrollment(course))
    )

    // Filter out already enrolled courses
    const notEnrolledCourses = freeCourses.filter(
      (course, index) => !enrollmentStatuses[index]
    )

    courses.forEach((course) => {
      if (
        !notEnrolledCourses.some(
          (notEnrolledCourse) =>
            notEnrolledCourse.udemyCourseId === course.udemyCourseId
        )
      ) {
        course.debug.isEnrolled = true
      } else {
        course.debug.isEnrolled = false
      }
    })

    // Filter the courses array to include only the courses that are also in notEnrolledCourses
    const coursesToEnroll = courses.filter((course) =>
      notEnrolledCourses.some(
        (notEnrolledCourse) =>
          notEnrolledCourse.udemyCourseId === course.udemyCourseId
      )
    )

    addBreadcrumb({
      category: 'shouldScrape',
      message: 'Not enrolled and free courses filtered',
      level: 'info',
      data: {
        coursesToEnroll: coursesToEnroll || 'No courses found'
      }
    })

    if (!coursesToEnroll || coursesToEnroll?.length === 0) {
      console.log('No new courses found')
      await dataWrite(courses)
      await closeBrowserInstance()
      return
    }

    await Promise.all(coursesToEnroll.map(checkoutCourse))
    courses.forEach((course, index) => {
      const enrolledCourse = coursesToEnroll.find(
        (enrolledCourse) =>
          enrolledCourse.udemyCourseId === course.udemyCourseId
      )
      if (enrolledCourse) {
        courses[index].debug = enrolledCourse.debug
      }
    })

    await dataWrite(courses)

    const enrolledCoursesForDatabase = courses.filter(
      (course) => course.debug.isEnrolled
    )
    databaseWrite(enrolledCoursesForDatabase)

    const endTime = new Date()
    const executionTime = endTime - startTime

    console.log(
      `Enrollment completed in ${(executionTime / 1000).toFixed(2)}s`
    )

    await closeBrowserInstance()

    captureMessage('ScrapeSite ran successfully')
  } catch (error) {
    console.error('An error occurred while scraping the site:', error)
    captureException(error)
    throw error
  } finally {
    transaction.finish()
  }
}
