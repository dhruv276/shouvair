const puppeteer = require("puppeteer");

jest.setTimeout(60000);

describe("Puppeteer Browser Automation (Register → Login → Protected Page)", () => {
  let browser;
  let page;
  const BASE_URL = "http://localhost:8080";

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,     // SHOW browser
      slowMo: 60,          // Actions speed
      defaultViewport: null
    });

    page = await browser.newPage();
  });

  afterAll(async () => {
    // show final page for 3s before closing
    await new Promise(res => setTimeout(res, 3000));
    await browser.close();
  });

  test("Should register, login, and access /reserve successfully", async () => {

    // Go to login page
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });

    // 1️⃣ Click "Sign Up" toggle button
    await page.click("#register");
    await page.waitForSelector("input[id='username']");

    // 2️⃣ Fill REGISTER form (UI Interaction)
    await page.type("input[id='username']", "puppetUser");
    await page.type("input[id='password']", "puppetPass123");

    // Submit register form
    await Promise.all([
      page.click(".sign-up button[type='submit']"),
      page.waitForResponse(res => res.url().includes("/register")),
    ]);

    // Wait a bit
    await new Promise(res => setTimeout(res, 800));

    // 3️⃣ Switch to login form
    await page.click("#login");
    await page.waitForSelector(".sign-in input[name='username']");

    // 4️⃣ Fill LOGIN form
    await page.type(".sign-in input[name='username']", "puppetUser");
    await page.type(".sign-in input[name='password']", "puppetPass123");

    await Promise.all([
      page.click(".sign-in button[type='submit']"),
      page.waitForResponse(res => res.url().includes("/login")),
    ]);

    // Wait for cookie
    await new Promise(res => setTimeout(res, 1200));

    // 5️⃣ Navigate to protected page
    await page.goto(`${BASE_URL}/user`, { waitUntil: "networkidle2" });

    const html = await page.content();

    expect(html).toMatch(/Reserve|Order/i);
  });
});
