const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.JWT_SECRET = "testsecret123"; // mock secret for tests

// IMPORTANT FIX: destructure the exported app
const { app, User } = require("../../server");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("AUTH Integration Tests (Register + Login)", () => {

  test("Should REGISTER a new user successfully", async () => {
    const res = await request(app)
      .post("/register")
      .send({
        username: "testUser1",
        password: "password123"
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Account created successfully");

    const userInDB = await User.findOne({ username: "testUser1" });
    expect(userInDB).not.toBeNull();
  });

  test("Should NOT REGISTER if username already exists", async () => {
    await User.create({
      username: "duplicateUser",
      password: "pass"
    });

    const res = await request(app)
      .post("/register")
      .send({
        username: "duplicateUser",
        password: "pass123"
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Username already exists");
  });

  test("Should LOGIN successfully with correct credentials", async () => {
    await User.create({
      username: "loginUser",
      password: await require("bcrypt").hash("mypassword", 10)
    });

    const res = await request(app)
      .post("/login")
      .send({
        username: "loginUser",
        password: "mypassword"
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Login successful");

    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies.some(c => c.includes("token"))).toBe(true);
  });

  test("Should NOT LOGIN with wrong password", async () => {
    await User.create({
      username: "wrongPass",
      password: await require("bcrypt").hash("correct", 10)
    });

    const res = await request(app)
      .post("/login")
      .send({
        username: "wrongPass",
        password: "incorrect"
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid Username or Password");
  });

  test("Should NOT LOGIN with missing fields", async () => {
    const res = await request(app)
      .post("/login")
      .send({
        username: "",
        password: ""
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Please fill all fields");
  });

});
