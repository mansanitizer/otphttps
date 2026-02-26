const express = require('express');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Define your API Key here
// Pass it in headers as: { "x-api-key": "your-super-secret-api-key" }
const API_KEY = process.env.API_KEY || 'your-super-secret-api-key';

// Configuration: Allowed Senders
// Keeping this as an array makes it very easy to move to a database or JSON file later
const ALLOWED_SENDERS = [
  'SMSOTP', 
  'AXISBK', 
  '56665'
];

// Security Middleware: Enforce API Key
function verifyApiKey(req, res, next) {
  const providedKey = req.headers['x-api-key'];
  if (!providedKey || providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or missing API Key.' });
  }
  next();
}

// Apply middleware to all routes
app.use(verifyApiKey);

// Route to fetch SMS
app.get('/api/sms', (req, res) => {
  // Read the last 50 SMS messages (adjust limit with -l if needed)
  exec('termux-sms-list -l 50', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing termux-sms-list: ${error.message}`);
      return res.status(500).json({ error: 'Failed to read SMS from Device.' });
    }
    
    try {
      const messages = JSON.parse(stdout);
      
      // Filter the messages: Only keep messages where the sender matches one of your ALLOWED_SENDERS
      const filteredMessages = messages.filter(msg => {
        return ALLOWED_SENDERS.some(sender => 
          // Case-insensitive check against the sender number/header
          msg.number.toUpperCase().includes(sender.toUpperCase())
        );
      });

      // Prepare the response body: Returning the entire text as requested
      const responseData = filteredMessages.map(msg => ({
        sender: msg.number,
        body: msg.body,       // Entire SMS text
        receivedAt: msg.received
      }));

      res.json({ 
        success: true, 
        count: responseData.length, 
        data: responseData 
      });

    } catch (parseError) {
      console.error(`Error parsing JSON: ${parseError.message}`);
      res.status(500).json({ error: 'Failed to parse SMS data.' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 SMS API Server running on port ${PORT}`);
  console.log(`🔑 API Key required: ${API_KEY}`);
  console.log(`➡️  Allowed senders: ${ALLOWED_SENDERS.join(', ')}`);
});
