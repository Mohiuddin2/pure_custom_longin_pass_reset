const express = require("express");
const router = express.Router();
const User = require("../models/User");
const crypto = require("crypto");
const ErrorResponse = require("../utility/errorResponse");
const asyncHandler = require("../utility/async");
const sendEmail = require("../utility/sendgmail");

// Register/signup route
router.get("/", (req, res) => {
  // res.send('success')
  res.render("register");
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    console.log("REgister");
    const { name, email, password } = req.body;
    //Create User
    const user = await User.create({
      name,
      email,
      password,
    });
    console.log("REgister2");
    // sendTokenResponse(user, 200, res);
    // res.send(req.body);
    sendTokenResponse(user, 200, res);
  })
);

router.get("/login", (req, res) => {
  res.render("login");
});

router.post(
  "/login",
  asyncHandler(async (req, res, next) => {
    console.log("it hits");
    const { email, password } = req.body;
    // Validate email & password
    if (!email || !password) {
      return next(new ErrorResponse("Please Input credentials", 400));
    }
    // Check for user
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new ErrorResponse("Email or Password is not valid", 401));
    }
    // check for Password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(new ErrorResponse("Email or Password is not valid", 401));
    }
    // const redirectUrl = 'http://viplevel.one/'; // to return expected path
    res.render("./home");
  })
);
router.get("/reset_password", (req, res) => {
  res.render("reset_pass");
});

router.get(
  "/reset_password/:resettoken",
  asyncHandler(async (req, res) => {
    const { resettoken } = req.params;
    res.render("reset_password_page", { resettoken });
  })
);

// Resetting Passwrd herer
router.put(
  "/reset_password/:resettoken",
  asyncHandler(async (req, res, next) => {
    console.log("Console reset password token");
    const resettoken = req.params.resettoken;
    console.log("From Param", resettoken);
    // const  resettoken  ="94f96454a8a1d8db6d5bf5b0895462fa86090fc0";
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resettoken)
      .digest("hex");

    console.log("resetPasswordToken", resetPasswordToken);

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });
    console.log("User", user);
    if (!user) {
      return next(new ErrorResponse("Invalid Reset Token", 400));
    }
    // if user is found set new password

    user.password = req.body.password;
    console.log("Passower new", user.password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  })
);
// @desc Forgot Password sending email with reset token
// @route POST /localhost:5000/reset_password
// @access Public
// reset Password email
router.post(
  "/reset-password",
  asyncHandler(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return next(new ErrorResponse("Email is not found in Database", 404));
    }
    // Generate resetToken
    const resetToken = user.getResetPasswordToken();
    await user.save({ validatBeforeSave: false });
    // Create reset url
    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/reset_password/${resetToken}`;

    const message = `Reset password request ${resetUrl}`;
    // sendEmail
    try {
      await sendEmail({
        email: user.email,
        subject: "Password reset token",
        message,
      });
      return res.status(200).json({ success: true, data: "Email Sent" });
    } catch (err) {
      console.log(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validatBeforeSave: false });
      return next(new ErrorResponse("Email could not be sent", 500));
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  })
);

// Get token from User Model, create cookie and send

const sendTokenResponse = (user, statusCode, res) => {
  // ⁡⁢⁣⁣create token⁡⁡
  const token = user.getSignedJwtToken();
  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }
  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
  });
};

module.exports = router;
