const mongoose = require('mongoose');

const interviewReportSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        candidateInfo: {
            name: String,
            rollNo: String,
            rfid: String,
            dob: String,
            verified: Boolean,
            language: String
        },
        interviewSession: {
            startTime: Date,
            endTime: Date,
            duration: Number,
            totalQuestions: Number,
            answeredQuestions: Number,
            totalScore: Number,
            averageScore: Number,
            status: String,
            reVerificationCount: Number
        },
        questionsAndAnswers: [{
            question: String,
            question_id: Number,
            category: String,
            difficulty: String,
            answer: String,
            answered: Boolean,
            score: Number,
            score_breakdown: {
                keyword_match: Number,
                semantic_similarity: Number,
                completeness: Number,
                coherence: Number
            },
            tone: String
        }]
    },
    { timestamps: true }
);

module.exports = mongoose.model('InterviewReport', interviewReportSchema);
