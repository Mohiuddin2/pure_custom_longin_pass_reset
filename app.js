if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const dotenv = require("dotenv");
const session = require("express-session");
const flash = require("connect-flash");
// const ExpressError = require("./utility/ExpressError");

const cookieParser = require("cookie-parser");

// const helmet = require("helmet");

const mongoSanitize = require("express-mongo-sanitize");
const errorHandler = require("./middleware/errors");
const catchAsync = require("./utility/catchAsync");
const methodOverride = require("method-override"); // for delete and put req..

const userRoute = require("./routes/userRoute");

// Laod env vars
dotenv.config({ path: "./config/config.env" });

const MongoStore = require("connect-mongo");
// const MongoDBStore = require("connect-mongo")(session);

const db = require("./config/db");
// Connect DB
db();

app.use(express.json()); // Must be used for using json data
// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(errorHandler);
app.use(express.static(path.join(__dirname, "public")));
app.use(methodOverride("_method"));
app.use(cookieParser());
app.use(
  mongoSanitize({
    replaceWith: "_",
  })
);

app.use("/", userRoute); // put this mounting route last.. or before error handler like this

// This is mystry I need add this on project
app.all("*", (req, res, next) => {
  next(new ExpressError("Page Not Found", 404));
});

// default error handler..
app.use((err, req, res, next) => {
  const { statusCode = 500 } = err;
  if (!err.message) err.message = "Saomething Went Wrong";
  res.status(statusCode).render("error", { err });
});

const port = process.env.PORT || 5000;
// const port = 5000;

app.listen(port, () => {
  console.log(`Serving on port ${port}`);
});
