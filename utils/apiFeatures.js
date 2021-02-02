class APIFeatures {
    // query is mongoose query object, queryString come from express; (which is req.query)
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        const queryObj = {...this.queryString};
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach(el => delete queryObj[el]);

        // sample queryObj:
        // {  duration: { $gte: 5 } } 
        // need to make this query:
        // {  duration: { '$gte': '5' } }

        // Advanced Filtering
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

        this.query = this.query.find(JSON.parse(queryStr));

        return this;
    }

    sort() {
        if (this.queryString.sort) {
            // API_URL?sort=price,ratingsAverage
            // need to make this query:
            // { sort: 'price ratingsAverage' }
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);

            // example of parameter pollution:
            // API_URL?sort=duration&sort=price
            // console.log(this.queryString.sort);
            // output: [ 'duration', 'price' ]
            // so, produced the error: TypeError: this.queryString.sort.split is not a function
        } else {
            this.query = this.query.sort('-createdAt');
        }

        return this;
    }

    limitFields() {
        if (this.queryString.fields) {
            // API_URL?fields=name,duration,difficulty,price
            // query.select('name duration difficulty price');
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else {
            this.query = this.query.select('-__v'); // exclude __v filed used by Mongoose
        }

        return this;
    }

    paginate() {
        // ?page=2&limit=10; 1-10, page-1; 11-20, page-2; 21-30, page-3
        // query = query.skip(10).limit(10)
        // ?page=3&limit=10;
        // query = query.skip(20).limit(10)
        const page = this.queryString.page * 1 || 1;    // by multiplying with 1, converting 
                                                        // string value into number
        const limit = this.queryString.limit * 1 || 100;
        const skip = (page - 1) * limit;

        this.query = this.query.skip(skip).limit(limit);

        return this;
    }
}

module.exports = APIFeatures;