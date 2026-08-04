const quizService = require("../services/quizSession.service");

async function start(req, res, next) {
  try {
    const { domainId, themeId, levelId, questionCount } = req.body;
    const result = await quizService.startSession({
      studentId: req.user.id,
      domainId,
      themeId,
      levelId,
      questionCount,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function answer(req, res, next) {
  try {
    const { id: sessionId } = req.params;
    const { questionId, selectedOptionId } = req.body;
    const result = await quizService.submitAnswer({ sessionId, questionId, selectedOptionId });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function complete(req, res, next) {
  try {
    const { id: sessionId } = req.params;
    const { subscriptionId } = req.body;
    const result = await quizService.completeSession({ sessionId, studentId: req.user.id, subscriptionId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { start, answer, complete };
