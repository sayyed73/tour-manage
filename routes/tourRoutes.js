const express = require('express');
const tourController = require('./../controllers/tourController');

const router = express.Router();

// param middleware
// router.param('id', tourController.checkId);

// if we put this router below of route('/:id'), express will think '/top-5-cheap' is the 'id',
// that's why, keeping it above that route
router
    .route('/top-5-cheap')
    .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router.route('/monthly-plan/:year').get(tourController.getMonthlyPlan);

router
    .route('/')
    .get(tourController.getAllTours)
    //.post(tourController.checkBody, tourController.createTour);
    .post(tourController.createTour);

router
    .route('/:id')
    .get(tourController.getTour)
    .patch(tourController.updateTour)
    .delete(tourController.deleteTour);


module.exports = router;