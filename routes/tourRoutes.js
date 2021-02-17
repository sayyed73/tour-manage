const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
// const reviewController = require('./../controllers/reviewController');
const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router();

// POST /tours/234dgf43/reviews
// GET /tours/234dgf43/reviews
// GET /tours/234dgf43/reviews/935fdg45a

// these nested routes show relationship between the parent (tours) and child (reviews) resourses. 
// The nested route basically means to access the reviews resource on the tour's resource.
// Similarly, we also can access reviews from a certain tour route (/tours/234dgf43)
// router.
//     route('/:tourId/reviews')
//     .post(
//         authController.protect, 
//         authController.restrictTo('user'), 
//         reviewController.createReview
//     );
// Though reviews belongs to tours, we wrote here for simplicty. But, we already have review router
// for handling reviews. Besides that, the same block of code already exist in that file. So, 
// whenever, we get this type of url in tour router, we'll mount/redirect that to reviewRouter

router.use('/:tourId/reviews', reviewRouter);

// if we put this router below of route('/:id'), express will think '/top-5-cheap' is the 'id',
// that's why, keeping it above that route
router
    .route('/top-5-cheap')
    .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
    .route('/monthly-plan/:year')
    .get(
        authController.protect,
        authController.restrictTo('admin', 'lead-guide', 'guide'),
        tourController.getMonthlyPlan
    );

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// we could do this in query string like this:
// /tours-within?distance=233&center=-40,45&unit=mi
// but, we are following standard method by specifying routing like this:
// /tours-within/233/center/-40,45/unit/mi

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
    .route('/')
    .get(tourController.getAllTours)
    .post(
        authController.protect,
        authController.restrictTo('admin', 'lead-guide'),
        tourController.createTour
    );

router
    .route('/:id')
    .get(tourController.getTour)
    .patch(
        authController.protect,
        authController.restrictTo('admin', 'lead-guide'),
        tourController.updateTour
    )
    .delete(
        authController.protect,
        authController.restrictTo('admin', 'lead-guide'),
        tourController.deleteTour
    );

module.exports = router;