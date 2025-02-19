const { Pool } = require('pg');
const ToiletService = require('./services/toiletService');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const toiletService = new ToiletService(pool);

console.log('Starting toilet data update...');

async function updateToiletData() {
    try {
        const toilets = await toiletService.fetchToilets();
        await toiletService.saveToilets(toilets);
        console.log('Toilet data updated successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error updating toilet data:', error);
        process.exit(1);
    }
}

updateToiletData(); 