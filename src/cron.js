const { Pool } = require('pg');
const ToiletService = require('./services/toiletService');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const toiletService = new ToiletService(pool);

async function updateToiletData() {
    console.log('=== Starting one-time toilet data update ===');
    try {
        const lastProcessedPage = await toiletService.getLastProcessedPage();
        console.log(`Resuming from page ${lastProcessedPage + 1}`);
        
        const lastPage = await toiletService.fetchAllToilets(lastProcessedPage);
        console.log('=== Data fetch completed ===');
        console.log(`Total pages processed: ${lastPage}`);
        
        // Exit after completion
        console.log('Exiting process...');
        pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Fatal error updating toilet data:', error);
        pool.end();
        process.exit(1);
    }
}

// Run once immediately
updateToiletData();