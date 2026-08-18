const express = require("express");
const crypto = require("crypto");

const app = express();

const PORT = 3000;
const SECRET = "northstar-secret-key";

app.use(express.json());

app.post("/webhook", (req, res) => {
    const receivedSignature = req.headers["x-northstar-signature"];

    if (!receivedSignature) {
        return res.status(401).json({
            error: "Missing signature"
        });
    }

    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
        .createHmac("sha256", SECRET)
        .update(body)
        .digest("hex");

    if (receivedSignature !== expectedSignature) {
        return res.status(401).json({
            error: "Invalid signature"
        });
    }

    console.log("Verified webhook received:");
    console.log(req.body);

    res.json({
        message: "Webhook verified successfully"
    });
});

app.listen(PORT, () => {
    console.log(`Northstar server is running on port ${PORT}`);
});