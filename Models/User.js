const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'Please provide Firstname!'],
    },
    lastName: {
        type: String,
        required: [true, 'Please provide Lastname!'],
    },
    username: {
        type: String,
        required: [true, 'Please provide Username!'],
        unique: true,
    },
    email: {
        type: String,
        required: [true, 'Please provide Email!'],
        unique: true,
    },
    password: {
        type: String,
        required: [true, 'Please provide Password!'],
    },
    country: {
        type: String,
        required: [true, 'Please provide Country!'],
    },
    phoneNumber: {
        type: Number,
        required: [true, 'Please provide Phone Number!'],
        unique: true,
    },
    wallet: {
        type: mongoose.Types.Decimal128,
        default: 0,
    },
    token: String,
    resetPasswordToken: String,
    resetPasswordExpiresAt: Number,
});

module.exports = mongoose.model('User', UserSchema);
