// Import necessary functions
import shouldScrape from '../services/shouldScrape.js';
import scrapeSite from './scrapeSite.js';
import { exec } from 'child_process';

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
    if (failCount >= 2) {
      exec('notify-send "ScrapeSite failed 5 times. Stopping execution."');

      console.log('Restarting process...');
      process.kill(process.pid, 'SIGUSR2');

      process.exit(1); // exit current process
    }
  }

  // Schedule this function to run again in 60'000 ms * 10 = 10 minutes 
  setTimeout(() => { runAndReschedule(); }, 60000 * 10);
}

// Start the first execution of the function
runAndReschedule();