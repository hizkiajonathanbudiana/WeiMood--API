// tests/app.test.js

// --- Mocking dependencies ---
jest.mock("../models", () => ({
  User: {
    update: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Profile: {
    findOne: jest.fn(),
  },
  SaveChat: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
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

// --- Import controllers and middlewares ---
const userController = require("../controllers/userController");
const ChatController = require("../controllers/chatController");
const MoodController = require("../controllers/moodController");
const {
  protectorLogin,
  protectorVerify,
  protectorProfile,
} = require("../middlewares/middlewares");

// --- Import models & helpers ---
const { User, Profile, SaveChat, MoodLog } = require("../models");
const { comparePasswords } = require("../helpers/bcrypt");
const { generateToken, verifyToken } = require("../helpers/jwt");
const { transporter } = require("../helpers/mailer");
const { OAuth2Client } = require("google-auth-library");

// --- userController tests ---
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
    test("400 if missing verifyCode", async () => {
      await userController.verifyCodeHandler(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Verification code is required",
      });
    });

    test("401 if token invalid", async () => {
      req.body.verifyCode = "123";
      req.cookies.weiVerifyCode = "t";
      verifyToken.mockReturnValue(null);
      await userController.verifyCodeHandler(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid or expired token",
      });
    });

    test("400 if codes mismatch", async () => {
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

    test("201 and send email", async () => {
      generateToken.mockReturnValue("jwt-code");
      transporter.sendMail.mockResolvedValue();
      await userController.sendVerificationEmail(req, res, next);
      expect(res.cookie).toHaveBeenCalledWith(
        "weiVerifyCode",
        "jwt-code",
        expect.objectContaining({ httpOnly: true, secure: true })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("throw EMAILSENDINGFAILED", async () => {
      transporter.sendMail.mockRejectedValue(new Error("fail"));
      await expect(
        userController.sendVerificationEmail(req, res, next)
      ).rejects.toThrow("EMAILSENDINGFAILED");
    });
  });

  describe("googleLogin", () => {
    const payload = { email: "g@u.com", sub: "sub123" };
    let client;
    beforeEach(() => {
      req.body = {};
      client = new OAuth2Client();
      client.verifyIdToken.mockResolvedValue({ getPayload: () => payload });
    });

    test("400 if missing token", async () => {
      await userController.googleLogin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("create & login new", async () => {
      req.body.token = "id";
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        id: 11,
        email: payload.email,
        googleSub: payload.sub,
      });
      generateToken.mockReturnValue("acc-jwt");
      await userController.googleLogin(req, res, next);
      expect(User.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        token: "acc-jwt",
        access_token: "acc-jwt",
      });
    });

    test("link existing", async () => {
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
    });
  });

  describe("registerHandler", () => {
    test("201 on success", async () => {
      const u = { id: 3, email: "a@b.c" };
      req.body = { email: u.email, password: "pw" };
      User.create.mockResolvedValue(u);
      await userController.registerHandler(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });
    test("next() on missing", async () => {
      req.body = {};
      await userController.registerHandler(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("loginHandler", () => {
    test("success", async () => {
      const u = { id: 4, password: "hashed" };
      req.body = { email: "x@y.z", password: "raw" };
      User.findOne.mockResolvedValue(u);
      comparePasswords.mockResolvedValue(true);
      generateToken.mockReturnValue("lt");
      await userController.loginHandler(req, res, next);
      expect(res.cookie).toHaveBeenCalled();
    });
  });
});

// --- Middleware tests ---
describe("middlewares", () => {
  let req, res, next;
  beforeEach(() => {
    req = { cookies: {}, headers: {}, user: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("protectorLogin", () => {
    test("401 no token", async () => {
      await protectorLogin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
    test("401 user not found", async () => {
      req.cookies.accessToken = "t";
      verifyToken.mockResolvedValue({ id: 2 });
      User.findOne.mockResolvedValue(null);
      await protectorLogin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
    test("401 invalid token", async () => {
      req.cookies.accessToken = "t";
      verifyToken.mockImplementation(() => {
        throw Object.assign(new Error(), { name: "JsonWebTokenError" });
      });
      await protectorLogin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
    test("next() on success", async () => {
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
    });
    test("next() if verified", async () => {
      req.user = { id: 2 };
      User.findOne.mockResolvedValue({ isVerified: true });
      await protectorVerify(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("protectorProfile", () => {
    test("404 if no profile", async () => {
      req.user = { id: 3 };
      Profile.findOne.mockResolvedValue(null);
      await protectorProfile(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });
    test("next() on success", async () => {
      const prof = { UserId: 3 };
      req.user = { id: 3 };
      Profile.findOne.mockResolvedValue(prof);
      await protectorProfile(req, res, next);
      expect(req.profile).toBe(prof);
      expect(next).toHaveBeenCalled();
    });
  });
});

// --- MoodController tests ---
describe("MoodController", () => {
  let req, res, next;
  beforeEach(() => {
    req = { user: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("getAllMoods", () => {
    test("200 return moods", async () => {
      req.user.id = 7;
      const moods = { happy: 1 };
      MoodLog.findOne.mockResolvedValue(moods);
      await MoodController.getAllMoods(req, res, next);
      expect(res.json).toHaveBeenCalledWith({ moods });
    });
  });

  describe("createOrUpdateMood", () => {
    test("update existing", async () => {
      req.user.id = 8;
      req.body.mood = "happy";
      const existing = { UserId: 8, happy: 2, save: jest.fn() };
      MoodLog.findOne.mockResolvedValue(existing);
      await MoodController.createOrUpdateMood(req, res, next);
      expect(existing.happy).toBe(3);
    });
    test("create new", async () => {
      req.user.id = 9;
      req.body.mood = "sad";
      MoodLog.findOne.mockResolvedValue(null);
      const created = { UserId: 9, sad: 1 };
      MoodLog.create.mockResolvedValue(created);
      await MoodController.createOrUpdateMood(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});

// --- ChatController tests ---
describe("ChatController", () => {
  let req, res, next;
  beforeEach(() => {
    req = { params: {}, body: {}, user: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("getChatDetail", () => {
    test("200 with chat", async () => {
      req.params.id = "5";
      req.user.id = 10;
      const chat = { id: 5, UserId: 10, text: "hello" };
      SaveChat.findOne.mockResolvedValue(chat);
      await ChatController.getChatDetail(req, res, next);
      expect(res.json).toHaveBeenCalledWith(chat);
    });
    test("next() if not found", async () => {
      req.params.id = "7";
      req.user.id = 3;
      SaveChat.findOne.mockResolvedValue(null);
      await ChatController.getChatDetail(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("deleteChat", () => {
    test("delete and 200", async () => {
      req.params.id = "2";
      req.user.id = 8;
      const chat = { destroy: jest.fn() };
      SaveChat.findOne.mockResolvedValue(chat);
      await ChatController.deleteChat(req, res, next);
      expect(chat.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: "Chat deleted successfully",
      });
    });
    test("next() if not found", async () => {
      req.params.id = "9";
      req.user.id = 4;
      SaveChat.findOne.mockResolvedValue(null);
      await ChatController.deleteChat(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("getChatHistory", () => {
    test("200 with history", async () => {
      req.user.id = 15;
      const history = [{ id: 1 }, { id: 2 }];
      SaveChat.findAll.mockResolvedValue(history);
      await ChatController.getChatHistory(req, res, next);
      expect(res.json).toHaveBeenCalledWith(history);
    });
    test("next() on error", async () => {
      SaveChat.findAll.mockRejectedValue(new Error("db"));
      await ChatController.getChatHistory(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe("saveChat", () => {
    test("201 on create", async () => {
      req.user.id = 20;
      req.body.text = "msg";
      await ChatController.saveChat(req, res, next);
      expect(SaveChat.create).toHaveBeenCalledWith({ UserId: 20, text: "msg" });
      expect(res.status).toHaveBeenCalledWith(201);
    });
    test("next() if missing text", async () => {
      req.body = {};
      await ChatController.saveChat(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
