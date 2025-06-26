// tests/app.test.js

jest.mock("../models", () => ({
  User: {
    update: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Profile: {
    findOne: jest.fn(),
  },
  MoodLog: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../helpers/bcrypt", () => ({
  comparePasswords: jest.fn(),
}));

jest.mock("../helpers/jwt", () => ({
  generateToken: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock("../helpers/mailer", () => ({
  transporter: { sendMail: jest.fn() },
}));

jest.mock("google-auth-library", () => {
  const mClient = { verifyIdToken: jest.fn() };
  return { OAuth2Client: jest.fn(() => mClient) };
});

const userController = require("../controllers/userController");
const {
  protectorLogin,
  protectorProfile,
  protectorVerify,
} = require("../middlewares/middlewares");
const MoodController = require("../controllers/moodController");
const { User, Profile, MoodLog } = require("../models");
const { comparePasswords } = require("../helpers/bcrypt");
const { generateToken, verifyToken } = require("../helpers/jwt");
const { transporter } = require("../helpers/mailer");
const { OAuth2Client } = require("google-auth-library");

describe("userController", () => {
  let req, res, next;
  beforeEach(() => {
    req = { body: {}, cookies: {}, params: {}, user: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("verifyCodeHandler", () => {
    test("400 when missing verifyCode", async () => {
      await userController.verifyCodeHandler(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Verification code is required",
      });
    });

    test("401 when token invalid", async () => {
      req.body.verifyCode = "123";
      req.cookies.weiVerifyCode = "t";
      verifyToken.mockReturnValue(null);
      await userController.verifyCodeHandler(req, res, next);
      expect(verifyToken).toHaveBeenCalledWith("t");
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid or expired token",
      });
    });

    test("400 when codes mismatch", async () => {
      req.body.verifyCode = "111";
      req.cookies.weiVerifyCode = "tok";
      verifyToken.mockReturnValue({ id: 1, verifyCode: "222" });
      await userController.verifyCodeHandler(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid verification code",
      });
    });

    test("200 on success", async () => {
      req.body.verifyCode = "333";
      req.cookies.weiVerifyCode = "tok2";
      verifyToken.mockReturnValue({ id: 7, verifyCode: "333" });
      User.update.mockResolvedValue([1]);
      await userController.verifyCodeHandler(req, res, next);
      expect(User.update).toHaveBeenCalledWith(
        { isVerified: true },
        { where: { id: 7 } }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email verified successfully",
      });
    });
  });

  describe("sendVerificationEmail", () => {
    beforeEach(() => {
      req.user = { id: 9, email: "test@e.com" };
    });

    test("throws EMAILSENDINGFAILED on mail error", async () => {
      transporter.sendMail.mockRejectedValue(new Error("fail"));
      await expect(
        userController.sendVerificationEmail(req, res, next)
      ).rejects.toThrow("EMAILSENDINGFAILED");
    });
  });

  describe("googleLogin", () => {
    let client;
    const payload = { email: "g@u.com", sub: "sub123" };

    beforeEach(() => {
      req.body = {};
      client = new OAuth2Client();
      client.verifyIdToken.mockResolvedValue({ getPayload: () => payload });
    });

    test("400 when missing token", async () => {
      await userController.googleLogin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Token is required" });
    });

    test("create & login new user", async () => {
      req.body.token = "id";
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        id: 11,
        email: payload.email,
        googleSub: payload.sub,
      });
      generateToken.mockReturnValue("acc-jwt");

      await userController.googleLogin(req, res, next);

      expect(User.create).toHaveBeenCalledWith({
        email: payload.email,
        googleSub: payload.sub,
        provider: "google",
        password: null,
        isVerified: true,
      });
      expect(res.cookie).toHaveBeenCalledWith(
        "accessToken",
        "acc-jwt",
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith({
        token: "acc-jwt",
        access_token: "acc-jwt",
      });
    });

    test("link existing user", async () => {
      req.body.token = "id";
      const existing = {
        id: 5,
        email: payload.email,
        googleSub: null,
        save: jest.fn(),
      };
      User.findOne.mockResolvedValue(existing);
      generateToken.mockReturnValue("j2");

      await userController.googleLogin(req, res, next);

      expect(existing.googleSub).toBe(payload.sub);
      expect(res.cookie).toHaveBeenCalledWith(
        "accessToken",
        "j2",
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith({
        token: "j2",
        access_token: "j2",
      });
    });
  });

  describe("registerHandler", () => {
    test("201 on success", async () => {
      const u = { id: 3, email: "a@b.c" };
      req.body = { email: u.email, password: "pw" };
      User.create.mockResolvedValue(u);

      await userController.registerHandler(req, res, next);

      expect(User.create).toHaveBeenCalledWith({
        email: u.email,
        password: "pw",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(u);
    });

    test("next() on missing creds", async () => {
      req.body = { email: "" };
      await userController.registerHandler(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("loginHandler", () => {
    test("success", async () => {
      const u = { id: 4, email: "x@y.z", password: "hashed" };
      req.body = { email: u.email, password: "raw" };
      User.findOne.mockResolvedValue(u);
      comparePasswords.mockResolvedValue(true);
      generateToken.mockReturnValue("lt");

      await userController.loginHandler(req, res, next);

      expect(comparePasswords).toHaveBeenCalledWith("raw", "hashed");
      expect(res.cookie).toHaveBeenCalledWith(
        "accessToken",
        "lt",
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith({
        token: "lt",
        access_token: "lt",
      });
    });

    test("next() on invalid login", async () => {
      req.body = { email: "no@one", password: "p" };
      User.findOne.mockResolvedValue(null);
      await userController.loginHandler(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});

describe("middlewares", () => {
  let req, res, next;
  beforeEach(() => {
    req = { cookies: {}, headers: {}, user: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("protectorLogin", () => {
    test("401 if no token", async () => {
      await protectorLogin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "No token provided, please login",
      });
    });

    test("401 if user not found", async () => {
      req.cookies.accessToken = "t";
      verifyToken.mockResolvedValue({ id: 2 });
      User.findOne.mockResolvedValue(null);
      await protectorLogin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    test("401 on invalid token", async () => {
      req.cookies.accessToken = "t";
      verifyToken.mockImplementation(() => {
        throw Object.assign(new Error(), { name: "JsonWebTokenError" });
      });
      await protectorLogin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid or expired token",
      });
    });

    test("next() and set req.user on success", async () => {
      req.headers.authorization = "Bearer t2";
      verifyToken.mockResolvedValue({ id: 5 });
      User.findOne.mockResolvedValue({ id: 5, email: "e@mail" });
      await protectorLogin(req, res, next);
      expect(req.user).toEqual({ id: 5, email: "e@mail" });
      expect(next).toHaveBeenCalled();
    });
  });

  describe("protectorVerify", () => {
    test("403 if not verified", async () => {
      req.user = { id: 1 };
      User.findOne.mockResolvedValue({ isVerified: false });
      await protectorVerify(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "User not verified" });
    });

    test("next() if verified", async () => {
      req.user = { id: 2 };
      User.findOne.mockResolvedValue({ isVerified: true });
      await protectorVerify(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("protectorProfile", () => {
    test("404 if profile missing", async () => {
      req.user = { id: 3 };
      Profile.findOne.mockResolvedValue(null);
      await protectorProfile(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Profile not found" });
    });

    test("next() and set req.profile on success", async () => {
      const prof = { UserId: 3, bio: "x" };
      req.user = { id: 3 };
      Profile.findOne.mockResolvedValue(prof);
      await protectorProfile(req, res, next);
      expect(req.profile).toBe(prof);
      expect(next).toHaveBeenCalled();
    });
  });
});

describe("MoodController", () => {
  let req, res, next;
  beforeEach(() => {
    req = { user: {}, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("getAllMoods", () => {
    test("200 and return moods", async () => {
      req.user.id = 7;
      const moods = { happy: 1 };
      MoodLog.findOne.mockResolvedValue(moods);
      await MoodController.getAllMoods(req, res, next);
      expect(MoodLog.findOne).toHaveBeenCalledWith({ where: { UserId: 7 } });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ moods });
    });
  });

  describe("createOrUpdateMood", () => {
    test("update existing mood", async () => {
      req.user.id = 8;
      req.body.mood = "happy";
      const existing = { UserId: 8, happy: 2, save: jest.fn() };
      MoodLog.findOne.mockResolvedValue(existing);

      await MoodController.createOrUpdateMood(req, res, next);

      expect(existing.happy).toBe(3);
      expect(existing.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Mood updated",
        mood: existing,
      });
    });

    test("create new mood", async () => {
      req.user.id = 9;
      req.body.mood = "sad";
      MoodLog.findOne.mockResolvedValue(null);
      const created = { UserId: 9, sad: 1 };
      MoodLog.create.mockResolvedValue(created);

      await MoodController.createOrUpdateMood(req, res, next);

      expect(MoodLog.create).toHaveBeenCalledWith({ UserId: 9, sad: 1 });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Mood created",
        mood: created,
      });
    });
  });
});
