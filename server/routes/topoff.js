// server/routes/topoff.js
import fetch from "node-fetch";

let cachedToken = null;
let tokenExpiry = 0;

async function getReloadlyToken() {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

    const res = await fetch("https://auth.reloadly.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            client_id: process.env.RELOADLY_CLIENT_ID,
            client_secret: process.env.RELOADLY_CLIENT_SECRET,
            grant_type: "client_credentials",
            audience: "https://topups.reloadly.com", // sandbox: topups-sandbox.reloadly.com
        }),
    });
    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + data.expires_in * 1000 - 60000; // refresh 1 min early
    return cachedToken;
}

export async function handleTopoff(req, res) {
    const { operatorId, amount, phoneNumber, countryCode } = req.body;

    try {
        const token = await getReloadlyToken();

        const topupRes = await fetch("https://topups.reloadly.com/topups", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                operatorId,
                amount,
                useLocalAmount: true,
                recipientPhone: {
                    countryCode,
                    number: phoneNumber,
                },
            }),
        });

        const result = await topupRes.json();

        if (!topupRes.ok) {
            return res.status(400).json({ error: result.message || "Top-off failed" });
        }

        res.json({ success: true, transactionId: result.transactionId });
    } catch (err) {
        console.error("Topoff error:", err);
        res.status(500).json({ error: "Server error" });
    }
}


export async function handleOperatorLookup(req, res) {
    const { phone, country } = req.query;
    const token = await getReloadlyToken();

    const lookupRes = await fetch(
        `https://topups.reloadly.com/operators/auto-detect/phone/${phone}/countries/${country}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await lookupRes.json();
    res.json({ operatorId: data.operatorId, operatorName: data.name });
}