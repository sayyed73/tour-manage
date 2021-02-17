// review / rating / createdAt / ref to tour / ref to user
const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
    {
      review: {
        type: String,
        required: [true, 'Review can not be empty!']
      },
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'Review must belong to a tour.']
      },
      user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Review must belong to a user']
      }
    },
    {
      toJSON: { virtuals: true },
      toObject: { virtuals: true }
    }
);

// a user should allowed to write one review for a tour. So, making this combination as unique
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// populating with tour and user data
reviewSchema.pre(/^find/, function(next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name'
  // }).populate({
  //   path: 'user',
  //   select: 'name photo'
  // });
  // we've written virtual population at tourModel to get all corresponding reviews from a tour. So,
  // inside the tour, there were all reviews, inside the reviews there were again details of the tour
  // we need to stop the population of chain . Basically, we need not tour details even from a review. 
  // So, only, populating tour id inside a review  (by not specifying anything for path: 'tour'. id 
  // is generated automatically)
  this.populate({
    path: 'user',
    select: 'name photo'
  });

  next();
});

// we want to store summary of a related data set on the main data set to prevent constantly queries
// of the related data set. So, we'll store the average rating and the number of ratings on each tour,
// so that we don't have to query the reviews and calculate that average each time that we query for
// all tours

// static method is a feature of Mongoose which we'll use here. At past, we only used instance method,
// which we can call on documents. Rule to write function using Static method here: reviewSchema then  
// static keyword, then function name. Our function takes tourId that's the tour to which current  
// review belongs to. In a static method 'this' points to current model. We need to call 
// this.aggregate on the model direcftly. That's why, we are using a static method.
// In the aggregate method, our first step is to select all the reviews that belong to the current 
// tour we want to update; the next stage will be calculating the statistics themselves
// After writing this function, we'll use middleware to call the function to update the corresponding
// tour document each time that there is a new review or one is updated or deleted.
// created this function as a static method as we needed to call the aggregate function on the model
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }   // select all the reviews that matched the current tour ID
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  // console.log(stats);
  // sample output: [ { _id: 35350fswfsf7, nRating: 3, avgRating: 4 } ]
  // at the time of deleting only available review, we get the error: Cannot read property 'nRating' 
  // of undefined. Becasue, from the above console.log we saw that we get output: [] in that case
  // as there are no review left (after deletion)
  // save the statisctics in current tour
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

// call the function after a new review has been created
reviewSchema.post('save', function() {
  // this points to current review
  // Review.calcAverageRatings(this.tour);
  // this won't work as Review isn't defined yet. We may think to move this block after the  
  // declaration, const Review = ....  But, that won't work either. Because reviewSchema would not
  // contain this middleware if we declare it after the Review model was already created. So, we'll
  // use constructor which is basically the model who created that document.
  this.constructor.calcAverageRatings(this.tour);   // points to the current model
});

// calculate review statistics when review is updated or deleted using findByIdAndUpdate and
// findByIdAndDelete respectively. So, need to work for findOneAndUpdate & findOneAndDelete
// reviewSchema.pre(/^findOneAnd/, async function(next) {
//   // this refer current query not current document (as we only can use query middleware here; 
//   // explaination before post-middleware block). But, we need current document. That's why, we can
//   // use findOne() to retrieve the current document
//   this.r = await this.findOne();
//   console.log(this.r);
//   next();
// });

// we don't have document middleware in this function as we are using post(<pattern>) instead of
// post(save) may be. So, we can't call the calcAverageRatings function directly here. Becasue, we 
// only can use query middleware here. And in that we don't have directly access to the current 
// document. That's why, we retrived current document at pre-middleware above block and stored in a 
// variable. In order to pass data from pre-middleware to post-middleware, instead of storing in a  
// simple variable (const r = await this.findOne();), we created a property on the variable
// reviewSchema.post(/^findOneAnd/, async function() {
//   // await this.findOne(); does NOT work here, query has already executed
//   await this.r.constructor.calcAverageRatings(this.r.tour);
// });

// alternate solution: Post middleware can get the document as the first argument. So the post 
// middleware will get the updated review as an argument
reviewSchema.post(/^findOneAnd/, async function(doc) {
  // added check so instead of 500 system error, returning 404 error message if doc is null
  if (doc) {
    await doc.constructor.calcAverageRatings(doc.tour);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;