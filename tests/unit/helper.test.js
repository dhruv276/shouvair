const jwt = require("jsonwebtoken");
const { getUsernameFromRequest } = require("../../utils/functions");

const JWT_SECRET = "testsecret123";

describe("getUsernameFromRequest()", () => {

  test("Should return username when valid token exists", () => {
    const token = jwt.sign({ username: "ak123" }, JWT_SECRET);

    const req = {
      cookies: { token }
    };

    const result = getUsernameFromRequest(req, JWT_SECRET);
    expect(result).toBe("ak123");
  });

  test("Should return null when no token", () => {
    const req = { cookies: {} };
    const result = getUsernameFromRequest(req, JWT_SECRET);
    expect(result).toBe(null);
  });

  test("Should return null for invalid token", () => {
    const req = { cookies: { token: "invalidtoken" } };
    const result = getUsernameFromRequest(req, JWT_SECRET);
    expect(result).toBe(null);
  });

});
