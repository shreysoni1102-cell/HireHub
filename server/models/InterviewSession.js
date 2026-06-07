import mongoose from 'mongoose';

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },
    jobDescription: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
    },
    questions: [
      {
        questionText: { type: String, required: true },
        candidateAnswer: { type: String, default: '' },
      },
    ],
    evaluation: {
      overallScore: { type: Number, default: 0 },
      technicalScore: { type: Number, default: 0 },
      communicationScore: { type: Number, default: 0 },
      feedback: { type: String, default: '' },
      questionEvaluations: [
        {
          question: String,
          answer: String,
          score: Number,
          explanation: String,
          idealAnswer: String,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('InterviewSession', interviewSessionSchema);
