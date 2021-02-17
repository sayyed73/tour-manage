const User = require('./../models/userModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

const filterObj = (obj, ...allowedFields) => {
    // we're getting: allowedFields = [ 'name', 'email' ]
    const newObj = {};
    Object.keys(obj).forEach(el => {
      if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
};

// exports.getAllUsers = catchAsync(async (req, res, next) => {
//     const users = await User.find();

//     // SEND RESPONSE
//     res.status(200).json({
//         status: 'success',
//         results: users.length,
//         data: {
//             users
//         }
//     });
// });

// GET /me needs current user id from login and doesn't require id from param (like getUser coming 
// from getOne factory function). So, to use that function for getting current user's data, we're
// creating this middleware to assign the id at params.
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
    // 1) Create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
      return next(
        new AppError(
          'This route is not for password updates. Please use /updateMyPassword.',
          400
        )
      );
    }
  
    // 2) Filtered out unwanted fields names that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'email');
  
    // 3) Update user document
    // const user = await User.findById(req.user.id);
    // user.name = 'hridoy',
    // await user.save();
    // we can't use save() as some fileds are required and we can't pass without validation
    // as we are not dealing with password or other sensitive data now, so we can go with 
    // findByIdAndUpdate(); in the 2nd parameter, we didn't pass req.body as we needed to filtered
    // object. otherwise, all will be allowed to be updated i.e. role etc. which we don't want.
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
      new: true,  // new document
      runValidators: true
    });
  
    res.status(200).json({
      status: 'success',
      data: {
        // user
        user: updatedUser
      }
    });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false });
  
    res.status(204).json({
      status: 'success',
      data: null
    });
});

exports.createUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not yet defined! Please use /signup instead'
    })
}

// exports.getUser = (req, res) => {
//     res.status(500).json({
//         status: 'error',
//         message: 'This route is not yet defined!'
//     })
// }

// exports.updateUser = (req, res) => {
//     res.status(500).json({
//         status: 'error',
//         message: 'This route is not yet defined!'
//     })
// }

// exports.deleteUser = (req, res) => {
//     res.status(500).json({
//         status: 'error',
//         message: 'This route is not yet defined!'
//     })
// }

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);