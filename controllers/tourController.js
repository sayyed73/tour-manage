//const { match } = require('assert');

const Tour = require('./../models/tourModel');
// const APIFeatures = require('./../utils/apiFeatures');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// aliasing route: 5 best cheap tours
// ?limit=5&sort=-ratingsAverage,price  // if two rating same, apply second rank, cheap price
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = 5;
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// we've created a higher order function, wrapped all our async function and catch the error.
// exports.getAllTours = catchAsync(async (req, res, next) => {
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();

//   // new APIFeatures(Tour.find(), req.query) is returning an object, on that we applied
//   // filter() and then we chained sort(); but chaining won't work as filter() didn't return
//   // anything. That's why, added the returned object in return (return this) of all the methods

//   const tours = await features.query;

//   // SEND RESPONSE
//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours
//     }
//   });
// });

// exports.getTour = catchAsync(async (req, res, next) => {
//   // const tour = await Tour.findById(req.params.id);  // Tour.findOne({ _id: req.params.id })

//   // populating fields based on the reference in query (not in DB)
//   // const tour = await Tour.findById(req.params.id).populate('guides'); 
//   // const tour = await Tour.findById(req.params.id).populate({
//   //   path: 'guides',
//   //   select: '-__v -passwordChangedAt'
//   // });
//   // we need to same functionality in other routes i.e. getAllTours, updateTour. So, moving this 
//   // to the middleware in tourModel

//   const tour = await Tour.findById(req.params.id).populate('reviews');

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour
//     }
//   });
// });

// exports.createTour = catchAsync(async (req, res, next) => {
//   const newTour = await Tour.create(req.body);
  
//   res.status(201).json({
//       status: 'success',
//       data: {
//           tours: newTour
//       }
//   })
// });

// exports.updateTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true
//   });

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour
//     }
//   });
// });

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }
      
//   res.status(204).json({
//       status: 'success',
//       data: null
//   });
// });

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } } 
    },
    {
      $group: {
        // _id: null,  // groupALL,
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },  // counting total tours, adding one for each documents
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }  // 1 for ascending, -1 for descending
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; 

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0     // hide the _id; 1 for showing
      }
    },
    {
      $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.111745,-118.113491/unit/mi
// finding tours within a range (i.e. 233 miles) from our location (coordinates)
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // to calculate radians, we need to divide our distance by the radius of the earth
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  // The radious of earth is 3963.2 in mile and 6378.1 in km

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitutr and longitude in the format lat,lng.',
        400
      )
    );
  }

  // console.log(distance, lat, lng, unit);

  const tours = await Tour.find({
    // this geospatial query find documents that are located within a certain distance of our 
    // starting point (our location). We want to query for startLocation basically as startLocation 
    // is the field that holds the geospatial point where each tour starts. To specify the value that 
    // we  are searching for, we are using Geospatial operator, $geoWithin which finds documents
    // within a certain geometry. We can find them in sphere. The $centerSphere operator takes an 
    // array which contains the coordinates and the radius measured in radians unit. In order to be 
    // do just basic queries, we need to first attribute an index to the field where the geospatial
    // data that we're searching for is stored. So in this case, we need to add an index to
    // startLocation (done at tourModel). More info and different operator and options can be found 
    // at: https://docs.mongodb.com/manual/geospatial-queries
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

// calculating distances of all tours from our location
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // if param contains 'mi' (mile), convert the outputed meter value into mile (1 meter = 0.000621371
  // mile); if the unit is 'km', convert meter into km
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitutr and longitude in the format lat,lng.',
        400
      )
    );
  }

  // for geospatial aggregation, geoNear must be in the first stage. Also geoNear requires at least
  // one of the fields ontains a geospatial index. We already have 2dsphere geospatial index on
  // startLocation. If there's only one field with a geospatial index, geoNear stage will  
  // automatically use that index to perform the calculation. But if there are multiple fields with 
  // geospatial indexes, then keys parameter will be needed to be used to define the field that will
  // be used for calculations. 'near' is the point from which to calculate the distances. So, we'll
  // pass our coordinates and spedify that property as GeoJSON point
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]  // converting it to numbers by multiplying by 1
        },
        distanceField: 'distance',    // 'distance' will be created as output filed and calculated 
                                      // distances will be stored there
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,   // 1 means to show, 0 means to hide. We only want 'distance' and 'name' fields
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});