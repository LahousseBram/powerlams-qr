import { createClient } from 'redis';

let client;

async function getRedisClient() {
    if (!client) {
        client = createClient({
            url: process.env.REDIS_URL
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

    try {
        const redis = await getRedisClient();

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
        console.error('Redis error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
