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
    // This geospatial query is for startLocation as startLocation is the field that holds the 
    // geospatial point where each tour starts. We want to find documents that are located within a 
    // certain distance of our location. We are using Geospatial operator, $geoWithin which finds 
    // documents within a certain geometry. The $centerSphere operator takes an array which contains
    // the coordinates and the radius measured in radians unit. We need to add an index to
    // startLocation (done at tourModel)
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
  // pass our coordinates and spedify that 'near' property as GeoJSON point
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