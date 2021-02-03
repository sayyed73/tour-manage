const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true  // the cookie cannot be accessed or modified in any way by the browser
                        // which is important to prevent cross-site scripting attacks.
    };

    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
    // the cookie will only be sent on an encrypted connection (HTTPS).

    res.cookie('jwt', token, cookieOptions);

    // in the schema, we set select: false for password. so it doesn't show up when we query for
    // all the users. But, in this case, it's shown as it comes from creating a new document.
    // Remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    // const newUser = await User.create(req.body);
    // security flaw. User is created from all the data from body. anyone can specify the role as
    // admin so he/she will be able to register as admin

    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangedAt: req.body.passwordChangedAt,
        role: req.body.role
    });

    createSendToken(newUser, 201, res);
});

exports.login = exports.login = catchAsync(async (req, res, next) => { 
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
        return next(new AppError('Please provide email and password!', 400));
    }

    // 2) Check if user exists && password is correct
    // const user = User.findOne({ email });  // password is not available here since we make the field
    // hidden from output. So, we need to explicitly Select that so it will be available in the 
    // output, so that we'll be able to verify the password

    const user = await User.findOne({ email }).select('+password');
    // console.log(user);

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401));
    }

    // 3) If everything ok, send token to client
    createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => { 
    // 1) Getting token and check if it's there
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];  //authorization: 'Bearer sampleToken1234',
    }
    // console.log(token);

    if (!token) {
        return next(
            new AppError('You are not logged in! Please log in to get access.', 401)
        );
    }

    // 2) Verification token (if someone manipulated the data or the token has already expired etc.)
    // jwt.verify(token, process.env.JWT_SECRET);
    // using promisify to make it return a promise so that it'll work like async await just like other 
    // async functions.
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    // console.log(decoded);
    // sample output: { id: '6012sg8dgids353ffsuf', iat: 1611923878, exp: 1619699878 }

    // 3) Check if user still exists (or deleted in the meantime)
    const currentUser = await User.findById(decoded.id);  // taking the id, decoded from payload
    if (!currentUser) {
      return next(
        new AppError(
          'The user belonging to this token does no longer exist.',
          401
        )
      );
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError('User recently changed password! Please log in again.', 401)
        );
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
});

// we came to this authorization middleware just after protecting middleware:
// delete(authController.protect, authController.restrictTo('admin', 'lead-guide'),.....)
// so, the route is already protected and verified that authorized user has come at this middleware.
// so, no need of asynchronous; now we need to pass the role arguments inside middleware. But, 
// middlewares are not allowed to accept parameter. That's why, we've wrapped a function
// with the parameter, then returned a new function which is the middleware itself
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // the array will check if the value available in user (which is accessible from previous 
        // middleware: // GRANT ACCESS TO PROTECTED ROUTE // req.user = currentUser;
        // ['admin', 'lead-guide']; error if role='user'
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError('You do not have permission to perform this action', 403)
            );
        }

        next();
    };
};

exports.forgotPassword = catchAsync(async (req, res, next) => { 
    // 1) Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('There is no user with email address.', 404));
    }

    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });  // saving the user without going through 
                                                     // validation

    // 3) Send it to user's email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request with your new password and 
                    passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please 
                    ignore this email!`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Your password reset token (valid for 10 min)',
            message
        });

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!'
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(
            new AppError('There was an error sending the email. Try again later!'),
            500
        );
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => { 
    // 1) Get user based on the token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });

    // 2) If token has not expired/manipulated, and there is user, set the new password
    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // 3) Update changedPasswordAt property for the user  (done at userModel)
    
    // 4) Log the user in, send JWT
    createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password');
  
    // 2) Check if POSTed current password is correct
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
      return next(new AppError('Your current password is wrong.', 401));
    }
  
    // 3) If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    // User.findByIdAndUpdate() will NOT work for validation and userSchema.pre('save') instances
  
    // 4) Log user in, send JWT
    createSendToken(user, 200, res);
});
  