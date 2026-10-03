-- Phone on users for unified login (staff / admin / customer accounts)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);
