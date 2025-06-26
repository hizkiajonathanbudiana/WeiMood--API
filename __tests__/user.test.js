// tests/userController.test.js
const userController = require("../controllers/userController");
const { User } = require("../models");
const { comparePasswords } = require("../helpers/bcrypt");
const { generateToken, verifyToken } = require("../helpers/jwt");
const { transporter } = require("../helpers/mailer");
const { OAuth2Client } = require("google-auth-library");

jest.mock("../models", () => ({
  User: {
    update: jest.fn(),
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

describe("userController", () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, cookies: {}, params: {}, user: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      send: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("verifyCodeHandler", () => {
    test("should return 400 if no verifyCode in body", async () => {
      await userController.verifyCodeHandler(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Verification code is required",
      });
    });

    test("should return 401 if token invalid", async () => {
      req.body.verifyCode = "123456";
      verifyToken.mockReturnValue(null);
      req.cookies.weiVerifyCode = "fake-token";
      await userController.verifyCodeHandler(req, res, next);
      expect(verifyToken).toHaveBeenCalledWith("fake-token");
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid or expired token",
      });
    });

    test("should return 400 if codes mismatch", async () => {
      req.body.verifyCode = "111111";
      verifyToken.mockReturnValue({ id: 5, verifyCode: "222222" });
      req.cookies.weiVerifyCode = "token";
      await userController.verifyCodeHandler(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid verification code",
      });
    });

    test("should update User and return 200 on success", async () => {
      req.body.verifyCode = "333333";
      verifyToken.mockReturnValue({ id: 7, verifyCode: "333333" });
      req.cookies.weiVerifyCode = "good-token";
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
      req.user = { id: 9, email: "test@example.com" };
    });

    test("should throw EMAILSENDINGFAILED on mailer error", async () => {
      transporter.sendMail.mockRejectedValue(new Error("fail"));
      await expect(
        userController.sendVerificationEmail(req, res, next)
      ).rejects.toThrow("EMAILSENDINGFAILED");
    });
  });

  describe("googleLogin", () => {
    const fakePayload = { email: "g@u.com", sub: "google-sub-123" };
    let mClient;

    beforeEach(() => {
      mClient = new OAuth2Client();
      mClient.verifyIdToken.mockResolvedValue({
        getPayload: () => fakePayload,
      });
    });

    test("should 400 if no token", async () => {
      await userController.googleLogin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Token is required" });
    });

    test("should create new user and login", async () => {
      req.body.token = "id-token";
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        id: 11,
        email: fakePayload.email,
        googleSub: fakePayload.sub,
      });
      generateToken.mockReturnValue("access-jwt");

      await userController.googleLogin(req, res, next);

      expect(User.create).toHaveBeenCalledWith({
        email: fakePayload.email,
        googleSub: fakePayload.sub,
        provider: "google",
        password: null,
        isVerified: true,
      });
      expect(res.cookie).toHaveBeenCalledWith(
        "accessToken",
        "access-jwt",
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith({
        token: "access-jwt",
        access_token: "access-jwt",
      });
    });

    test("should link existing user without googleSub", async () => {
      req.body.token = "id-token";
      User.findOne.mockResolvedValue({
        id: 5,
        email: fakePayload.email,
        googleSub: null,
        save: jest.fn(),
      });
      generateToken.mockReturnValue("jwt2");

      await userController.googleLogin(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: fakePayload.email },
      });
      expect(res.cookie).toHaveBeenCalledWith(
        "accessToken",
        "jwt2",
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith({
        token: "jwt2",
        access_token: "jwt2",
      });
    });
  });

  describe("registerHandler", () => {
    test("should 201 and return new user", async () => {
      const newUser = { id: 3, email: "a@b.com" };
      req.body = { email: "a@b.com", password: "pass" };
      User.create.mockResolvedValue(newUser);

      await userController.registerHandler(req, res, next);

      expect(User.create).toHaveBeenCalledWith({
        email: "a@b.com",
        password: "pass",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newUser);
    });

    test("should call next on missing creds", async () => {
      req.body = { email: "" };
      await userController.registerHandler(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("loginHandler", () => {
    test("should login successfully", async () => {
      const user = {
        id: 4,
        email: "u@u.com",
        password: "hashed",
        save: jest.fn(),
      };
      req.body = { email: "u@u.com", password: "raw" };
      User.findOne.mockResolvedValue(user);
      comparePasswords.mockResolvedValue(true);
      generateToken.mockReturnValue("login-jwt");

      await userController.loginHandler(req, res, next);

      expect(comparePasswords).toHaveBeenCalledWith("raw", "hashed");
      expect(res.cookie).toHaveBeenCalledWith(
        "accessToken",
        "login-jwt",
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith({
        token: "login-jwt",
        access_token: "login-jwt",
      });
    });

    test("should call next on invalid login", async () => {
      req.body = { email: "x@x.com", password: "p" };
      User.findOne.mockResolvedValue(null);
      await userController.loginHandler(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
