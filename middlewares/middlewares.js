const { verifyToken } = require("../helpers/jwt");
const { User, Profile } = require("../models");

const protectorLogin = async (req, res, next) => {
  try {
    const token =
      req.cookies.accessToken || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "No token provided, please login" });
    }
    const decoded = await verifyToken(token);

    const user = await User.findOne({
      where: {
        id: decoded.id,
      },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      id: user.id,
      email: user.email,
    };
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    next(error);
  }
};

const protectorProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const profile = await Profile.findOne({
      where: {
        UserId: userId,
      },
    });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    req.profile = profile;
    next();
  } catch (error) {
    next(error);
  }
};

const protectorVerify = async (req, res, next) => {
  try {
    const { id } = req.user;
    const user = await User.findOne({ where: { id } });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "User not verified" });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  protectorLogin,
  protectorProfile,
  protectorVerify,
};
