const { match } = require('assert');
// const fs = require('fs');
// const { Query } = require('mongoose');
const Tour = require('./../models/tourModel');
const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// const tours = JSON.parse(
//     fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// ); 

// exports.checkId = (req, res, next, val) => {
//     console.log(`Tour id is: ${val}`);
    
//     if (req.params.id * 1 > tours.length) {
//         return res.status(404).json({
//             status: 'fail',
//             message: 'Invalid ID'
//         })
//     }

//     next();
// };

// exports.checkBody = (req, res, next) => {
//     if (!req.body.name || !req.body.price) {
//         return res.status(400).json({
//             status: 'fail',
//             message: 'Missing name or price'
//         })
//     }

//     next();
// }

// exports.getAllTours = async (req, res) => {
//     try {
//         // const tours = await Tour.find();  // return query object

//         // query string
//         //console.log(req.query);
        

//         // const tours = await Tour.find()
//         //     .where('duration')
//         //     .equals(5)
//         //     .where('difficulty')
//         //     .equals('easy');

//         // find() returns query object and come back with document that matchs with the query. 
//         // Model (Tour) can access objects  through protocol for example, Query.prototype.find(), 
//         // Query.prototype.sort() etc. that's why, we shouldn't use chaining like above method

//         // const tours = await Tour.find({
//         //     duration: 5,
//         //     difficulty: 'easy'

//         // });

//         //const tours = await Tour.find(req.query);

//         // BUILD QUERY
//         // 1A) Filtering
//         // const queryObj = {...req.query};
//         // const excludedFields = ['page', 'sort', 'limit', 'fields'];
//         // excludedFields.forEach(el => delete queryObj[el]);
        
//         // console.log(req.query, queryObj);

//         //const tours = await Tour.find(queryObj); // if we await at here initially, we will not be 
//         // able to implement features like sorting, pagination etc. so, we save into query at first, 
//         // then at the end, after chaining all the methods to the query we need, we'll await the 
//         // query 

//         // const query = Tour.find(queryObj);

//         // 1B) Advanced Filtering
//         // filtering works like this way:
//         // {  difficulty: 'easy', duration: { $gte: 5 } } 
//         // if we hit this url: API_URL?duration[gte]=5&difficulty=easy
//         // we'll get this by prining req.query:
//         // {  difficulty: 'easy', duration: { gte: '5' } } 

//         // let queryStr = JSON.stringify(queryObj);
//         // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
//         // //console.log(JSON.parse(queryStr));
//         // // output:
//         // // {  difficulty: 'easy', duration: { '$gte': '5' } } 

//         // let query = Tour.find(JSON.parse(queryStr));

//         // 2) Sorting
//         // API_URL?sort=price
//         // if we want descending order: // API_URL?sort=-price
        
//         // if (req.query.sort) {
//         //     //query = query.sort(req.query.sort);

//         //     // if two records are same, we can add a second rank
//         //     // API_URL?sort=price,ratingsAverage
//         //     // need to make this query:
//         //     // { sort: 'price ratingsAverage' }
//         //     const sortBy = req.query.sort.split(',').join(' ');
//         //     //console.log(sortBy);
//         //     query = query.sort(sortBy);
//         // } else {
//         //     // default
//         //     query = query.sort('-createdAt');
//         // }

//         // 3) Field limiting
//         // API_URL?fields=name,duration,difficulty,price
//         // if (req.query.fields) {
//         //     //query = query.select('name duration difficulty price');
//         //     const fields = req.query.fields.split(',').join(' ');
//         //     query = query.select(fields);
//         // } else {
//         //     query = query.select('-__v');  // query.select('name'); limit to (or include) only name
//         //                                    // query.select('-name'); exclude name (or include 
//         //                                    // everything except name), __v is a filed used by 
//                                               // mongoose
//         // }

//         // 4) pagination
//         // ?page=2&limit=10; 1-10, page-1; 11-20, page-2; 21-30, page-3
//         // query = query.skip(10).limit(10)
//         // ?page=3&limit=10;
//         // query = query.skip(20).limit(10)

//         // const page = req.query.page * 1 || 1;   // converting string value intpo number by 
//         //                                         // mulipying with 1; at or statement, setting 1 as 
//         //                                         // default if page is not set
//         // const limit = req.query.limit * 1 || 100;
//         // const skip = (page - 1) * limit;

//         // query = query.skip(skip).limit(limit);

//         // if (req.query.page) {
//         //     const numTours = await Tour.countDocuments();
//         //     if (skip >= numTours) throw new Error('This page does not exist');
//         // }

//         // our query is now something like this: query.sort().select().skip().limit()

//         // EXECUTE QUERY
//         //const tours = await query;

//         const features = new APIFeatures(Tour.find(), req.query)
//             .filter()
//             .sort()
//             .limitFields()
//             .paginate();
//         // new APIFeatures(Tour.find(), req.query) is returning an object, on that we applied
//         // filter() and then we chained sort(); but chaining won't work as filter() didn't return
//         // anything. That's why, added the returned object in return (return this) of all the methods

//         const tours = await features.query;

//         // SEND RESPONSE
//         res.status(200).json({
//             status: 'success',
//             //requestedAt: req.requestTime
//             results: tours.length,
//             data: {
//                 tours
//             }
//         });
//     } catch (err) {
//         res.status(404).json({
//             status: 'fail',
//             message: err
//         });
//     }
// }

// exports.getTour = async (req, res) => {
//     //console.log(req.params);  // output: { id: '5' } for url: 127.0.0.1:3000/api/v1/tours/5

//     //const id = req.params.id * 1; // converted above string, '5' into number

   
//     //const tour = tours.find(el => el.id === id);

//     //if (id > tours.length) {
//     // if (!tour) {
//     //     return res.status(404).json({
//     //         status: 'fail',
//     //         message: 'Invalid ID'
//     //     })
//     // }

//     try {
//         const tour = await Tour.findById(req.params.id);  // Tour.findOne({ _id: req.params.id })
        
//         res.status(200).json({
//             status: 'success',
//             data: {
//                 tour
//             }
//         });
//     } catch (err) {
//         res.status(404).json({
//             status: 'fail',
//             message: err
//         });
//     }  
// }

// exports.createTour = async (req, res) => {
//     //console.log(req.body);
//     //res.send('Done');

//     /*
//     const newID = tours[tours.length - 1].id + 1;
//     const newTour = Object.assign({ id: newID }, req.body);
//     tours.push(newTour);

//     fs.writeFile(
//         `${__dirname}/dev-data/data/tours-simple.json`,
//         JSON.stringify(tours),
//         err => {
//             res.status(201).json({
//                 status: 'success',
//                 data: {
//                     tours: newTour
//                 }
//             });
//         });
//         */
    
//     // Previously we did (in server.js), something like this for testing:
//     // const newTour = new Tour({});
//     // newTour.save();    // calling the method on documents which has the access on the model
    
//     // Here, we'll do like this:
//     // Tour.create({})    // calling the method directly on Tour, the model itself

//     try {
//         const newTour = await Tour.create(req.body);
    
//         res.status(201).json({
//             status: 'success',
//             data: {
//                 tours: newTour
//             }
//         })
//     } catch (err) {
//         res.status(400).json({
//             status: 'fail',
//             message: err
//         });
//     }
// }

// exports.updateTour = async (req, res) => {
//     // if (req.params.id * 1 > tours.length) {
//     //     return res.status(404).json({
//     //         status: 'fail',
//     //         message: 'Invalid ID'
//     //     })
//     // }

//     try {
//         const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//             new: true,
//             runValidators: true
//         });
        
//         res.status(200).json({
//             status: 'success',
//             data: {
//                 //tour: '<Updated tour here...>'
//                 //tour: tour
//                 tour
//             }
//         });
//     } catch (err) {
//         res.status(404).json({
//             status: 'fail',
//             message: err
//         });
//     }
// }

// exports.deleteTour = async (req, res) => {
//     // if (req.params.id * 1 > tours.length) {
//     //     return res.status(404).json({
//     //         status: 'fail',
//     //         message: 'Invalid ID'
//     //     })
//     // }

//     try {
//         const tour = await Tour.findByIdAndDelete(req.params.id);
        
//         res.status(204).json({
//             status: 'success',
//             data: null
//         });
//     } catch (err) {
//         res.status(404).json({
//             status: 'fail',
//             message: err
//         });
//     }
// }

// aggregation pipeline
// exports.getTourStats = async (req, res) => {
//     try {
//         // Tour.aggregate() returns aggregate object
//         const stats = await Tour.aggregate([
//         // stages
        
//         {
//           $match: { ratingsAverage: { $gte: 4.5 } }  // match means select query
//         },
//         {
//           $group: {
//             // _id: null,  // groupALL
//             // _id: '$difficulty',
//             // _id: '$ratingsAverage',
//             _id: { $toUpper: '$difficulty' },
//             numTours: { $sum: 1 },  // counting total tours, adding one for each documents
//             numRatings: { $sum: '$ratingsQuantity' },
//             avgRating: { $avg: '$ratingsAverage' },
//             avgPrice: { $avg: '$price' },
//             minPrice: { $min: '$price' },
//             maxPrice: { $max: '$price' }
//           }
//         },
//         {
//           $sort: { avgPrice: 1 }  // 1 for ascending, -1 for descending
//         }
//         // {
//         //   $match: { _id: { $ne: 'EASY' } }
//         // }
//       ]);
  
//       res.status(200).json({
//         status: 'success',
//         data: {
//           stats
//         }
//       });
//     } catch (err) {
//       res.status(404).json({
//         status: 'fail',
//         message: err
//       });
//     }
//   };

// exports.getMonthlyPlan = async (req, res) => {
//   try {
//     const year = req.params.year * 1; // 2021

//     const plan = await Tour.aggregate([
//       {
//         $unwind: '$startDates'
//       },
//       {
//         $match: {
//           startDates: {
//             $gte: new Date(`${year}-01-01`),
//             $lte: new Date(`${year}-12-31`)
//           }
//         }
//       },
//       {
//         $group: {
//           _id: { $month: '$startDates' },
//           numTourStarts: { $sum: 1 },
//           tours: { $push: '$name' }
//         }
//       },
//       {
//         $addFields: { month: '$_id' }
//       },
//       {
//         $project: {
//           _id: 0     // hide the _id; 1 for showing
//         }
//       },
//       {
//         $sort: { numTourStarts: -1 }
//       },
//       {
//         $limit: 12
//       }
//     ]);

//     res.status(200).json({
//       status: 'success',
//       data: {
//         plan
//       }
//     });
//   } catch (err) {
//     res.status(404).json({
//       status: 'fail',
//       message: err
//     });
//   }
// };

// aliasing route: 5 best cheap tours
// ?limit=5&sort=-ratingsAverage,price  // if two rating same, apply second rank, cheap price
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = 5;
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// we'll create a higher order function and wrap all our async function.
// const catchAsync = fn => {
//   return (req, res, next) => {
//     //fn(req, res, next).catch(err => next(err));
//     // in JavaScript, we can simplify it. all we need to pass here is the function, and it will then 
//     // be called automatically with the parameter that this callback receives. So it's the same as 
//     // writing like this.
//     fn(req, res, next).catch(next);
//   };
// };

exports.getAllTours = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const tours = await features.query;

  // SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours
    }
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id);  // Tour.findOne({ _id: req.params.id })

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
    // if we find error, we need to exit the function; otherwise error response and response
    // below (res.status(200).json({})), two response will try to be sent which will produce
    // system error
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour
    }
  });
});

exports.createTour = catchAsync(async (req, res, next) => {
  const newTour = await Tour.create(req.body);
  
  res.status(201).json({
      status: 'success',
      data: {
          tours: newTour
      }
  })
});

exports.updateTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour
    }
  });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }
      
  res.status(204).json({
      status: 'success',
      data: null
  });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } } 
    },
    {
      $group: {
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