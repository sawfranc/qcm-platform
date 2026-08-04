const paymentService = require("../services/payment.service");

async function initiate(req, res, next) {
  try {
    const { amount, description } = req.body;
    const result = await paymentService.initiatePayment({
      userId: req.user.id,
      amount,
      description,
    });
    // Le frontend redirige l'utilisateur vers result.paymentUrl (ou l'ouvre en popup via le SDK CinetPay Seamless)
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Endpoint appelé par CinetPay (notify_url), jamais par le frontend.
 * CinetPay envoie les champs en x-www-form-urlencoded.
 */
async function webhook(req, res, next) {
  try {
    const xToken = req.headers["x-token"];
    const payment = await paymentService.handleNotification({
      body: req.body,
      xTokenHeader: xToken,
    });
    // Toujours répondre 200 rapidement pour éviter que CinetPay ne réessaie inutilement
    res.status(200).json({ received: true, status: payment.status });
  } catch (err) {
    next(err);
  }
}

module.exports = { initiate, webhook };
