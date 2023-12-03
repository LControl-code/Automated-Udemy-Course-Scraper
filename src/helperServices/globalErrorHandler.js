import fs from 'fs';

function logAndClear(error) {
  const date = new Date();
  const formattedDate = date.toLocaleString('en-GB');
  const [datePart, timePart] = formattedDate.split(', ');
  const formattedDatePart = datePart.replace(/\//g, '.');
  const errorMessage = `\n${timePart} - ${formattedDatePart} - Error: ${error.stack}\n`;

  fs.appendFileSync('logs/error.log', errorMessage);
  fs.writeFileSync('data/previousRunSiteList.json', '');
}

export function handleUncaughtErrors() {
  process.on('uncaughtException', (err) => {
    console.error('There was an uncaught error', err);
    logAndClear(err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    logAndClear(reason);
    process.exit(1);
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