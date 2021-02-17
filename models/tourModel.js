const mongoose = require('mongoose');
const slugify = require('slugify');
// const validator = require('validator');
// const User = require('./userModel');

const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A tour must have a name'],
        unique: true,
        trim: true,
        maxlength: [40, 'A tour name must have less or equal then 40 characters'],
        minlength: [10, 'A tour name must have more or equal then 10 characters']
        //validate: [validator.isAlpha, 'Tour name must only contain characters']
    },
    duration: {
        type: Number,
        required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
        type: Number,
        required: [true, 'A tour must have a group size']
    },
    difficulty: {
        type: String,
        required: [true, 'A tour must have a difficulty'],
        enum: {
            values: ['easy', 'medium', 'difficult'],
            message: 'Difficulty is either: easy, medium, difficult'
        }
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, 'Rating must be above 1.0'],
        max: [5, 'Rating must be below 5.0'],
        // setter function run each time whenever there is a new value in the field
        set: val => Math.round(val * 10) / 10   // 4.666666, 46.6666, 47, 4.7
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: [true, 'A tour must have a price']
    },
    priceDiscount: {
        type: Number,
        validate: {
          validator: function(val) {
            // 'this' only points to current doc on NEW document creation, not other i.e. update doc
            return val < this.price;
          },
          message: 'Discount price ({VALUE}) should be below regular price'
        }
      },
    summary: {
        type: String,
        trim: true,
        required: [true, 'A tour must have a description']
    },
    description: {
        type: String,
        trim: true
    },
    imageCover: {
        type: String,
        required: [true, 'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false    // hide from response
    },
    startDates: [Date],
    slug: String,
    secretTour: {
        type: Boolean,
        default: false
    },
    startLocation: {
        // this object is not actually schema type option like above one (selectTour)
        // rather, it's an embedded object, inside the object, we can specify a couple of properties.
        // in order for this object to be recognized as geospatial JSON, we need the type and the 
        // coordinates properties at least. each of these sub-fields is then gonna get its own schema  
        // type options. So, we have now 'type' schema type options and 'coordinates' schema type 
        // options just like the above 'secretTour' schema type option. But, in this case, the schema 
        // type options (i.e. type, coordinates) are sub-fields.
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']     // geospatial data in MongoDB also accepts other complex geometries 
                                // i.e. lines, polygons, multi-polygons etc.
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    // in order to create new documents (to embed those into another document), we need to create 
    // array. Note that, startLocation is not a document itslef, it's just an object describing a 
    // certain point on earth. We could make it simple by deleting startLocation and defining 1st
    // location in the array as startLocation (by setting day number: 0). So, we are specifying
    // basically an array of objects here, this will then create brand new documents inside of the 
    // parent document, which is, in this case, the tour.
    locations: [
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number
        }
    ],
    // embedding tour guide documents into a tour document
    // guides: Array
    // child referencing
    guides: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        }
    ]
},
{
    // 1st parameter to the mongoose.Schema is object with schema definition itself, 2nd parameter
    // is object with schema option
    toJSON: { virtuals: true },   // virtuals will be the part to the output
    toObject: { virtuals: true }  // when data gets outputed as object
});

// setting index only to most queried fields. index use resourses too. So, it's not wise to set index
// for every fields blindly. Aslo, when a collection has high write-read ration, no need to create 
// index at all as the cost of always updating the index and keeping that in memory clearly outweighs 
// the benefit
// tourSchema.index({ price: 1 });   // 1 for ascending order, -1 for descending
tourSchema.index({ price: 1, ratingsAverage: -1 });   // compound index; also works for single field
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });  // for $geoWithin, the index need to be either  
// '2dsphere' (if the data describes real points on the Earth aka sphere) or '2d indexes' (if we use
// just fictional points on a simple two dimensional plane).

// virtual properties 
tourSchema.virtual('durationWeeks').get(function() {
    return this.duration / 7;
});

// We couldn't acesse reviews from a tour as we used parent refrencing in review. So, we can achieve
// like child referencing in tour with Mongoose virtual properties so that it won't be persisted in
// DB actually. Now, we're able to get all corresponding reviews from a tour
// Virtual populate
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id'
});

// Like Express, Mongoose also have middlewars. It has 4.
// 1) DOCUMENT MIDDLEWARE: runs before .save() and .create() document. Except saving and creating, 
// this 'save' middleware won't be triggered for example at the time of findByIdAndUpdate()
tourSchema.pre('save', function(next) {
    // console.log(this);
    // the printed output is the object which will be saved on the db. before saving there, we can
    //modify it here

    // slug is basically just a string that we can put in the URL, usually based on some string like
    // the name.
    this.slug = slugify(this.name, { lower: true });
    next();
});

// (for enbedding) retrieving user documents corresponding to the user IDs, then save 
// tourSchema.pre('save', async function(next) {
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });
// this works only for creating new documents, not for updating them. We need to implement same logic
// also for updating them. But, we are not doing it. Becasue, we'll use referencing instead of 
// embedding as there are some drawbacks to use embedding in this case. For example, imagine that a 
// tour guide updates his email address, or they change their role from guide to lead guide. Each time 
// one of these changes would happen, then we have to check if a tour has that user as a guide, and if
// so, then update the tour as well.

// we can have multiple middlewars for same hook. For example, we can add another pre-save middleware
// or pre-save hook.
// tourSchema.pre('save', function(next) {
//   console.log('Will save document...');
//   next();
// });

// post middlewars will be executed after completeing all pre-middlewars. first parameter is just 
// finished (saved/created) document
// tourSchema.post('save', function(doc, next) {
//   console.log(doc);
//   next();
// });

// 2) QUERY MIDDLEWARE: allows us to run functions before or after a certain query is executed.
// this pre-find hook will run before any find() query excecuted. 
// this middleware should be executed before all find such as find(), findOne() etc.
//tourSchema.pre('find', function (next) {
tourSchema.pre(/^find/, function(next) {
    this.find({ secretTour: { $ne: true } });
    // Here, 'this' refer to current query object, not current documnet. SO, we can chain all of the 
    // methods that we have for queries.
    
    this.start = Date.now();
    next();
});

tourSchema.pre(/^find/, function(next) {
    // this means current query
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt'
    });

    next();
});

// execute after finishing the query execution
tourSchema.post(/^find/, function(docs, next) {
    console.log(`Query took ${Date.now() - this.start} milliseconds!`);
    //console.log(docs);
    next();
});

// 3) AGGREGATION MIDDLEWARE
tourSchema.pre('aggregate', function(next) {
    // 'Super Secret Tour' still processed at aggregration for example, total number of tours,
    // 'numTours' calculated by considering that secret tour too. We need to exclude that at
    // before executing aggregration too. here, this refer to current aggregration object 
    // unshift is: adding an element at the beginning of the array; shift is for the end
    // this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
    
    // if there is $geoNear, add this after $geoNear as $geoNear need to be the first stage always
    // const queryOne = Object.keys(this.pipeline()[0]);
    // if (queryOne[0] !== '$geoNear') {
    if (!'$geoNear' in this.pipeline()[0]) {
        this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
    } else {
        this.pipeline().splice(1, 0, { $match: { secretTour: { $ne: true } } });
    }
    
    console.log(this.pipeline());

    next();
});

// 4) MODEL MIDDLEWARE: not important; so won't implement now

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;