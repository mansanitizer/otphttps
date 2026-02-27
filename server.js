const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'super-secret-api-key';
const USSDPAY_URL = process.env.USSDPAY_URL || 'http://127.0.0.1:8099';
const USE_HTTPS = process.env.USE_HTTPS !== 'false'; // Defaults to true, but allow disabling

// Security Middleware: Enforce API Key
function verifyApiKey(req, res, next) {
    const providedKey = req.headers['x-api-key'];
    if (!providedKey || providedKey !== API_KEY) {
        return res.status(401).json({
            error: 'Unauthorized',
            voiceResponse: 'Authentication failed. Please check your API key.'
        });
    }
    next();
}

app.use(verifyApiKey);

// A simple utility to format currency for text-to-speech
function formatCurrency(amountStr) {
    if (!amountStr) return 'zero rupees';
    return amountStr.toString() + ' rupees';
}

// 1. Check Balance
app.get('/api/balance', async (req, res) => {
    try {
        const response = await fetch(`${USSDPAY_URL}/api/v1/account/balance`);
        const data = await response.json();

        if (data.success) {
            res.json({
                ...data,
                voiceResponse: `Your account balance is ${formatCurrency(data.balance)}.`
            });
        } else {
            res.status(400).json({
                ...data,
                voiceResponse: `Failed to check balance. ${data.message || data.error}`
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error', voiceResponse: 'Sorry, the UPI engine is not responding.' });
    }
});

// 2. Send Money
app.post('/api/pay', async (req, res) => {
    try {
        const { recipient, amount, remarks } = req.body;

        // Convert request payload to be forwarded
        const response = await fetch(`${USSDPAY_URL}/api/v1/pay/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient, amount, remarks })
        });

        const data = await response.json();

        if (data.success) {
            res.json({
                ...data,
                voiceResponse: `Successfully sent ${formatCurrency(amount)} to ${recipient}.`
            });
        } else {
            res.status(400).json({
                ...data,
                voiceResponse: `Payment failed. ${data.message || data.error}`
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error', voiceResponse: 'Sorry, could not process the payment because the UPI engine is not responding.' });
    }
});

// 3. Mini Statement
app.get('/api/statement', async (req, res) => {
    try {
        const response = await fetch(`${USSDPAY_URL}/api/v1/account/statement`);
        const data = await response.json();

        if (data.success) {
            let voiceResponse = 'Your recent transactions are: ';
            data.lines.forEach((line, index) => {
                voiceResponse += `Transaction ${index + 1}: ${line}. `;
            });
            res.json({
                ...data,
                voiceResponse
            });
        } else {
            res.status(400).json({
                ...data,
                voiceResponse: `Failed to get statement. ${data.message || data.error}`
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error', voiceResponse: 'Sorry, the UPI engine is not responding.' });
    }
});

// 4. Device Status
app.get('/api/status', async (req, res) => {
    try {
        const response = await fetch(`${USSDPAY_URL}/api/v1/device/status`);
        const data = await response.json();

        const pinStatus = data.pinConfigured ? 'configured' : 'not configured';
        let stateMessage = `UPI Engine is ${data.ussdEngineState}.`;

        if (data.ussdEngineState === 'ERROR') {
            stateMessage += " There is a problem with the engine. Please ensure the Accessibility Service is enabled in your Android settings and you have a working SIM card signal.";
        }

        res.json({
            ...data,
            voiceResponse: `${stateMessage} Your UPI PIN is ${pinStatus}.`
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error', voiceResponse: 'Sorry, the UPI engine is not responding.' });
    }
});

// Self-Signed Cert Generation for Local HTTPS (to satisfy iOS Siri Shortcuts without Cloudflare)
let server;
if (USE_HTTPS) {
    try {
        if (!fs.existsSync('cert.pem') || !fs.existsSync('key.pem')) {
            console.log('Generating local self-signed certificates for HTTPS...');
            // Requires openssl to be installed in termux or local system
            execSync('openssl req -nodes -new -x509 -keyout key.pem -out cert.pem -days 365 -subj "/C=IN/ST=Local/L=Local/O=USSDPay/CN=localhost"');
        }
        const options = {
            key: fs.readFileSync('key.pem'),
            cert: fs.readFileSync('cert.pem'),
            minVersion: 'TLSv1.2'
        };
        server = https.createServer(options, app);
        server.listen(PORT, () => {
            console.log(`🔒 Secure UPI Automation API running locally at https://localhost:${PORT}`);
            console.log(`🔑 API Key required: ${API_KEY}`);
            console.log(`🗣️ Features 'voiceResponse' fields designed for screen readers and Siri/Tasker.`);
        });
    } catch (err) {
        console.warn('Failed to start HTTPS server, falling back to HTTP (Ensure openssl is installed):', err.message);
        server = http.createServer(app);
        server.listen(PORT, () => {
            console.log(`🔓 UPI API running on http://localhost:${PORT}`);
        });
    }
} else {
    server = http.createServer(app);
    server.listen(PORT, () => {
        console.log(`🔓 UPI API running on http://localhost:${PORT}`);
    });
}
