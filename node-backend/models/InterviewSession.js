const mongoose = require('mongoose');

const interviewSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        sessionDate: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            default: 'pending',
            index: true,
        },
        score: {
            type: Number,
            default: null,
        },
        feedback: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
