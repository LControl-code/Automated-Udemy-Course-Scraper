// Import necessary functions
import shouldScrape from '../services/shouldScrape.js';
import scrapeSite from './scrapeSite.js';
import { exec } from 'child_process';
import { init, startTransaction, addBreadcrumb, setTag, captureException } from '@sentry/node';
import { ProfilingIntegration } from "@sentry/profiling-node";


// Initialize Sentry
init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    new ProfilingIntegration({
      // Tracing is disabled by default!
      tracing: true,
    }),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});


// This function checks if we should scrape the site, and if so, it does.
// After it's done, it schedules itself to run again in 5 minutes.
let failCount = 0;
async function runAndReschedule() {
  const transaction = startTransaction({
    op: "scrape",
    name: "Web Scraping Transaction",
  });

  addBreadcrumb({
    category: 'runAndReschedule',
    message: 'runAndReschedule called',
    level: 'info'
  });

  // Check if we should scrape the site
  try {
    if (await shouldScrape()) {
      setTag("scraping", "enabled");
      addBreadcrumb({
        category: 'scrapeSite',
        message: 'ScrapeSite called',
        level: 'info',
      });

      console.log(`+ Scraping enabled`);
      await scrapeSite();
      failCount = 0;
      transaction.setStatus('ok');
    } else {
      setTag("scraping", "disabled");
      addBreadcrumb({
        category: 'scrapeSite',
        message: 'ScrapeSite not called',
        level: 'info',
      });
      console.log(`- Scraping disabled`);
      transaction.setStatus('cancelled');
    }
  } catch (error) {
    failCount++;

    setTag("scraping", "failed");
    addBreadcrumb({
      category: 'scrapeSite',
      message: `ScrapeSite failed ${failCount} time(s)`,
      level: "error",
    });

    console.error('Error:', error.message);

    error.message = 'Error caught in app.js: ' + error.message;
    captureException(error);

    transaction.setStatus("failure");

    if (failCount >= 2) {
      exec('notify-send "ScrapeSite failed. Restarting process"');

      console.log('Restarting process...');
      process.kill(process.pid, 'SIGUSR2');
    }
  } finally {
    // Finish the transaction
    transaction.finish();
  }
  // Schedule this function to run again in 60'000 ms * 5 = 5 minutes 
  setTimeout(() => { runAndReschedule(); }, 60000 * 5);
}

// Start the first execution of the function
runAndReschedule();