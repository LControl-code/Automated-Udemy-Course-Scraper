/**
 * Waits for the specified number of milliseconds.
 * @param {number} ms - The number of milliseconds to wait.
 * @returns {Promise<void>} A promise that resolves after the specified time.
 */
export async function wait (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
