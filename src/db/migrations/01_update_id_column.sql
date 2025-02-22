-- First, create a temporary table with the new schema
CREATE TABLE toilets_new (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255),
    street VARCHAR(255),
    city VARCHAR(255),
    state VARCHAR(50),
    accessible BOOLEAN,
    unisex BOOLEAN,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from the old table to the new one
INSERT INTO toilets_new 
SELECT id::integer, name, street, city, state, accessible, unisex, latitude, longitude, created_at, updated_at 
FROM toilets;

-- Drop the old table
DROP TABLE toilets;

-- Rename the new table to the original name
ALTER TABLE toilets_new RENAME TO toilets;

-- Recreate the index
CREATE INDEX idx_toilets_location ON toilets(latitude, longitude); 