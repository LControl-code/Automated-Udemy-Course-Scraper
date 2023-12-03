import chalk from 'chalk'
import fs from 'fs'

export async function logEnrollmentStatus(url, pageTitle) {
  if (!url) {
    console.log(chalk.white.bgRed("- Enrollment failed:", pageTitle));
    return;
  }
  if (url.startsWith("https://www.udemy.com/cart/success/")) {
    console.log(chalk.white.bgGreen("+ Enrolled:", pageTitle));
    const log = `${pageTitle}\n`;
    writeLog('logs/enrolledCourses.log', log, 'a');
  } else {
    console.log(chalk.white.bgRed("- Enrollment failed:", pageTitle), "\nURL:", url);
  }
}

export async function writeLog(logFile, log, mode = 'a') {
  if (mode === 'a') {
    // Append mode
    if (!fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, log);
    } else {
      const logExists = fs.readFileSync(logFile, 'utf8').includes(log);
      if (!logExists) {
        fs.appendFileSync(logFile, log);
      }
    }
  } else if (mode === 'r') {
    // Rewrite mode
    fs.writeFileSync(logFile, log);
  } else {
    throw new Error(`Invalid mode "${mode}". Use "a" for append or "r" for rewrite.`);
  }
}