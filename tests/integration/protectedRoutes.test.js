const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "testsecret123"; 


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

describe("Protected Routes (requireAuth)", () => {

  test("Should block access to /reserve WITHOUT a token", async () => {
    const res = await request(app).get("/reserve");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Unauthorized");
  });

  test("Should ALLOW access to /reserve WITH a valid token", async () => {
    const createdUser = await User.create({
      username: "authUser",
      password: "secret"
    });

    const token = jwt.sign(
      { id: createdUser._id, username: createdUser.username },
      process.env.JWT_SECRET
    );

    const res = await request(app)
      .get("/reserve")
      .set("Cookie", [`token=${token}`]); // send token as cookie

    expect(res.status).toBe(200);
  });

  test("Should block access to /user WITHOUT a token", async () => {
    const res = await request(app).get("/user");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Unauthorized");
  });

  test("Should ALLOW access to /user WITH a valid token", async () => {
    const createdUser = await User.create({
      username: "profileUser",
      password: "secret"
    });

    const token = jwt.sign(
      { id: createdUser._id, username: createdUser.username },
      process.env.JWT_SECRET
    );

    const res = await request(app)
      .get("/user")
      .set("Cookie", [`token=${token}`]);

    expect(res.status).toBe(200);
  });

});
