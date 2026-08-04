const prisma = require("../config/db");

async function listLevels(req, res, next) {
  try {
    const levels = await prisma.level.findMany({ orderBy: { sortOrder: "asc" } });
    res.json(levels);
  } catch (err) {
    next(err);
  }
}

module.exports = { listLevels };
