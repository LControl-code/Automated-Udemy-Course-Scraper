import chalk from 'chalk'

export async function logEnrollmentStatus(url, pageTitle) {
  if (!url) {
    console.log(chalk.white.bgRed("- Enrollment failed:", pageTitle));
    return;
  }
  if (url.startsWith("https://www.udemy.com/cart/success/")) {
    console.log(chalk.white.bgGreen("+ Enrolled:", pageTitle), "\nURL:", url);
  } else {
    console.log(chalk.white.bgRed("- Enrollment failed:", pageTitle), "\nURL:", url);
  }
}