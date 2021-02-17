const Review = require('./../models/reviewModel');
const factory = require('./handlerFactory');
// const catchAsync = require('./../utils/catchAsync');

// exports.getAllReviews = catchAsync(async (req, res, next) => {
//     // const reviews = await Review.find();
    
//     // if there is tour id in the, show only reviews for that tour (GET /tours/234dgf43/reviews)
//     // otherwise, show all reviews (GET /reviews)
//     let filter = {};
//     if(req.params.tourId) filter = { tour: req.params.tourId };
//     const reviews = await Review.find(filter);

//     res.status(200).json({
//         status: 'success',
//         result: reviews.length,
//         data: {
//             reviews
//         }
//     });
// });

// exports.createReview = catchAsync(async (req, res, next) => { 
//     // Allow nested routes
//     if (!req.body.tour) req.body.tour = req.params.tourId;
//     if (!req.body.user) req.body.user = req.user.id;
    
//     const newReview = await Review.create(req.body);

//     res.status(201).json({
//         status: 'success',
//         data: {
//             newReview
//         }
//     });
// });

// middleware before createReview
exports.setTourUserIds = (req, res, next) => {
    // Allow nested routes
    if (!req.body.tour) req.body.tour = req.params.tourId;
    if (!req.body.user) req.body.user = req.user.id;
    next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);