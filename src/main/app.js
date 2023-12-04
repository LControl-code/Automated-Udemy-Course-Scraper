// Import necessary functions
import shouldScrape from '../services/shouldScrape.js';
import scrapeSite from './scrapeSite.js';

// This function checks if we should scrape the site, and if so, it does.
// After it's done, it schedules itself to run again in 60 seconds.
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
    if (failCount >= 5) {
      throw new Error('ScrapeSite failed 5 times. Stopping execution.');
    }
  }

  // Schedule this function to run again in 60 seconds
  setTimeout(() => { runAndReschedule(); }, 60000);
}

// Start the first execution of the function
runAndReschedule();