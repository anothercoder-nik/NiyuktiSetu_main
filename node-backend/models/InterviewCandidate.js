const mongoose = require('mongoose');

const interviewCandidateSchema = new mongoose.Schema(
    {
        rfid: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        rollNo: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        dob: {
            type: Date,
            required: true,
            index: true,
        },
        referenceImagePath: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('InterviewCandidate', interviewCandidateSchema);
