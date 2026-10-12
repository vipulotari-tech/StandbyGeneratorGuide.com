// Standard Playwright browsers in CI; allow a supplied executable in constrained QA runtimes.
export const browserOptions = {
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: process.env.PLAYWRIGHT_CHROMIUM_ARGS
      ? JSON.parse(process.env.PLAYWRIGHT_CHROMIUM_ARGS)
      : ['--no-sandbox', '--no-zygote', '--single-process', '--disable-dev-shm-usage'],
  } : {}),
};
