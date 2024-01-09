import fs from 'fs';
import * as Sentry from "@sentry/node";

function logAndClear(error) {
  const date = new Date();
  const formattedDate = date.toLocaleString('en-GB');
  const [datePart, timePart] = formattedDate.split(', ');
  const formattedDatePart = datePart.replace(/\//g, '.');
  const errorMessage = `\n${timePart} - ${formattedDatePart} - Error: ${error.stack}\n`;

  fs.appendFileSync('logs/error.log', errorMessage);
  fs.writeFileSync('data/previousRunSiteList.json', '');

  Sentry.captureException(error);
}

export function handleUncaughtErrors() {
  process.on('uncaughtException', (err) => {
    console.error('There was an uncaught error', err);
    logAndClear(err);
    throw err;
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    logAndClear(reason);
  });
}

export function withErrorHandling(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logAndClear(error);
      throw error;
    }
  };
}