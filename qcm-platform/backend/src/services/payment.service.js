const axios = require("axios");
const crypto = require("crypto");
const prisma = require("../config/db");

const CINETPAY_BASE_URL = "https://api-checkout.cinetpay.com/v2";

/**
 * Initie un paiement réel auprès de CinetPay.
 * Retourne l'URL de paiement à laquelle rediriger l'élève (ou à passer
 * au SDK Seamless côté frontend pour un paiement en popup sans redirection).
 */
async function initiatePayment({ userId, amount, description }) {
  // 1. On crée d'abord la transaction en base, en attente, avec un ID unique
  const payment = await prisma.payment.create({
    data: { userId, amount, provider: "cinetpay", status: "en_attente" },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });

  const payload = {
    apikey: process.env.CINETPAY_APIKEY,
    site_id: process.env.CINETPAY_SITE_ID,
    transaction_id: payment.id, // notre ID interne sert de référence CinetPay
    amount,
    currency: "XOF",
    description: description || "Recharge quota QCM",
    customer_name: user.fullName?.split(" ")[0] || "Client",
    customer_surname: user.fullName?.split(" ").slice(1).join(" ") || "QCM",
    customer_phone_number: user.phone || "",
    customer_email: user.email || "",
    notify_url: `${process.env.API_PUBLIC_URL}/api/v1/payments/webhook`,
    return_url: `${process.env.FRONTEND_URL}/paiement/retour`,
    channels: "ALL", // ALL = Orange Money, Moov Money, carte, etc.
    metadata: userId,
    lang: "FR",
  };

  const { data } = await axios.post(`${CINETPAY_BASE_URL}/payment`, payload, {
    headers: { "Content-Type": "application/json" },
  });

  if (data.code !== "201") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "echoue" } });
    const err = new Error(`Échec d'initialisation CinetPay : ${data.message}`);
    err.status = 502;
    throw err;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerRef: data.data.payment_token },
  });

  return { paymentId: payment.id, paymentUrl: data.data.payment_url };
}

/**
 * Recalcule le token HMAC attendu selon l'algorithme officiel CinetPay
 * (concaténation des champs du corps de la notification + SHA256 avec la secret key).
 */
function computeExpectedToken(body, secretKey) {
  const orderedFields = [
    "cpm_site_id", "cpm_trans_id", "cpm_trans_date", "cpm_amount", "cpm_currency",
    "signature", "payment_method", "cel_phone_num", "cpm_phone_prefixe",
    "cpm_language", "cpm_version", "cpm_payment_config", "cpm_page_action",
    "cpm_custom", "cpm_designation", "cpm_error_message",
  ];
  const concatenated = orderedFields.map((f) => body[f] ?? "").join("");
  return crypto.createHmac("sha256", secretKey).update(concatenated).digest("hex");
}

function verifyNotificationToken(body, xTokenHeader) {
  const expected = computeExpectedToken(body, process.env.CINETPAY_SECRET_KEY);
  if (!xTokenHeader || expected.length !== xTokenHeader.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(xTokenHeader));
}

/**
 * Ne fait JAMAIS confiance au statut envoyé dans le corps du webhook.
 * Rappelle systématiquement l'API de vérification de CinetPay pour
 * obtenir le vrai statut avant de mettre à jour la base de données.
 */
async function checkTransactionStatus(transactionId) {
  const { data } = await axios.post(`${CINETPAY_BASE_URL}/payment/check`, {
    apikey: process.env.CINETPAY_APIKEY,
    site_id: process.env.CINETPAY_SITE_ID,
    transaction_id: transactionId,
  });
  return data; // data.data.status : "ACCEPTED" | "REFUSED" | ...
}

async function handleNotification({ body, xTokenHeader }) {
  const isValidToken = verifyNotificationToken(body, xTokenHeader);
  if (!isValidToken) {
    const err = new Error("Token de notification CinetPay invalide.");
    err.status = 401;
    throw err;
  }

  const transactionId = body.cpm_trans_id;

  const payment = await prisma.payment.findUnique({ where: { id: transactionId } });
  if (!payment) {
    const err = new Error("Transaction inconnue.");
    err.status = 404;
    throw err;
  }

  // Anti-rejeu : si déjà traitée avec succès, on ne refait rien
  if (payment.status === "reussi") {
    return payment;
  }

  // On ne fait confiance qu'au résultat de l'appel de vérification, jamais au body du webhook
  const verification = await checkTransactionStatus(transactionId);
  const cinetpayStatus = verification?.data?.status;

  const newStatus = cinetpayStatus === "ACCEPTED" ? "reussi" : "echoue";

  const updated = await prisma.payment.update({
    where: { id: transactionId },
    data: { status: newStatus },
  });

  if (newStatus === "reussi" && updated.subscriptionId) {
    await prisma.subscription.update({
      where: { id: updated.subscriptionId },
      data: { isActive: true },
    });
  }

  return updated;
}

module.exports = { initiatePayment, handleNotification };
