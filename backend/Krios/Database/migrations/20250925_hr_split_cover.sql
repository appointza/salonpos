-- Split-shift windows and leave cover staff (required by ShiftService / LeaveService)
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS "splitStart" TIME,
  ADD COLUMN IF NOT EXISTS "splitEnd" TIME;

ALTER TABLE leaves
  ADD COLUMN IF NOT EXISTS "coverStaffId" BIGINT;
