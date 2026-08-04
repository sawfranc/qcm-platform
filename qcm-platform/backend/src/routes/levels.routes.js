const express = require("express");
const controller = require("../controllers/levels.controller");

const router = express.Router();

router.get("/", controller.listLevels); // public, comme /domains

module.exports = router;
