const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

setGlobalOptions({maxInstances: 10});

const dtoneKey = defineSecret("DTONE_API_KEY");
const dtoneSecret = defineSecret("DTONE_API_SECRET");

const CALLING_CODES = {
  SV: "+503", // El Salvador
  GT: "+502", // Guatemala
  HN: "+504", // Honduras
  NI: "+505", // Nicaragua
  MX: "+52", // Mexico
};

const ISO_ALPHA2_TO_ALPHA3 = {
  SV: "SLV", // El Salvador
  GT: "GTM", // Guatemala
  HN: "HND", // Honduras
  NI: "NIC", // Nicaragua
  MX: "MEX", // Mexico
};

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

exports.requestTopoff = onRequest(
    {secrets: [dtoneKey, dtoneSecret], cors: true},
    async (req, res) => {
      if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"});
      }

      const {productId, phoneNumber, countryCode} = req.body;

      if (!productId || !phoneNumber || !countryCode) {
        return res.status(400).json({error: "Missing required fields"});
      }


      const callingCode = CALLING_CODES[countryCode] || "";
      const fullPhoneNumber = phoneNumber.startsWith("+") ?
        phoneNumber :
        `${callingCode}${phoneNumber}`;

      try {
        const topupRes = await fetch("https://preprod-dvs-api.dtone.com/v1/async/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": getDtoneAuthHeader(),
          },
          body: JSON.stringify({
            external_id: `topoff-${Date.now()}`,
            product_id: productId,
            credit_party_identifier: {
              mobile_number: fullPhoneNumber,
            },
            auto_confirm: true,
          }),
        });

        const result = await topupRes.json();

        if (!topupRes.ok) {
          logger.error("DT One topup failed", result);
          return res.status(topupRes.status).json({
            error: result.message || "Top-off failed"});
        }

        return res.json({
          success: true,
          transactionId: result.id || result.transaction_id,
        });
      } catch (err) {
        logger.error("Topoff error:", err);
        return res.status(500).json({error: "Server error"});
      }
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
            `https://preprod-dvs-api.dtone.com/v1/products?country_iso_code=${alpha3Code}`,
            {headers: {Authorization: getDtoneAuthHeader()}},
        );

        const rawText = await productsRes.text();
        logger.info("DT One raw response", {
          status: productsRes.status,
          body: rawText,
        });

        const data = rawText ? JSON.parse(rawText) : null;
        return res.json(data);
      } catch (err) {
        logger.error("Product lookup error:", err);
        return res.status(500).json({error: "Server error"});
      }
    },
);
