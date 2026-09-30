-- Keep imported business tables unchanged; presentation data is additive.
CREATE TABLE moment_image_focus (
    image_id INTEGER PRIMARY KEY REFERENCES blog_image(id) ON DELETE CASCADE,
    focus_x REAL NOT NULL DEFAULT 50 CHECK (focus_x BETWEEN 0 AND 100),
    focus_y REAL NOT NULL DEFAULT 50 CHECK (focus_y BETWEEN 0 AND 100)
);
