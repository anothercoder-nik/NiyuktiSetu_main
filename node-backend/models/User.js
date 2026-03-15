const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            required: true,
        },
        otp: {
            type: String,
            default: null,
        },
        rfid: {
            type: String,
            trim: true,
            unique: true,
            sparse: true // unique if exists, allows null for non-candidates
        },
        verified: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true, // auto createdAt & updatedAt
    }
);

module.exports = mongoose.model('User', userSchema);
