// Import necessary functions
import shouldScrape from '../services/shouldScrape.js';
import scrapeSite from './scrapeSite.js';
import { exec } from 'child_process';
import * as Sentry from "@sentry/node";

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
});

// This function checks if we should scrape the site, and if so, it does.
// After it's done, it schedules itself to run again in 5 minutes.
let failCount = 0;
async function runAndReschedule() {
  // Check if we should scrape the site
  try {
    if (await shouldScrape()) {
      console.log(`+ Scraping enabled`);
      await scrapeSite();
      failCount = 0;
    } else {
      console.log(`- Scraping disabled`);
    }
  } catch (error) {
    failCount++;
    console.error(`ScrapeSite failed ${failCount} time(s).`);
    Sentry.captureException(error);

    if (failCount >= 2) {
      exec('notify-send "ScrapeSite failed. Restarting process"');

      console.log('Restarting process...');
      process.kill(process.pid, 'SIGUSR2');
    }
  }

  // Schedule this function to run again in 60'000 ms * 5 = 5 minutes 
  setTimeout(() => { runAndReschedule(); }, 60000 * 5);
}

// Start the first execution of the function
runAndReschedule();