const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const url = process.env.MONGODB_URI;
const client = new MongoClient(url);
const dbName = 'coffeeShop';

app.get('/api/menu', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const menu = await db.collection('menu').find().toArray();
        res.json(menu);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch menu' });
    } finally {
        await client.close();
    }
});

app.post('/api/orders', async (req, res) => {
    const { userId, items } = req.body;
    if (!userId || !items) return res.status(400).json({ error: 'Missing userId or items' });
    try {
        await client.connect();
        const db = client.db(dbName);
        await db.collection('orders').insertOne({ userId, items, date: new Date() });
        res.status(201).json({ message: 'Order placed' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save order' });
    } finally {
        await client.close();
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));