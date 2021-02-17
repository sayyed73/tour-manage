const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

const router = express.Router({ mergeParams: true });
// POST /tours/234dgf43/reviews
// GET /tours/234dgf43/reviews
// POST /reviews
// In the nested routes (1st & 2nd), we didn't have access to the tour id here; that's why, we 
// physically merged the parameters (mergeParams: true)

router.use(authController.protect);

router
    .route('/')
    .get(reviewController.getAllReviews)
    .post(
        authController.protect,
        authController.restrictTo('user'),
        reviewController.setTourUserIds,
        reviewController.createReview
    );

router
    .route('/:id')
    .get(reviewController.getReview)
    .patch(
        authController.restrictTo('user', 'admin'), 
        reviewController.updateReview
    )
    .delete(
        authController.restrictTo('user', 'admin'), 
        reviewController.deleteReview
    );

module.exports = router;