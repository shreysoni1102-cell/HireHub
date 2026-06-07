import InterviewSession from '../models/InterviewSession.js';
import { generateInterviewQuestion, evaluateInterviewSession } from '../utils/aiService.js';

/**
 * Start a new mock interview session and ask the first question
 */
export const startInterview = async (req, res, next) => {
  try {
    const { jobTitle, jobDescription } = req.body;

    if (!jobTitle || !jobTitle.trim()) {
      return res.status(400).json({ message: 'Job title is required.' });
    }
    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({ message: 'Job description is required.' });
    }

    console.log(`[Interview] Starting session for user: ${req.user.id}, job: ${jobTitle}`);

    // Create session skeleton
    const session = await InterviewSession.create({
      userId: req.user.id,
      jobTitle: jobTitle.trim(),
      jobDescription: jobDescription.trim(),
      status: 'active',
      currentQuestionIndex: 0,
      questions: []
    });

    // Generate first question
    const questionText = await generateInterviewQuestion(
      session.jobTitle,
      session.jobDescription,
      [],
      0
    );

    // Push first question and save
    session.questions.push({ questionText, candidateAnswer: '' });
    await session.save();

    res.status(201).json({
      success: true,
      message: 'Interview session started.',
      data: {
        sessionId: session._id,
        jobTitle: session.jobTitle,
        question: questionText,
        index: 0,
        isFinished: false
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Submit answer for the current question and load next question (or evaluate session)
 */
export const submitAnswer = async (req, res, next) => {
  try {
    const { sessionId, answer } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required.' });
    }

    const session = await InterviewSession.findOne({ _id: sessionId, userId: req.user.id });
    if (!session) {
      return res.status(404).json({ message: 'Active interview session not found.' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ message: 'This interview has already been completed.' });
    }

    const currentIndex = session.currentQuestionIndex;
    console.log(`[Interview] Received answer for session ${sessionId}, question #${currentIndex + 1}`);

    // Save candidate's answer for the current question
    session.questions[currentIndex].candidateAnswer = (answer || '').trim();

    // Check if we have more questions (total of 5 questions, so indices 0, 1, 2, 3, 4)
    if (currentIndex < 4) {
      const nextIndex = currentIndex + 1;
      
      // Generate next question
      const nextQuestionText = await generateInterviewQuestion(
        session.jobTitle,
        session.jobDescription,
        session.questions,
        nextIndex
      );

      // Save next question and increment index
      session.questions.push({ questionText: nextQuestionText, candidateAnswer: '' });
      session.currentQuestionIndex = nextIndex;
      await session.save();

      return res.status(200).json({
        success: true,
        data: {
          sessionId: session._id,
          question: nextQuestionText,
          index: nextIndex,
          isFinished: false
        }
      });
    } else {
      // 5th question answered: conclude and evaluate session
      console.log(`[Interview] Concluding interview session ${sessionId}. Generating AI report...`);
      
      session.status = 'completed';
      
      // Call AI to evaluate answers
      const evaluationResult = await evaluateInterviewSession(
        session.jobTitle,
        session.jobDescription,
        session.questions
      );

      // Save evaluation scores
      session.evaluation = {
        overallScore: evaluationResult.overallScore || 0,
        technicalScore: evaluationResult.technicalScore || 0,
        communicationScore: evaluationResult.communicationScore || 0,
        feedback: evaluationResult.feedback || '',
        questionEvaluations: evaluationResult.questionEvaluations || []
      };

      await session.save();

      return res.status(200).json({
        success: true,
        data: {
          sessionId: session._id,
          isFinished: true,
          evaluation: session.evaluation
        }
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Get interview history for the logged-in user
 */
export const getInterviewHistory = async (req, res, next) => {
  try {
    const history = await InterviewSession.find({ userId: req.user.id })
      .select('jobTitle status evaluation.overallScore createdAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};

/**
 * Get detailed report of a single interview session
 */
export const getInterviewDetails = async (req, res, next) => {
  try {
    const session = await InterviewSession.findOne({ _id: req.params.id, userId: req.user.id });
    if (!session) {
      return res.status(404).json({ message: 'Interview session not found.' });
    }

    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};
