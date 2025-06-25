const request = require("supertest");
const app = require("../app");
const nodemailer = require("nodemailer");
const { OpenAI } = require("openai");
const db = require("../models");
const { verifyToken } = require("../helpers/jwt");

// --- MOCKS ---
jest.mock("nodemailer");
const sendMailMock = jest.fn();
nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });

jest.mock("openai", () => {
  const mOpenAI = {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  };
  return { __esModule: true, OpenAI: jest.fn(() => mOpenAI) };
});
const openai = new OpenAI();

jest.mock("../helpers/jwt", () => ({
  ...jest.requireActual("../helpers/jwt"),
  verifyToken: jest.fn(),
}));

// --- LIFECYCLE HOOKS ---
beforeAll(async () => {
  await db.sequelize.sync({ force: true });
});

afterEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await db.sequelize.close();
});

// --- HELPER FUNCTIONS ---
async function registerAndLogin(
  user = { email: "test@mail.com", password: "pass123" }
) {
  await request(app).post("/register").send(user);
  const res = await request(app).post("/login").send(user);
  if (res.status !== 200) {
    throw new Error(
      `Login failed in helper: Status ${res.status} Body: ${JSON.stringify(
        res.body
      )}`
    );
  }
  return { cookies: res.headers["set-cookie"] };
}

async function setUserVerified(email) {
  await db.User.update({ isVerified: true }, { where: { email } });
}

// --- TEST SUITES ---
describe("Auth & User Endpoints", () => {
  beforeEach(async () => {
    await db.User.destroy({ where: {}, truncate: true, cascade: true });
  });

  describe("POST /register", () => {
    it("should register user and return 201", async () => {
      const res = await request(app)
        .post("/register")
        .send({ email: "unique@mail.com", password: "pass123" });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
    });

    it("should return 400 if email already exists", async () => {
      await request(app)
        .post("/register")
        .send({ email: "dup@mail.com", password: "pass123" });
      const res = await request(app)
        .post("/register")
        .send({ email: "dup@mail.com", password: "pass123" });
      expect(res.status).toBe(400);
    });

    it("should return 401 if required fields are missing", async () => {
      const res = await request(app)
        .post("/register")
        .send({ email: "test@test.com" });
      expect(res.status).toBe(401);
    });
  });

  describe("POST /login", () => {
    it("should login and return 200 with tokens and cookie", async () => {
      await request(app)
        .post("/register")
        .send({ email: "login@mail.com", password: "pass123" });
      const res = await request(app)
        .post("/login")
        .send({ email: "login@mail.com", password: "pass123" });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
    });

    it("should return 401 for wrong credentials", async () => {
      await request(app)
        .post("/register")
        .send({ email: "login-fail@mail.com", password: "pass123" });
      const res = await request(app)
        .post("/login")
        .send({ email: "login-fail@mail.com", password: "wrong" });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /auth/me", () => {
    it("should return 200 and user info with valid cookie", async () => {
      const { cookies } = await registerAndLogin({
        email: "me@mail.com",
        password: "pass",
      });
      const res = await request(app).get("/auth/me").set("Cookie", cookies);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe("me@mail.com");
    });
    it("should return 401 if no token provided", async () => {
      const res = await request(app).get("/auth/me");
      expect(res.status).toBe(401);
    });
  });
});

describe("Verification Endpoints", () => {
  let userEmail = "verify@mail.com";
  let userCookies;

  beforeEach(async () => {
    await db.User.destroy({ where: {}, truncate: true, cascade: true });
    ({ cookies: userCookies } = await registerAndLogin({
      email: userEmail,
      password: "pass123",
    }));
  });

  describe("POST /verify/send", () => {
    it("should send email, set cookie, and return 201", async () => {
      sendMailMock.mockResolvedValueOnce({});
      const res = await request(app)
        .post("/verify/send")
        .set("Cookie", userCookies);
      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/successful/i);
    });

    it("should return 400 if user is already verified", async () => {
      await setUserVerified(userEmail);
      const res = await request(app)
        .post("/verify/send")
        .set("Cookie", userCookies);
      expect(res.status).toBe(400);
    });

    it("should return 500 if nodemailer fails", async () => {
      sendMailMock.mockRejectedValueOnce(new Error("Email service down"));
      const res = await request(app)
        .post("/verify/send")
        .set("Cookie", userCookies);
      expect(res.status).toBe(500);
    });
  });

  describe("POST /verify", () => {
    it("should verify user and return 200", async () => {
      const user = await db.User.findOne({ where: { email: userEmail } });
      verifyToken.mockReturnValue({
        id: user.id,
        email: user.email,
        verifyCode: "123456",
      });
      const res = await request(app)
        .post("/verify")
        .set("Cookie", userCookies)
        .send({ verifyCode: "123456" });
      expect(res.status).toBe(200);
      const updatedUser = await db.User.findByPk(user.id);
      expect(updatedUser.isVerified).toBe(true);
    });

    it("should return 400 for wrong verification code", async () => {
      const user = await db.User.findOne({ where: { email: userEmail } });
      verifyToken.mockReturnValue({
        id: user.id,
        email: user.email,
        verifyCode: "123456",
      });
      const res = await request(app)
        .post("/verify")
        .set("Cookie", userCookies)
        .send({ verifyCode: "wrong-code" });
      expect(res.status).toBe(400);
    });
  });
});

describe("Profile, Mood, & Chat Endpoints", () => {
  let cookies;

  beforeEach(async () => {
    await db.sequelize.sync({ force: true });
    ({ cookies } = await registerAndLogin({
      email: "fullflow@mail.com",
      password: "pass123",
    }));
    await setUserVerified("fullflow@mail.com");
  });

  describe("Profile Endpoints", () => {
    it("should create profile and return 201", async () => {
      const res = await request(app)
        .post("/profile")
        .set("Cookie", cookies)
        .send({ displayName: "Test User Profile" });
      expect(res.status).toBe(201);
      expect(res.body.displayName).toBe("Test User Profile");
    });

    it("should return 404 if profile does not exist", async () => {
      // This test runs with a fresh user who doesn't have a profile yet
      const { cookies: noProfileCookies } = await registerAndLogin({
        email: "noprofile@mail.com",
        password: "123",
      });
      await setUserVerified("noprofile@mail.com");
      const res = await request(app)
        .get("/profile")
        .set("Cookie", noProfileCookies);
      expect(res.status).toBe(404);
    });

    it("should get the user profile after creation and return 200", async () => {
      await request(app)
        .post("/profile")
        .set("Cookie", cookies)
        .send({ displayName: "A User" });
      const res = await request(app).get("/profile").set("Cookie", cookies);
      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe("A User");
    });

    it("should update the profile and return 200", async () => {
      await request(app)
        .post("/profile")
        .set("Cookie", cookies)
        .send({ displayName: "Initial" });
      const res = await request(app)
        .put("/profile")
        .set("Cookie", cookies)
        .send({ displayName: "Updated" });
      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe("Updated");
    });

    it("should delete profile and return 200", async () => {
      await request(app)
        .post("/profile")
        .set("Cookie", cookies)
        .send({ displayName: "To Be Deleted" });
      const res = await request(app).delete("/profile").set("Cookie", cookies);
      expect(res.status).toBe(200);
    });
  });

  describe("Mood & Chat Endpoints", () => {
    beforeEach(async () => {
      await request(app)
        .post("/profile")
        .set("Cookie", cookies)
        .send({ displayName: "Ready User" });
    });

    it("POST /moods: should create a mood log and return 201", async () => {
      const res = await request(app)
        .post("/moods")
        .set("Cookie", cookies)
        .send({ happy: 1 });
      expect(res.status).toBe(201);
      expect(res.body.happy).toBe(1);
    });

    it("GET /moods: should get mood logs and return 200", async () => {
      await request(app).post("/moods").set("Cookie", cookies).send({ sad: 1 });
      const res = await request(app).get("/moods").set("Cookie", cookies);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].sad).toBe(1);
    });

    it("POST /chat: should get AI response and return 201", async () => {
      openai.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { content: "Test AI response" } }],
      });
      const res = await request(app)
        .post("/chat")
        .set("Cookie", cookies)
        .send({ mood: "curious", message: "What is testing?" });
      expect(res.status).toBe(201);
      expect(res.body.mood).toBe("Test AI response");
    });

    it("POST /chat/save: should save a message and return 201", async () => {
      const res = await request(app)
        .post("/chat/save")
        .set("Cookie", cookies)
        .send({ message: "This is a memory" });
      expect(res.status).toBe(201);
      expect(res.body.text).toBe("This is a memory");
    });

    it("GET /chat/history: should return saved chats and return 200", async () => {
      await request(app)
        .post("/chat/save")
        .set("Cookie", cookies)
        .send({ message: "A saved message" });
      const res = await request(app)
        .get("/chat/history")
        .set("Cookie", cookies);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].text).toBe("A saved message");
    });
  });
});
