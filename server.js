const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});

dotenv.config({ path: './config.env' });

const app = require('./app');


const DB = process.env.DATABASE.replace(
    '<PASSWORD>', 
    process.env.DATABASE_PASSWORD
);

// mongoose.connect(process.env.DATABASE_LOCAL, {
mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
})
// .then(con => {
//     console.log(con.connections);
//     console.log('DB connection successful!');
// })
.then( () =>  console.log('DB connection successful!'));

//console.log(app.get('env'));
//console.log(process.env);

/*
const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A tour must have a name'],
        unique: true
    },
    rating: {
        type: Number,
        default: 4.5
    },
    price: {
        type: Number,
        required: [true, 'A tour must have a price']
    }
});

const Tour = mongoose.model('Tour', tourSchema);

const testTour = new Tour({
    name: 'The Park Camper',
    price: 997
});

testTour.save().then(doc => {
    console.log(doc);
}).catch(err => {
    console.log('Error: ', err);
})
*/

const port = process.env.PORT || 3000;
// app.listen(port, () => {
//     console.log(`App running on port ${port}...`);
// });

const server = app.listen(port, () => {
    console.log(`App running on port ${port}...`);
});

// there might be other erros outside express which we didn't handle for example database connection
// issue; we can verify it by putting wrong password. so, we can see that we are getting unhandled 
// promise rejection error. We could handle that something like this at this function: 
// mongoose.connect().then().catch((err) => console.log('Error'));
// But, we need a central place to handle all those unhandled PROMISE rejection.
process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);

    // when db is down, we need to shut down our app. we also need to give the server some time to 
    // finish all the request that are still pending or being handled at the time. For simplicity,
    // we are doing like this way (which will crash the app)
    server.close(() => {
      process.exit(1);
    });
});

// sometimes some bugs occured in our synchronous code which are not handled anywhere are called 
// uncaught exceptions. For example, at the bottom error, "ReferenceError x is not defined".
// we need to place this hanlder top of the file; otherwise it can't handle errors in synchronous
// code anywhere in the app which is above this code block
// process.on('uncaughtException', err => {
//     console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
//     console.log(err.name, err.message);
//     process.exit(1);
//     // at previous unhandledRejection block, shutting down app is optional, but at this case of 
//     // unknown exceptions in our synchronous code, we MUST need to shut down our app and restart the
//     // process
// });

//console.log(x);

