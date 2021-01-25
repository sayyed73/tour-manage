const mongoose = require('mongoose');
const slugify = require('slugify');
//const validator = require('validator');

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
        max: [5, 'Rating must be below 5.0']
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
            // this only points to current doc on NEW document creation, not other i.e. update doc
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
    }
},
{
    // 1st parameter to the mongoose.Schema is object with schema definition itself, 2nd parameter
    // is object with schema option
    toJSON: { virtuals: true },   // virtuals will be the part to the output
    toObject: { virtuals: true }  // when data gets outputed as object
});

// virtual properties don't save on database; for example, we need weeklyDuration. Instead of
// saving it on db, we can make and store the convertion virtually in mongoose model. So, it's
// not gonna be persisted on the db, but it's gonna be there as soon as we get the data.
// we MUST use REGULAR FUNCTION instead of ARROW FUNCTION. Because, arrow function don't have
// it's OWN 'this' keyword, Regular function has. We need to point the current document by 'this'
// keyword. So, whenever, we need to use own 'this' in a function, we need to use Regular function
// instead of Arrow Function. That's why, in many cases in mongose, we'll use Regular function.
// To be avilable On the output, we need to explicitly define on schema that we need virtual 
// properties to be outputed. However, we can't use virtual properties on query as they are not 
// actually part of the db. For example, it won't work: 
// Tour.find({$where('durationWeeks'=1)})  // query might not be correct
tourSchema.virtual('durationWeeks').get(function() {
    return this.duration / 7;
});
// we could also have done this conversion each time after we query the data, for example,
// like in a controller, but that would not be the best practice simply because we want to try
// to keep business logic and application logic as much separated as possible. So knowing the 
// duration in weeks is a business logic because it has to do with the business itself, not with 
// stuff like requests or responses, and so we do the calculation right in the model where it belongs
// and not in the controller. We works on Fat Model, thin controller philosophy by the way.

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
//tourSchema.pre('find', function (next) {
// this middleware should be executed before all find such as find(), findOne() etc. Othewise, if
// anyone know the id of that secret-tour, it can be accessible (verify it with getTour route which
// is get a single tour with the id).
tourSchema.pre(/^find/, function(next) {
    this.find({ secretTour: { $ne: true } });
    // Here, 'this' refer to current query object, not current documnet. SO, we can chain all of the 
    // methods that we have for queries.

    // in postman, "secretTour": false is showing for all the tours. But, it shouln't show on all
    // the tours as that "secretTour" didn't exist at schema when those tours created.. Basically, 
    // it's ("secretTour") not in the database for all tours (except the tour, "Super Secret Tour" 
    // which was created after defining that "secretTour" setting in schema). To verify it, check
    // the Mongodb Compass. It's just Mongoose showing it on the postman for all the tours too .
    // anyway.
    
    this.start = Date.now();
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
    // before executing aggregration too. here, this refer to current arregation object 
    // unshift is: adding an element at the beginning of the array
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

    console.log(this.pipeline());
    next();
});

// 4) MODEL MIDDLEWARE: not important, so didn't discuss

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;