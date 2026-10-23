const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();
setGlobalOptions({maxInstances: 10});

const dtoneKey = defineSecret("DTONE_API_KEY");
const dtoneSecret = defineSecret("DTONE_API_SECRET");
const stripeSecret = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const countries = require("i18n-iso-countries");

// Switch to DT One's production host when you go live
const DTONE_BASE_URL = "https://preprod-dvs-api.dtone.com/v1";

exports.lookupProducts = onRequest(
    {secrets: [dtoneKey, dtoneSecret], cors: true},
    async (req, res) => {
      const {countryIso, serviceId} = req.query;

      if (!/^[A-Za-z]{2,3}$/.test(countryIso || "")) {
        return res.status(400).json({error: "Valid countryIso is required"});
      }
      if (serviceId && !/^\d+$/.test(serviceId)) {
        return res.status(400).json({error: "Invalid serviceId"});
      }

      // Accept alpha-2 (SV) or alpha-3 (SLV)
      const code = countryIso.toUpperCase();
      const alpha3 = code.length === 3 ? code : countries.alpha2ToAlpha3(code);
      if (!alpha3) {
        return res.status(400).json({error: "Unknown country"});
      }

      try {
        const perPage = 100;
        const all = [];

        // Page through results (capped at 10 pages as a safety limit)
        for (let page = 1; page <= 10; page++) {
          const params = new URLSearchParams({
            country_iso_code: alpha3,
            per_page: String(perPage),
            page: String(page),
          });
          if (serviceId) params.set("service_id", serviceId);

          const productsRes = await fetch(
              `${DTONE_BASE_URL}/products?${params}`,
              {headers: {Authorization: getDtoneAuthHeader()}},
          );

          if (!productsRes.ok) {
            logger.error("DT One products failed", {
              status: productsRes.status,
            });
            return res.status(502).json({error: "Product lookup failed"});
          }

          const batch = await productsRes.json();
          if (!Array.isArray(batch)) break;
          all.push(...batch);
          if (batch.length < perPage) break;
        }

        // Never send wholesale cost, rates or source amounts to the browser
        const safe = all.map(({prices, rates, source, ...rest}) => ({
          ...rest,
          prices: {retail: prices && prices.retail},
        }));

        return res.json(safe);
      } catch (err) {
        logger.error("Product lookup error:", err);
        return res.status(500).json({error: "Server error"});
      }
    },
);

/**
 * Builds the HTTP Basic Auth header DT One requires.
 * @return {string} The Basic auth header value.
 */
function getDtoneAuthHeader() {
  const credentials = Buffer.from(
      `${dtoneKey.value()}:${dtoneSecret.value()}`,
  ).toString("base64");
  return `Basic ${credentials}`;
}

/**
 * Fetches one product from DT One by id.
 * @param {string} productId The DT One product id.
 * @return {Promise<Object|null>} The product, or null if not found.
 */
async function getProduct(productId) {
  const res = await fetch(`${DTONE_BASE_URL}/products/${productId}`, {
    headers: {Authorization: getDtoneAuthHeader()},
  });
  if (!res.ok) {
    logger.error("DT One product lookup failed", {status: res.status});
    return null;
  }
  return res.json();
}

/**
 * Builds the DT One credit party for an order.
 * If the gift card product wants an email (or another field), this is the
 * only place to change. Check required_credit_party_identifier_fields on
 * the product.
 * @param {Object} m The PaymentIntent metadata.
 * @return {Object} The credit_party_identifier object.
 */
function buildCreditParty(m) {
  if (m.type === "giftCard") {
    return {mobile_number: m.recipientContact};
  }
  return {mobile_number: m.phoneNumber};
}

/**
 * Sends the order to DT One. Only called after a successful payment.
 * @param {Object} params The order details.
 * @param {string} params.externalId Unique id (based on the Stripe payment).
 * @param {string} params.productId The DT One product id.
 * @param {Object} params.creditParty The credit_party_identifier object.
 * @return {Promise<string>} The DT One transaction id.
 */
async function sendTopOff({externalId, productId, creditParty}) {
  const topupRes = await fetch(`${DTONE_BASE_URL}/async/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": getDtoneAuthHeader(),
    },
    body: JSON.stringify({
      external_id: externalId,
      product_id: productId,
      credit_party_identifier: creditParty,
      auto_confirm: true,
    }),
  });

  const result = await topupRes.json();

  if (!topupRes.ok) {
    logger.error("DT One order failed", result);
    throw new Error(result.message || "Order failed");
  }
  return result.id || result.transaction_id;
}

exports.createPaymentIntent = onRequest(
    {secrets: [stripeSecret, dtoneKey, dtoneSecret], cors: true},
    async (req, res) => {
      if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"});
      }

      const {
        type = "topoff",
        productId,
        countryCode,
        phoneNumber,
        senderName,
        senderEmail,
        recipientName,
        recipientContact,
        message,
      } = req.body || {};

      const isGift = type === "giftCard";

      if (!productId || !countryCode || !senderEmail) {
        return res.status(400).json({error: "Invalid or missing fields"});
      }
      if (!isGift && !/^\+\d{8,15}$/.test(phoneNumber || "")) {
        return res.status(400).json({error: "Invalid phone number"});
      }
      if (isGift && !recipientContact) {
        return res.status(400).json({error: "Recipient is required"});
      }

      try {
        // The price comes from DT One, never from the browser
        const product = await getProduct(productId);
        const retail = product && product.prices && product.prices.retail;

        if (!retail || retail.unit !== "USD") {
          return res.status(400).json({error: "Product not available"});
        }

        const stripe = new Stripe(stripeSecret.value());
        const intent = await stripe.paymentIntents.create({
          amount: Math.round(retail.amount * 100),
          currency: "usd",
          automatic_payment_methods: {enabled: true},
          receipt_email: senderEmail,
          metadata: {
            type: isGift ? "giftCard" : "topoff",
            productId: String(productId),
            countryCode,
            phoneNumber: phoneNumber || "",
            recipientName: recipientName || "",
            recipientContact: recipientContact || "",
            // Stripe caps metadata values at 500 characters
            message: (message || "").slice(0, 450),
            senderName: senderName || "",
            senderEmail,
          },
        });

        return res.json({clientSecret: intent.client_secret});
      } catch (err) {
        logger.error("createPaymentIntent error:", err);
        return res.status(500).json({error: "Server error"});
      }
    },
);

exports.stripeWebhook = onRequest(
    {secrets: [stripeSecret, stripeWebhookSecret, dtoneKey, dtoneSecret]},
    async (req, res) => {
      const stripe = new Stripe(stripeSecret.value());

      let event;
      try {
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            req.headers["stripe-signature"],
            stripeWebhookSecret.value(),
        );
      } catch (err) {
        logger.error("Invalid Stripe signature", err);
        return res.status(400).send("Invalid signature");
      }

      if (event.type === "payment_intent.succeeded") {
        const intent = event.data.object;
        const m = intent.metadata;
        const isGift = m.type === "giftCard";
        const order = admin.firestore().collection("orders").doc(intent.id);

        // Stripe can deliver an event more than once; create() fails if the
        // document already exists, so each payment is fulfilled only once.
        try {
          await order.create({
            ...m,
            status: "paid",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (err) {
          return res.sendStatus(200);
        }

        try {
          const transactionId = await sendTopOff({
            externalId: `${isGift ? "gift" : "topoff"}-${intent.id}`,
            productId: m.productId,
            creditParty: buildCreditParty(m),
          });
          await order.update({status: "submitted", transactionId});
        } catch (err) {
          logger.error("Order failed, refunding", err);
          await stripe.refunds.create({payment_intent: intent.id});
          await order.update({status: "refunded"});
        }
      }

      return res.sendStatus(200);
    },
);

exports.lookupProducts = onRequest(
    {secrets: [dtoneKey, dtoneSecret], cors: true},
    async (req, res) => {
      const {countryIso} = req.query;

      if (!countryIso) {
        return res.status(400).json({error: "countryIso is required"});
      }

      const alpha3Code = ISO_ALPHA2_TO_ALPHA3[countryIso] || countryIso;

      try {
        const productsRes = await fetch(
            `${DTONE_BASE_URL}/products?country_iso_code=${alpha3Code}`,
            {headers: {Authorization: getDtoneAuthHeader()}},
        );

        const rawText = await productsRes.text();
        logger.info("DT One products response", {status: productsRes.status});

        const data = rawText ? JSON.parse(rawText) : null;

        // Never send wholesale cost, rates or source amounts to the browser
        const safe = Array.isArray(data) ?
          data.map(({prices, rates, source, ...rest}) => ({
            ...rest,
            prices: {retail: prices && prices.retail},
          })) :
          data;

        return res.json(safe);
      } catch (err) {
        logger.error("Product lookup error:", err);
        return res.status(500).json({error: "Server error"});
      }
    },
);