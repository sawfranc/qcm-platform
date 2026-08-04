const { z } = require("zod");
const prisma = require("../config/db");
const { hashPassword, comparePassword } = require("../utils/password");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  password: z.string().min(8),
});

async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    if (!data.email && !data.phone) {
      return res.status(400).json({ error: "Email ou téléphone requis." });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { phone: data.phone }] },
    });
    if (existing) {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email/téléphone." });
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: "eleve", // seul rôle en auto-inscription
      },
    });

    // Création automatique d'un abonnement gratuit à l'inscription
    await prisma.subscription.create({
      data: { userId: user.id, plan: "gratuit", questionsQuota: 10, isActive: true },
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    res.status(201).json({ user: { id: user.id, fullName: user.fullName, role: user.role }, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { identifier, password } = req.body; // identifier = email ou téléphone
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
    });

    if (!user || user.status !== "actif") {
      return res.status(401).json({ error: "Identifiants invalides ou compte suspendu." });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Identifiants invalides." });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    res.json({ user: { id: user.id, fullName: user.fullName, role: user.role }, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "actif") {
      return res.status(401).json({ error: "Session invalide." });
    }
    const accessToken = signAccessToken(user);
    res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ error: "Refresh token invalide ou expiré." });
  }
}

module.exports = { register, login, refresh };
