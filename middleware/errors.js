
const ErrorResponse = require('../utility/errorResponse')

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    // Log to console for devloper
    console.log("VError:--", err);
    //Mongoose bad ObjectID
    if (err.name === 'CastError') {
      const message = `Resource not found`;
      error = new ErrorRespose(message, 404);
    }
    //Mongoose duplicate key error
    if (err.code === 11000) {
      const message = 'Duplicate Field Value Message';
      error = new ErrorRespose(message, 400);
    }
    //   Mongoose Validation Error
    if (err.name == 'ValidationError') { // if i set === it doen't work
      const message = Object.values(err.errors).map((val) => val.message);
      error = new ErrorRespose(message, 400);
    }
  
    console.log(error.name);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Server Error',
    });
  };
  
  module.exports = errorHandler;
  