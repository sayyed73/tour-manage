const express = require('express');
const morgan = require('morgan');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

// 1) MIDDLEWARS

//console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.use(express.json());   
app.use(express.static(`${__dirname}/public`));

// global middlewares. order of a middleware is important and work periodically in 
// Request-Respone cycle
// app.use((req, res, next) => {
//     console.log('Hello from the middleware 👋');
//     next();
// });

app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    next();
});
  

// mounting routers
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

// route handler for a route that was not cached by any route handlers
// need to put this at the end of all handlers. If we keep this at top, all request'll trigger it.
app.all('*', (req, res, next) => {
    // res.status(404).json({
    //     status: 'fail',
    //     message: `Can't find ${req.originalUrl} on this server!`
    // });

    // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
    // err.status = 'fail';
    // err.statusCode = 404;

    // next(err);  // argument in next() means it's must an error; so all other middlewars in stack 
    //             // will be skipped and pass this middleware to global error handler middleware

    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error handler middleware
// app.use((err, req, res, next) => {
//     console.log(err.stack);

//     err.statusCode = err.statusCode || 500;
//     err.status = err.status || 'error';

// if we hit url for example: 127.0.0.1:3000/api/v1/tours/sadasf
// we get 500 as statusCode; it came from above line, (err.statusCode = err.statusCode || 500;)
// this errors come from Mongoose and it's complex to add status code here. So, we'll deal with
// another way.

//     res.status(err.statusCode).json({
//         status: err.status,
//         message: err.message
//     });
// });

app.use(globalErrorHandler);

module.exports = app;
