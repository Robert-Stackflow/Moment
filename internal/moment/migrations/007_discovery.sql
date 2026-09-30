CREATE TABLE moment_post_discovery (
    post_id INTEGER PRIMARY KEY REFERENCES blog(id) ON DELETE CASCADE,
    latitude REAL,
    longitude REAL,
    precision TEXT NOT NULL DEFAULT 'private' CHECK (precision IN ('private','approximate','exact')),
    timeline TEXT NOT NULL DEFAULT 'show' CHECK (timeline IN ('show','hide')),
    CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
);
CREATE TABLE moment_image_discovery (
    image_id INTEGER PRIMARY KEY REFERENCES blog_image(id) ON DELETE CASCADE,
    latitude REAL,
    longitude REAL,
    precision TEXT NOT NULL DEFAULT 'inherit' CHECK (precision IN ('inherit','private','approximate','exact')),
    timeline TEXT NOT NULL DEFAULT 'inherit' CHECK (timeline IN ('inherit','show','hide')),
    CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
);
