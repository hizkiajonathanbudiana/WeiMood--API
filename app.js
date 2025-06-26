if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const routers = require("./routers/routers.js");
const cors = require("cors");
const cookieParser = require("cookie-parser");

app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(routers);

app.use((error, req, res, next) => {
  let code = 500;
  let message = "Internal Server Error";

  console.log("Error:", error);

  if (
    error.name === "SequelizeValidationError" ||
    error.name === "SequelizeUniqueConstraintError"
  ) {
    code = 400;
    if (error.errors && error.errors.length > 0) {
      message = error.errors[0].message;
    } else {
      message = error.message;
    }
  } else if (error.name === "JsonWebTokenError") {
    code = 401;
    message = "Invalid token";
  } else if (error.name === "TokenExpiredError") {
    code = 401;
    message = "Token expired";
  } else if (error.message === "NOTFOUND") {
    code = 404;
    message = "Resource not found";
  } else if (error.message === "FORBIDDEN") {
    code = 403;
    message = "Access forbidden";
  } else if (error.message === "BADREQUEST") {
    code = 400;
    message = "Bad request";
  } else if (error.message === "UNAUTHORIZED") {
    code = 401;
    message = "Unauthorized";
  } else if (error.message === "PROFILENOTFOUND") {
    code = 404;
    message = "Profile not found";
  } else if (error.message === "USERNOTFOUND") {
    code = 404;
    message = "User not found";
  } else if (
    error.message === "LOGININVALID" ||
    error.message === "INVALIDLOGIN"
  ) {
    code = 401;
    message = "Invalid email or password";
  } else if (error.message === "MOODNOTFOUND") {
    code = 404;
    message = "Please select the option that suits your current mood";
  } else if (error.message === "MESSAGENOTFOUND") {
    code = 404;
    message = "Please enter any request message";
  } else if (error.message === "CHATNOTFOUND") {
    code = 404;
    message = "Chat not found";
  }

  res.status(code).send({ message });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app; // Export app for testing purposes
