CREATE TABLE IF NOT EXISTS fetch_progress (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_page INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial record
INSERT INTO fetch_progress (id, last_page) 
VALUES (1, 0)
ON CONFLICT DO NOTHING; 