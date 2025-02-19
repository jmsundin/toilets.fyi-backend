const axios = require('axios');

class ToiletService {
    constructor(db) {
        this.db = db;
    }

    async fetchToilets() {
        try {
            // Refuge Restrooms API - fetch toilets in LA area
            const response = await axios.get('https://www.refugerestrooms.org/api/v1/restrooms/search', {
                params: {
                    page: 1,
                    per_page: 100,
                    lat: 34.0522,  // LA coordinates
                    lng: -118.2437,
                    query: 'Los Angeles'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching toilet data:', error);
            throw error;
        }
    }

    async saveToilets(toilets) {
        const client = await this.db.connect();
        
        try {
            await client.query('BEGIN');

            for (const toilet of toilets) {
                await client.query(
                    `INSERT INTO toilets (name, street, city, state, accessible, unisex, latitude, longitude)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     ON CONFLICT (id) DO UPDATE SET
                     name = EXCLUDED.name,
                     updated_at = CURRENT_TIMESTAMP`,
                    [
                        toilet.name,
                        toilet.street,
                        toilet.city,
                        toilet.state,
                        toilet.accessible,
                        toilet.unisex,
                        toilet.latitude,
                        toilet.longitude
                    ]
                );
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = ToiletService; 