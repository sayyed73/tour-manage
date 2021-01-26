class AppError extends Error {
  constructor(message, statusCode) {
    super(message);   // message is the only parameter that built-in error accepts

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;   // we'll only handle operational error here, not programming error
                                 // or other errors i.e package error etc.

    Error.captureStackTrace(this, this.constructor);   // 1st parameter is the current object, 2nd 
                                                       // is the AppError class itself
  }
}

module.exports = AppError;
