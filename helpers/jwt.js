const jwt = require("jsonwebtoken");

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

if (!JWT_ACCESS_SECRET) {
  throw new Error("JWT_ACCESS_SECRET is not defined in environment variables");
}
function generateToken(user, expires = "7d") {
  let payload = {
    id: user.id,
    email: user.email,
    verifyCode: user.verifyCode,
  };

  const options = {
    expiresIn: expires,
  };

  return jwt.sign(payload, JWT_ACCESS_SECRET, options);
}
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET);
  } catch (error) {
    throw new Error("Invalid token");
  }
}

module.exports = {
  generateToken,
  verifyToken,
};
