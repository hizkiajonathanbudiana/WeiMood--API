// tests/router.test.js

const request = require("supertest");
const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

// Import routers and middlewares
const routers = require("../routers/routers");
const {
  protectorLogin,
  protectorProfile,
  protectorVerify,
} = require("../middlewares/middlewares");

jest.mock("../middlewares/middlewares", () => ({
  protectorLogin: jest.fn((req, res, next) => next()),
  protectorProfile: jest.fn((req, res, next) => next()),
  protectorVerify: jest.fn((req, res, next) => next()),
}));

// Dummy controllers for testing route wiring
jest.mock("../controllers/userController", () => ({
  loginHandler: (req, res) => res.status(200).json({ route: "login" }),
  registerHandler: (req, res) => res.status(201).json({ route: "register" }),
  googleLogin: (req, res) => res.status(200).json({ route: "google" }),
  verifyCodeHandler: (req, res) => res.status(200).json({ route: "verify" }),
  sendVerificationEmail: (req, res) =>
    res.status(201).json({ route: "verify/send" }),
}));

jest.mock("../controllers/chatController", () => ({
  getChatDetail: (req, res) => res.status(200).json({ route: "chatDetail" }),
  deleteChat: (req, res) => res.status(200).json({ route: "deleteChat" }),
  getChatHistory: (req, res) => res.status(200).json({ route: "chatHistory" }),
  saveChat: (req, res) => res.status(201).json({ route: "saveChat" }),
  generateChat: (req, res) => res.status(201).json({ route: "generateChat" }),
}));

jest.mock("../controllers/moodController", () => ({
  getAllMoods: (req, res) => res.status(200).json({ route: "getAllMoods" }),
  createOrUpdateMood: (req, res) =>
    res.status(201).json({ route: "createOrUpdateMood" }),
}));

jest.mock("../controllers/profileController", () => ({
  createProfile: (req, res) => res.status(201).json({ route: "createProfile" }),
  updateProfile: (req, res) => res.status(200).json({ route: "updateProfile" }),
  deleteProfile: (req, res) => res.status(200).json({ route: "deleteProfile" }),
  getProfile: (req, res) => res.status(200).json({ route: "getProfile" }),
}));

// Build Express app with middleware and routers
function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(bodyParser.json());
  app.use("/", routers);
  return app;
}

describe("Router Configuration", () => {
  const app = buildApp();

  test("POST /login", async () => {
    const res = await request(app).post("/login").send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "login" });
  });

  test("POST /register", async () => {
    const res = await request(app).post("/register").send({});
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ route: "register" });
  });

  test("POST /google", async () => {
    const res = await request(app).post("/google").send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "google" });
  });

  test("Protected routes use protectorLogin", async () => {
    await request(app).get("/auth/me");
    expect(protectorLogin).toHaveBeenCalled();
  });

  test("POST /verify", async () => {
    const res = await request(app).post("/verify").send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "verify" });
  });

  test("POST /verify/send", async () => {
    const res = await request(app).post("/verify/send").send({});
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ route: "verify/send" });
  });

  test("Protected routes use protectorVerify after /verify/send", async () => {
    await request(app).post("/profile").send({});
    expect(protectorVerify).toHaveBeenCalled();
  });

  test("POST /profile", async () => {
    const res = await request(app).post("/profile").send({});
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ route: "createProfile" });
  });

  test("Protected /moods routes use protectorProfile", async () => {
    await request(app).get("/moods");
    expect(protectorProfile).toHaveBeenCalled();
  });

  test("GET /moods", async () => {
    const res = await request(app).get("/moods");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "getAllMoods" });
  });

  test("POST /moods", async () => {
    const res = await request(app).post("/moods").send({});
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ route: "createOrUpdateMood" });
  });

  test("GET /chat", async () => {
    const res = await request(app).get("/chat");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "chatHistory" });
  });

  test("POST /ai", async () => {
    const res = await request(app).post("/ai").send({});
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ route: "generateChat" });
  });

  test("GET /chat/:id", async () => {
    const res = await request(app).get("/chat/1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "chatDetail" });
  });

  test("POST /chat", async () => {
    const res = await request(app).post("/chat").send({});
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ route: "saveChat" });
  });

  test("DELETE /chat/:id", async () => {
    const res = await request(app).delete("/chat/1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "deleteChat" });
  });

  test("PUT /profile", async () => {
    const res = await request(app).put("/profile").send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "updateProfile" });
  });

  test("DELETE /profile", async () => {
    const res = await request(app).delete("/profile");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "deleteProfile" });
  });

  test("GET /profile", async () => {
    const res = await request(app).get("/profile");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ route: "getProfile" });
  });
});
