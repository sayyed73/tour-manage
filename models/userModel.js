const crypto = require('crypto');   // buult in inside nodejs
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({ 
    name: {
        type: String,
        required: [true, 'Please tell us your name!']
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    photo: String,
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false     // hide from output
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            // This only works on CREATE and SAVE!!!
            validator: function(el) {
              return el === this.password;
            },
            message: 'Passwords are not the same!'
        }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
});

// in between getting data and saving data into database
userSchema.pre('save', async function(next) {
    // Only run this function if password was actually modified; this means current doc or user
    if (!this.isModified('password')) return next();
  
    // Hash the password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);
  
    // Delete passwordConfirm field as we need not to save it in db; required was for user input
    this.passwordConfirm = undefined;
    next();
});

userSchema.pre('save', function(next) {
    // if password is not modified or the document is newly created document; exit the function
    // and run next middleware
    if (!this.isModified('password') || this.isNew) return next();
  
    this.passwordChangedAt = Date.now() - 1000;
    // sometimes it happens that the token is created a bit before the changed password timestamp
    // has been created. We can fix that by subtracting one second. So that then will put the 
    // passwordChangedAt one second in the past
    next();
});

userSchema.pre(/^find/, function(next) {
    // this points to the current query
    this.find({ active: { $ne: false } });
    next();
});

// instances which will be available in all the user documents
userSchema.methods.correctPassword = async function( candidatePassword, userPassword) {
    // candidatePassword is the user-typed password, userPassword is the hashed one saved in DB
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
        // console.log(this.passwordChangedAt, JWTTimestamp);
        // const changedTimestamp = this.passwordChangedAt.getTime();
        // console.log(changedTimestamp, JWTTimestamp);
        // output: 1611100800000 1611957731

        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);  // base 10
        // console.log(changedTimestamp, JWTTimestamp);
        // output: 1611100800 1611957731
  
        return JWTTimestamp < changedTimestamp;   
        // 200 < 300; return true; so password changed after token created
        // 300 < 200; return false; so password is not changed after token created
    }
  
    // by default, password is not changed after creating token
    return false;
};

userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
  
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
  
    console.log({ resetToken }, this.passwordResetToken);
    // sample output: 
    // { 
    //     resetToken: '32d495fca9'
    // } 0400baf0737d35287d0a2e6bfe3e3
    // resetToken is the plain token which will send to user via email; passwordResetToken is the
    // encrytpted one which we save on the DB
  
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
    return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;