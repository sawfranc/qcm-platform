const quizService = require("../services/quizSession.service");

// Petit utilitaire : évite de répéter try/catch dans chaque contrôleur
const handler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    next(err);
  }
};

const csv = (v) => (typeof v === "string" && v ? v.split(",").filter(Boolean) : []);

const start = handler(async (req, res) => {
  const { domainIds, themeIds, levelIds, questionCount, timeLimitMinutes } = req.body;
  const result = await quizService.startSession({
    studentId: req.user.id,
    domainIds,
    themeIds,
    levelIds,
    questionCount,
    timeLimitMinutes,
  });
  res.status(201).json(result);
});

const getOne = handler(async (req, res) => {
  res.json(await quizService.getSession({ sessionId: req.params.id, studentId: req.user.id }));
});

const answer = handler(async (req, res) => {
  const { questionId, selectedOptionId } = req.body;
  const result = await quizService.submitAnswer({
    sessionId: req.params.id,
    studentId: req.user.id,
    questionId,
    selectedOptionId,
  });
  res.status(201).json(result);
});

const complete = handler(async (req, res) => {
  res.json(await quizService.completeSession({ sessionId: req.params.id, studentId: req.user.id }));
});

const result = handler(async (req, res) => {
  res.json(await quizService.getResult({ sessionId: req.params.id, studentId: req.user.id }));
});

const history = handler(async (req, res) => {
  res.json(await quizService.getHistory({ studentId: req.user.id }));
});

const dashboard = handler(async (req, res) => {
  res.json(await quizService.getDashboard({ studentId: req.user.id }));
});

const availability = handler(async (req, res) => {
  const available = await quizService.countAvailable({
    domainIds: csv(req.query.domainIds),
    themeIds: csv(req.query.themeIds),
    levelIds: csv(req.query.levelIds),
  });
  res.json({ available });
});

module.exports = { start, getOne, answer, complete, result, history, dashboard, availability };
