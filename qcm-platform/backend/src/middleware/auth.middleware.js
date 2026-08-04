const { verifyAccessToken } = require("../utils/jwt");
const prisma = require("../config/db");

/**
 * Vérifie le JWT d'accès et attache l'utilisateur courant (req.user).
 * Bloque les comptes suspendus même si le token est encore valide.
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Authentification requise." });
    }

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "actif") {
      return res.status(401).json({ error: "Compte introuvable ou suspendu." });
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalide ou expiré." });
  }
}

module.exports = { authenticate };
