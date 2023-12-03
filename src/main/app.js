// Import necessary functions
import shouldScrape from '../services/shouldScrape.js';
import scrapeSite from './scrapeSite.js';

// This function checks if we should scrape the site, and if so, it does.
// After it's done, it schedules itself to run again in 60 seconds.
async function runAndReschedule() {
  // Check if we should scrape the site
  if (await shouldScrape()) {
    console.log(`--------------------------\nScraping enabled\n--------------------------`);
    // If we should, then scrape the site
    await scrapeSite();
  } else {
    console.log(`--------------------------\nScraping not needed\n--------------------------`);
  }

  // Schedule this function to run again in 60 seconds
  setTimeout(() => { runAndReschedule(); }, 60000);
}

// Start the first execution of the function
runAndReschedule();