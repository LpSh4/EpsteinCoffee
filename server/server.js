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
        console.log('Attempting to connect to MongoDB with URI:', process.env.MONGODB_URI);
        await client.connect();
        console.log('Connected to database:', dbName);
        const db = client.db(dbName);
        const menu = await db.collection('menu').find().toArray();
        console.log('Fetched menu items:', menu);
        if (!menu) throw new Error('No menu data found');
        res.json(menu);
    } catch (error) {
        console.error('Menu fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch menu', details: error.message });
    } finally {
        await client.close();
    }
});

// Use PORT from environment variable, fallback to 3000 for local dev
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));