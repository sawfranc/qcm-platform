const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// Limite les tentatives de connexion pour prévenir le brute-force
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

router.post("/register", authController.register);
router.post("/login", loginLimiter, authController.login);
router.post("/refresh", authController.refresh);

// Même protection anti-brute-force pour la vérification de l'ancien mot de passe
const passwordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
router.post("/change-password", authenticate, passwordLimiter, authController.changePassword);

module.exports = router;
