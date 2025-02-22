const axios = require('axios');

class ToiletService {
    constructor(db) {
        this.db = db;
        this.baseUrl = 'https://www.refugerestrooms.org/api/v1/restrooms';
        this.LA_COORDS = {
            lat: 34.0522,
            lng: -118.2437
        };
        this.searchLocations = [
            { lat: 34.0522, lng: -118.2437, name: 'Los Angeles' },
            { lat: 34.1478, lng: -118.1445, name: 'Pasadena' },
            { lat: 33.9416, lng: -118.4085, name: 'Santa Monica' },
            { lat: 34.0025, lng: -118.4116, name: 'Culver City' },
            { lat: 33.9812, lng: -118.4742, name: 'Venice' },
            { lat: 34.1808, lng: -118.3090, name: 'Burbank' },
            { lat: 34.0195, lng: -118.4912, name: 'Glendale' },
            { lat: 33.8869, lng: -118.4095, name: 'Manhattan Beach' }
        ];
        this.BATCH_SIZE = 10;
    }

    async fetchToiletsByLocation() {
        let allToilets = new Map();

        for (const location of this.searchLocations) {
            let page = 1;
            let hasMore = true;
            let retries = 3;

            while (hasMore && retries > 0) {
                try {
                    console.log(`Fetching page ${page} for ${location.name}...`);
                    const response = await axios.get('https://www.refugerestrooms.org/api/v1/restrooms/search', {
                        params: {
                            page: page,
                            per_page: 100,
                            lat: location.lat,
                            lng: location.lng,
                            query: location.name
                        },
                        timeout: 10000 // 10 second timeout
                    });

                    if (response.data.length === 0) {
                        hasMore = false;
                        continue;
                    }

                    response.data.forEach(toilet => {
                        allToilets.set(toilet.id, toilet);
                    });

                    page++;
                    retries = 3; // Reset retries on successful request
                    
                    // Add delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error(`Error fetching page ${page} for ${location.name}:`, error.response?.data || error.message);
                    retries--;
                    if (retries > 0) {
                        console.log(`Retrying... ${retries} attempts remaining`);
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
                    } else {
                        console.log(`Skipping remaining pages for ${location.name} after multiple failures`);
                        hasMore = false;
                    }
                }
            }
        }

        return Array.from(allToilets.values());
    }

    async saveToilets(toilets) {
        const client = await this.db.connect();
        
        try {
            await client.query('BEGIN');

            for (const toilet of toilets) {
                await client.query(
                    `INSERT INTO toilets (id, name, street, city, state, accessible, unisex, latitude, longitude)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     ON CONFLICT (id) DO UPDATE SET
                     name = EXCLUDED.name,
                     street = EXCLUDED.street,
                     city = EXCLUDED.city,
                     state = EXCLUDED.state,
                     accessible = EXCLUDED.accessible,
                     unisex = EXCLUDED.unisex,
                     latitude = EXCLUDED.latitude,
                     longitude = EXCLUDED.longitude,
                     updated_at = CURRENT_TIMESTAMP`,
                    [
                        toilet.id,
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

    async fetchAllToilets(lastProcessedPage = 0) {
        let allToilets = new Map();
        let page = lastProcessedPage + 1;
        let hasMore = true;
        let retries = 3;
        let totalToilets = 0;

        console.log('Starting data fetch process...');

        while (hasMore && retries > 0) {
            try {
                console.log(`\n=== Processing batch starting from page ${page} ===`);
                const batchPages = [];
                
                // Prepare batch of 10 pages
                for (let i = 0; i < this.BATCH_SIZE; i++) {
                    batchPages.push(page + i);
                }
                
                console.log(`Fetching pages ${batchPages[0]} to ${batchPages[batchPages.length - 1]}`);
                
                // Fetch all pages in the batch concurrently
                const pagePromises = batchPages.map(p => this.fetchPage(p));
                const results = await Promise.allSettled(pagePromises);
                
                let batchHasData = false;
                
                // Process results
                results.forEach((result, index) => {
                    const currentPage = batchPages[index];
                    if (result.status === 'fulfilled') {
                        const toilets = result.value;
                        console.log(`Page ${currentPage}: Found ${toilets.length} toilets`);
                        
                        if (toilets.length > 0) {
                            batchHasData = true;
                            toilets.forEach(toilet => {
                                if (this.isInLAArea(toilet.latitude, toilet.longitude)) {
                                    allToilets.set(toilet.id, toilet);
                                }
                            });
                        }
                    } else {
                        console.error(`Failed to fetch page ${currentPage}:`, result.reason);
                        retries--;
                    }
                });

                // If no pages in batch had data, we're done
                if (!batchHasData) {
                    console.log('No more data found in current batch. Finishing up...');
                    hasMore = false;
                    break;
                }

                // Save batch progress
                const toiletsInBatch = allToilets.size;
                if (toiletsInBatch > 0) {
                    console.log(`\nSaving batch of ${toiletsInBatch} toilets from LA area...`);
                    await this.saveToilets(Array.from(allToilets.values()));
                    totalToilets += toiletsInBatch;
                    allToilets.clear();
                }

                // Update progress
                page += this.BATCH_SIZE;
                await this.saveProgress(page);
                console.log(`Progress saved. Last processed page: ${page - 1}`);
                console.log(`Total toilets found so far: ${totalToilets}`);

                // Add delay between batches
                console.log('Waiting 2 seconds before next batch...\n');
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                console.error('Batch processing error:', error);
                retries--;
                if (retries > 0) {
                    console.log(`Retrying... ${retries} attempts remaining`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } else {
                    console.log('Max retries reached. Stopping process.');
                    hasMore = false;
                }
            }
        }

        // Save any remaining toilets
        if (allToilets.size > 0) {
            console.log(`\nSaving final batch of ${allToilets.size} toilets...`);
            await this.saveToilets(Array.from(allToilets.values()));
            totalToilets += allToilets.size;
        }

        console.log(`\n=== Fetch process complete ===`);
        console.log(`Total toilets saved: ${totalToilets}`);
        return page - 1;
    }

    async fetchPage(page) {
        const response = await axios.get(this.baseUrl, {
            params: { page, per_page: 100 },
            timeout: 15000
        });
        return response.data;
    }

    async saveProgress(lastPage) {
        const client = await this.db.connect();
        try {
            await client.query(
                `INSERT INTO fetch_progress (last_page, updated_at)
                 VALUES ($1, CURRENT_TIMESTAMP)
                 ON CONFLICT (id) DO UPDATE SET
                 last_page = EXCLUDED.last_page,
                 updated_at = CURRENT_TIMESTAMP`,
                [lastPage]
            );
        } finally {
            client.release();
        }
    }

    async getLastProcessedPage() {
        const client = await this.db.connect();
        try {
            const result = await client.query('SELECT last_page FROM fetch_progress LIMIT 1');
            return result.rows[0]?.last_page || 0;
        } finally {
            client.release();
        }
    }

    // Helper function to determine if coordinates are in the LA area
    isInLAArea(lat, lng) {
        // LA coordinates
        const LA_LAT = 34.0522;
        const LA_LNG = -118.2437;
        
        // Calculate distance using Haversine formula
        const R = 3959; // Earth's radius in miles
        const dLat = this.toRad(lat - LA_LAT);
        const dLon = this.toRad(lng - LA_LNG);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(LA_LAT)) * Math.cos(this.toRad(lat)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        // Return true if within 50 miles of LA
        return distance <= 50;
    }

    toRad(degrees) {
        return degrees * (Math.PI/180);
    }
}

module.exports = ToiletService; 