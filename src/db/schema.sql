CREATE TABLE IF NOT EXISTS toilets (
    id SERIAL PRIMARY KEY,
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

CREATE INDEX idx_toilets_location ON toilets(latitude, longitude); 