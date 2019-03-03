-- Up
CREATE TABLE items (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    data BLOB NOT NULL
);

-- Down
DROP TABLE items;