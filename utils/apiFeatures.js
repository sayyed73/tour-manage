class APIFeatures {
    // query is mongoose query object, queryString come from express; (which is req.query)
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        //const queryObj = {...req.query};
        const queryObj = {...this.queryString};
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach(el => delete queryObj[el]);

        // 1B) Advanced Filtering
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

        //let query = Tour.find(JSON.parse(queryStr));
        this.query = this.query.find(JSON.parse(queryStr));

        // comment for this return is written below: const features = new APIFeatures()...
        return this;
    }

    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            this.query = this.query.sort('-createdAt');
        }

        return this;
    }

    limitFields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else {
            this.query = this.query.select('-__v'); 
        }

        return this;
    }

    paginate() {
        const page = this.queryString.page * 1 || 1;   
        const limit = this.queryString.limit * 1 || 100;
        const skip = (page - 1) * limit;

        this.query = this.query.skip(skip).limit(limit);

        return this;
    }
}

module.exports = APIFeatures;