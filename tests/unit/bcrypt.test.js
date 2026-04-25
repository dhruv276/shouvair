const bcrypt = require("bcrypt");

describe("Bcrypt Password Hashing", () => {

  test("Should hash a password successfully", async () => {
    const password = "mysecret123";
    const hash = await bcrypt.hash(password, 10);

    // hash should exist and be a string
    expect(typeof hash).toBe("string");
  });

  test("Hash should NOT match original password", async () => {
    const password = "mysecret123";
    const hash = await bcrypt.hash(password, 10);

    expect(hash).not.toBe(password); // hashed password should never equal plain text
  });

  test("bcrypt.compare should validate the correct password", async () => {
    const password = "mysecret123";
    const hash = await bcrypt.hash(password, 10);

    const isMatch = await bcrypt.compare(password, hash);

    expect(isMatch).toBe(true); // correct password must return true
  });

});
