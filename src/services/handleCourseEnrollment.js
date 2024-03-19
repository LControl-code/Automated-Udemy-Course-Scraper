import {
  bringPageToFront,
  getPageTitle,
  createNewPageAndGoToLink
} from '../helperServices/pageHelpers.js'
import {
  waitForUrl,
  waitForUrlChange
} from '../helperServices/navigationHelpers.js'
import { logEnrollmentStatus } from '../helperServices/loggingHelpers.js'
import { clickButton } from '../helperServices/buttonClickHelpers.js'
import { Mutex } from 'async-mutex'
import {
  addBreadcrumb,
  startTransaction,
  captureException
} from '@sentry/node'

const mutex = new Mutex()

export async function clickButtonWithEnvCheck (
  page,
  pageTitle,
  envVar,
  buttonToClick
) {
  const buttonSelector = process.env[envVar]
  if (!buttonSelector) {
    console.error(`Error: ${envVar} environment variable is not set`)
    throw new Error(`${envVar} environment variable is not set`)
  }
  await clickButton(page, pageTitle, buttonSelector, buttonToClick)
}

export async function logEnrollmentStatusAndClosePageIfOpen (
  page,
  url,
  pageTitle,
  isPageClosed
) {
  if (!page) {
    console.error('Error: page is not defined:', pageTitle)
    return
  }

  await logEnrollmentStatus(url, pageTitle)
  if (page && !isPageClosed) {
    await page.close()
  }
}

export async function handleCourseEnrollment (courseResult) {
  const { page, buttonToClick } = courseResult
  let isPageClosed = false

  try {
    await bringPageToFront(page)
    const pageTitle = await getPageTitle(page)

    await clickButtonWithEnvCheck(page, pageTitle, 'BUY_BUTTON', buttonToClick)
    await clickButtonWithEnvCheck(page, pageTitle, 'CHECKOUT_BUTTON')

    const url = await waitForUrl(page, 'https://www.udemy.com/cart/success/')
    await logEnrollmentStatusAndClosePageIfOpen(
      page,
      url,
      pageTitle,
      isPageClosed
    )

    isPageClosed = true
  } catch (error) {
    console.log(error.message)
    await logEnrollmentStatusAndClosePageIfOpen(page, null, null, isPageClosed)
  }
}

export default async function checkoutCourse (course) {
  const udemyCourseId = course.udemyCourseId
  const couponCode = course.couponCode
  if (!udemyCourseId || !couponCode) {
    course.debug.error.status = true
    course.debug.error.message = 'udemyCourseId or couponCode is not defined'
    course.debug.error.stack = 'course'
    return
  }

  const pageLink = course.udemyUrls.checkoutLink

  let checkoutPage = null
  let pageUrl = null

  if (course.debug.error.status) {
    console.log(
      'Course has encountered an error before. Skipping enrollment:',
      udemyCourseId
    )
    console.error('Error message: ', course.debug.error.message)
    console.error('Stack trace: ', course.debug.error.stack)
    return
  }

  if (course.debug.isEnrolled) {
    console.log(
      'Course is already enrolled. Skipping enrollment:',
      udemyCourseId
    )
    return
  }

  if (!course.debug.isFree) {
    console.log('Course is not free. Skipping enrollment:', udemyCourseId)
    return
  }

  addBreadcrumb({
    category: 'checkout',
    message: `Starting checkout for course: ${udemyCourseId}`,
    level: 'info',
    data: {
      courseInfo: {
        id: udemyCourseId,
        coupon: couponCode
      }
    }
  })

  course.debug.error.status = false

  const transaction = startTransaction({
    op: 'checkout',
    name: 'Checkout of a course',
    data: {
      courseInfo: course
    }
  })

  const release = await mutex.acquire()
  try {
    try {
      const span = transaction.startChild({
        op: 'task',
        description: 'Enrolling into course, using id and coupon'
      })
      checkoutPage = await createNewPageAndGoToLink(pageLink)
      pageUrl = checkoutPage.url()

      await bringPageToFront(checkoutPage)
      await new Promise((resolve) => setTimeout(resolve, 750))
      await clickButtonWithEnvCheck(checkoutPage, course, 'CHECKOUT_BUTTON')
      span.finish()
    } catch (error) {
      addBreadcrumb({
        category: 'checkout',
        message: `Error in checkout for course: ${udemyCourseId}`,
        level: 'error',
        data: {
          courseInfo: {
            id: udemyCourseId,
            coupon: couponCode,
            page: checkoutPage,
            pageUrl
          }
        }
      })

      captureException(error)

      throw error
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }

    try {
      const resultPage = await waitForUrlChange(checkoutPage, pageUrl)

      if (resultPage !== true) {
        addBreadcrumb({
          category: 'checkout',
          message: `Checkout redirect took too long. Error in page: ${resultPage}`,
          level: 'warning'
        })

        try {
          console.log(
            'Checkout redirect took too long. Clicking checkout button again:',
            udemyCourseId
          )
          await clickButtonWithEnvCheck(
            checkoutPage,
            course,
            'CHECKOUT_BUTTON'
          )
        } catch (err) {
          console.error('Error in checkout enrollment #2:', err.message)
          throw err
        }
      }
    } catch (error) {
      console.error('Checkout redirect took too long', error)
      throw new Error('Checkout redirect took too long')
    }

    course.debug.isEnrolled = true
    course.debug.error.status = false
    course.debug.error.message = ''
    course.debug.error.stack = ''
  } catch (error) {
    captureException(error)
    course.debug.error.status = true
    course.debug.isEnrolled = false
    course.debug.error.message = error.message
    course.debug.error.stack = error.stack
  } finally {
    release()
    if (checkoutPage) {
      await checkoutPage.close()
    }
  }

  addBreadcrumb({
    category: 'checkout',
    message: `Enrollment successful for course: ${udemyCourseId}`,
    level: 'info',
    data: {
      courseInfo: {
        id: udemyCourseId,
        coupon: couponCode
      }
    }
  })

  transaction.finish()
}
