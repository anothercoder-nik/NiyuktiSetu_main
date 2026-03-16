const mongoose = require('mongoose');

const interviewVerificationSchema = new mongoose.Schema(
    {
        candidateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InterviewCandidate',
            required: true,
            index: true,
        },
        rfid: {
            type: String,
            required: true,
        },
        rollNo: {
            type: String,
            required: true,
        },
        credentialsVerified: {
            type: Boolean,
            default: false,
        },
        faceVerified: {
            type: Boolean,
            default: false,
        },
        confidenceScore: {
            type: Number,
            default: null,
        },
        liveImagePath: {
            type: String,
            default: null,
        },
        verificationTimestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
        ipAddress: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            default: 'pending',
            index: true,
        },
        interviewCompletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('InterviewVerification', interviewVerificationSchema);
