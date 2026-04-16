-- Migration v26: Create durations master table for dynamic plan durations

CREATE TABLE IF NOT EXISTS durations (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  label      VARCHAR(50)  NOT NULL COMMENT 'Display label e.g. "1 Year", "3 Years", "Lifetime"',
  value      TINYINT UNSIGNED NULL     COMMENT 'Number of years; NULL for lifetime',
  type       ENUM('year','lifetime')   NOT NULL DEFAULT 'year',
  sort_order TINYINT UNSIGNED          NOT NULL DEFAULT 0,
  is_active  TINYINT(1)               NOT NULL DEFAULT 1,
  created_at TIMESTAMP                NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default durations
INSERT IGNORE INTO durations (label, value, type, sort_order) VALUES
  ('1 Year',   1,    'year',     1),
  ('3 Years',  3,    'year',     2),
  ('Lifetime', NULL, 'lifetime', 3);
