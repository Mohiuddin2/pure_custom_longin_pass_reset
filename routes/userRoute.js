const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Otp  = require("../models/otpModel");
const crypto = require("crypto");
const ErrorResponse = require("../utility/errorResponse");
const asyncHandler = require("../utility/async");
const sendEmail = require("../utility/sendgmail");
const Speakeasy = require("speakeasy");
const { findOne } = require("../models/User");

//
const _ = require("lodash");
const axios = require("axios");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcryptjs");

// Register/signup route
router.get("/", (req, res) => {
  // res.send('success')
  res.render("register");
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    //Create User

    const user = await User.create({
      name,
      email,
      password,
    });
    //  if(user) return res.status(400).send("Ueser is register")
    // const OTP = otpGenerator.generate(6,{
    //   digits: true, alphabets: false, upperCase: false, specialChars: false})
    const OTP = Math.floor(100000 + Math.random() * 900000);

    // const number = req.body.number;
    const name_for = user.name;
    console.log(OTP);

    const otp = new Otp({ name: name_for, otp: OTP });
    const salt = await bcrypt.genSalt(10);
    otp.otp = await bcrypt.hash(otp.otp, salt);
    const result = await otp.save();

    const message = `Reset OTP ${OTP}, Please copy the and follow the url http://localhost:3000/verify_otp/${user.name}`;

    // sendEmail
    try {
      await sendEmail({
        email: user.email,
        subject: "Registration OTP",
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
    sendTokenResponse(user, 200, res);
  })
);

router.get("/verify_otp/:name", async (req, res) => {
  const name = req.params.name;
  // console.log("grom get req", name)
  // const user = await Otp.findOne({ name});
  res.render("verify_otp", { name });
});

// *********** Verify OTP

router.post("/verify_otp/:name", async (req, res) => {
  console.log("hit verify");
  const name = req.params.name;
  console.log("req prams name", name);

  let otpHolderFound = await Otp.findOne({ name: name });
  console.log("cross otpholder", otpHolderFound.name);

  const otpHolder = otpHolderFound.name;

  if (otpHolder.length === undefined)
    return res.status(400).send("Your otp is expired");

  console.log("otpHolder.length", otpHolder.length);

  // const rightOtopFind = otpHolder[otpHolder.length - 1];

  const rightOtopFind = otpHolderFound.otp;

  console.log("rightopFind", rightOtopFind);
  const validUser = await bcrypt.compare(req.body.token, rightOtopFind);
  console.log("Valid", validUser);

  // if (rightOtopFind.number === id && validUser) {
  //   const user = new User(_.pick(req.body, ["id"]));
  //   const token = user.generateJWT();
  //   const result = await Otp.deleteMany({
  //     number: rightOtopFind.number,
  //   });
  //   return res.status(200).send({
  //     message: "Successfull",
  //     token,
  //     data: result
  //   })
  // } else{
  //   return res.status(400).send("Wrong OTP")
  // }

  if (validUser) {
    res.send("Status: Successfull");
  } else {
    res.send("Your OTP is wrong");
  }
});

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
// @desc Forgot Password sending email/OTP with reset token
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
    // const resetToken = user.getResetPasswordToken();
    // await user.save({ validatBeforeSave: false });
    // // Create reset url
    // const resetUrl = `${req.protocol}://${req.get(
    //   "host"
    // )}/reset_password/${resetToken}`;


    // Otp for reset password
    const OTP = Math.floor(100000 + Math.random() * 900000);

    
    const name_for = user.name;
    console.log(OTP);

    const otp = new Otp({ name: name_for, otp: OTP });
    const salt = await bcrypt.genSalt(10);
    otp.otp = await bcrypt.hash(otp.otp, salt);
    const result = await otp.save();

    const message = `Reset OTP ${OTP}, Please copy the and follow the url http://localhost:3000/verify_otp/${user.name}`
    
    // and Reset ResetToken ${resetUrl} `;

 
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
