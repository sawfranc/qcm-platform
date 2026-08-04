const questionService = require("../services/question.service");
const prisma = require("../config/db");

async function create(req, res, next) {
  try {
    const question = await questionService.createQuestion({ ...req.body, authorId: req.user.id });
    res.status(201).json(question);
  } catch (err) {
    next(err);
  }
}

async function validate(req, res, next) {
  try {
    const question = await questionService.validateQuestion({
      questionId: req.params.id,
      directorId: req.user.id,
    });
    res.json(question);
  } catch (err) {
    next(err);
  }
}

async function reject(req, res, next) {
  try {
    const question = await questionService.rejectQuestion({
      questionId: req.params.id,
      directorId: req.user.id,
      reason: req.body.reason,
    });
    res.json(question);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { domainId, themeId, levelId, status } = req.query;
    const questions = await prisma.question.findMany({
      where: { domainId, themeId, levelId, status },
      include: { options: true, author: { select: { fullName: true } } },
      take: 100,
    });
    res.json(questions);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, validate, reject, list };
