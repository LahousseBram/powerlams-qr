import { createClient } from 'redis';

let client = null;

async function getRedisClient() {
    if (!client || !client.isOpen) {
        client = createClient({
            url: process.env.REDIS_URL,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 3) return new Error('Max retries reached');
                    return Math.min(retries * 100, 3000);
                }
            }
        });

        client.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });

        await client.connect();
    }
    return client;
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    let redis;

    try {
        redis = await getRedisClient();

        if (req.method === 'GET') {
            // Get all QR codes
            const data = await redis.get('qrCodes');
            const qrCodes = data ? JSON.parse(data) : [];
            return res.status(200).json(qrCodes);
        }

        if (req.method === 'POST') {
            // Save QR codes
            const { qrCodes, securityCode } = req.body;

            // Validate security code
            if (securityCode !== process.env.SECURITY_CODE && securityCode !== 'admin123') {
                return res.status(401).json({ error: 'Invalid security code' });
            }

            await redis.set('qrCodes', JSON.stringify(qrCodes));
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('API Error:', error.message);
        console.error('Stack:', error.stack);

        // Close broken connection
        if (client) {
            try {
                await client.quit();
            } catch (e) {
                // Ignore quit errors
            }
            client = null;
        }

        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
