const { User } = require("../models");
const { hashPassword, comparePasswords } = require("../helpers/bcrypt");
const { generateToken, verifyToken } = require("../helpers/jwt");
const { OAuth2Client } = require("google-auth-library");
const { transporter } = require("../helpers/mailer");
const isProd = process.env.NODE_ENV === "production";
class userController {
  static async verifyCodeHandler(req, res, next) {
    try {
      const { verifyCode } = req.body;
      if (!verifyCode) {
        return res
          .status(400)
          .json({ message: "Verification code is required" });
      }

      const decoded = verifyToken(req.cookies.weiVerifyCode);

      if (!decoded) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      if (verifyCode !== decoded.verifyCode) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      console.log("VERIFICATION CODE MATCHES");
      await User.update({ isVerified: true }, { where: { id: decoded.id } });
      res.status(200).json({ message: "Email verified successfully" });
    } catch (error) {
      next(error);
    }
  }

  static async sendVerificationEmail(req, res, next) {
    try {
      const { id, email } = req.user;

      const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
      const mailOptions = {
        from: process.env.MAILER_EMAIL,
        to: email,
        subject: "Email Verification",
        html: `
             <div style="font-family: Arial, sans-serif; padding: 20px;">
               <h2>Email Verification</h2>
               <p>Your verification code is:</p>
                 <div style="font-size: 24px; font-weight: bold; margin-top: 10px; color: #2c3e50;">
                   ${verifyCode}
                 </div>
               <p style="margin-top: 20px;">If you didn't request this, just ignore it.</p>
            </div> `,
      };

      const jwtToken = generateToken({ id, email, verifyCode }, "1h");

      res.cookie("weiVerifyCode", jwtToken, {
        httpOnly: true,
        secure: true,
        sameSite: isProd ? "None" : "Lax",
        path: "/",
        domain: ".hizkiajonathanbudiana.my.id",
        maxAge: 5 * 60 * 60 * 1000,
      });

      await transporter.sendMail(mailOptions);

      res.status(201).json({
        message:
          "Send verification code successful. Please check your email for verification link.",
      });
    } catch (error) {
      throw new Error("EMAILSENDINGFAILED");
    }
  }

  static async googleLogin(req, res, next) {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      const email = payload.email;
      const googleSub = payload.sub;

      let user = await User.findOne({ where: { email } });
      if (!user) {
        user = await User.create({
          email,
          googleSub,
          provider: "google",
          password: null,
          isVerified: true, // Set to true for Google users
        });
      } else if (!user.googleSub) {
        user.googleSub = googleSub;
        user.provider = "google";
        await user.save();
      }
      const jwtToken = generateToken({ id: user.id });

      res.cookie("accessToken", jwtToken, {
        httpOnly: true,
        secure: true,
        sameSite: isProd ? "None" : "Lax",
        path: "/",
        domain: ".hizkiajonathanbudiana.my.id",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ token: jwtToken, access_token: jwtToken });
    } catch (error) {
      next(error);
    }
  }

  static async registerHandler(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        throw new Error("INVALIDLOGIN");
      }

      const newUser = await User.create({ email, password });
      res.status(201).json(newUser);
    } catch (error) {
      next(error);
    }
  }

  static async loginHandler(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        throw new Error("INVALIDLOGIN");
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new Error("INVALIDLOGIN");
      }
      const isValidPassword = await comparePasswords(password, user.password);
      if (!isValidPassword) {
        throw new Error("INVALIDLOGIN");
      }
      const jwtToken = generateToken({ id: user.id });

      res.cookie("accessToken", jwtToken, {
        httpOnly: true,
        secure: true,
        sameSite: isProd ? "None" : "Lax",
        path: "/",
        domain: ".hizkiajonathanbudiana.my.id",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ token: jwtToken, access_token: jwtToken });
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req, res, next) {
    try {
      const userId = req.params.id;
      const updatedData = req.body;
      const updatedUser = await this.userService.updateUser(
        userId,
        updatedData
      );
      if (!updatedUser) {
        throw new Error("USERNOTFOUND");
      }
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = userController;
