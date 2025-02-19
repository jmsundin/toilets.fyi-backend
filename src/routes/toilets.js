const express = require('express');
const router = express.Router();
const ToiletService = require('../services/toiletService');

// Get all toilets
router.get('/', async (req, res) => {
    const db = req.app.locals.db;
    try {
        const result = await db.query(
            'SELECT * FROM toilets ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get toilets near a location
router.get('/nearby', async (req, res) => {
    const { lat, lng, radius = 5 } = req.query;
    const db = req.app.locals.db;

    if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    try {
        const result = await db.query(
            `SELECT *, 
             (point($1, $2) <@> point(longitude, latitude)) as distance
             FROM toilets
             WHERE (point($1, $2) <@> point(longitude, latitude)) <= $3
             ORDER BY distance`,
            [lng, lat, radius]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 