/**
 * Gestionnaire d'erreurs centralisé. Ne jamais renvoyer la stack trace
 * brute au client en production.
 */
function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production" && status === 500
      ? "Une erreur interne est survenue."
      : err.message;

  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
