const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/auth.controller");

const router = express.Router();

// Limite les tentatives de connexion pour prévenir le brute-force
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

router.post("/register", authController.register);
router.post("/login", loginLimiter, authController.login);
router.post("/refresh", authController.refresh);

module.exports = router;
