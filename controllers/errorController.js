const AppError = require('./../utils/appError');

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    console.log(value);
  
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);
  
    const message = `Invalid input data. ${errors.join('. ')}`;  // joining multiple error 
    // messages in case there are multiple for multiple wrong filed's value
    return new AppError(message, 400);
  };

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });

    // Programming or other unknown error: no need to leak error details to clients
    } else {
        // 1) Log error
        console.error('ERROR 💥', err);

        // 2) Send generic message
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!'
        });
    }
};

module.exports = (err, req, res, next) => {
    //console.log(err.stack);

    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // res.status(err.statusCode).json({
    //     status: err.status,
    //     message: err.message
    // });

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = { ...err };

        // marking these 3 Mongoose errors as Operational Error
        // 1) handling invalid Database Id
        if (err.name === 'CastError') error = handleCastErrorDB(err);

        // 2) handling duplicate database fields
        if (err.code === 11000) error = handleDuplicateFieldsDB(err);

        // 3) handling validation error
        if (err.name === 'ValidationError') error = handleValidationErrorDB(err);

        sendErrorProd(error, res);
    }
}