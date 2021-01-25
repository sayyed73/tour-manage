class AppError extends Error {
  constructor(message, statusCode) {
    super(message);   // message is the only parameter that built-in error accepts

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;   // we'll only handle operational error here, not programming error
                                 // or other errors i.e package error etc.

    Error.captureStackTrace(this, this.constructor);   // 1st parameter is the current object, 2nd 
                                                       // is the AppError class itself
    // this method Creates a .stack property on targetObject (1st arg), which when accessed returns 
    // a string representing the location in the code at which Error.captureStackTrace() was called.
    // The optional constructorOpt argument (2nd arg) accepts a function. If given, all frames above 
    // constructorOpt, including constructorOpt, will be omitted from the generated stack trace.
    // So, by this way, when a new object is created and constructor function is called, we can
    // prevent that function call appears in the stack trace. Thus we can omit implementation 
    // details of error generation to the user
  }
}

module.exports = AppError;
