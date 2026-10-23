/**
 * Wait for `ms` milliseconds (default: the next macrotask)
 */
export const sleep = (ms = 0) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Let chained async work (fetch mocks, stream reads, callbacks) settle
 */
export const flushPromises = async (rounds = 10) => {
  for (let i = 0; i < rounds; i++) {
    await sleep();
  }
};
