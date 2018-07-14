-- Up
CREATE TABLE notes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    data BLOB NOT NULL
);

CREATE TABLE chords (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    data BLOB NOT NULL
);

CREATE TABLE strumming_patterns (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    data BLOB NOT NULL
);


-- Down
DROP TABLE notes;
DROP TABLE chords;
DROP TABLE strumming_patterns;