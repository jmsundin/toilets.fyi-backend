const express = require('express');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const toiletRoutes = require('./routes/toilets');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Make db connection available to routes
app.locals.db = pool;

app.use(express.json());

// Routes
app.use('/api/toilets', toiletRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 