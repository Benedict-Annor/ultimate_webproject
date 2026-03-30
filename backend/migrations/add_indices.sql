-- ================================================================
-- Performance indices for frequently queried columns.
-- Run once in the Supabase SQL editor (safe to re-run — uses
-- CREATE INDEX IF NOT EXISTS).
-- ================================================================

-- timetable_entries: clash detection queries filter on day + room/lecturer
CREATE INDEX IF NOT EXISTS idx_tte_day_room
  ON timetable_entries (day_of_week, room_id);

CREATE INDEX IF NOT EXISTS idx_tte_day_lecturer
  ON timetable_entries (day_of_week, lecturer_id);

-- timetable_entries: status filter used in auto-detect endpoint
CREATE INDEX IF NOT EXISTS idx_tte_status
  ON timetable_entries (status);

-- timetable_entries: offering join
CREATE INDEX IF NOT EXISTS idx_tte_offering
  ON timetable_entries (offering_id);

-- notifications: every query filters by user_id
CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications (user_id);

-- notifications: unread count check
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications (user_id, is_read);

-- clash_reports: status filter used in stats + list endpoints
CREATE INDEX IF NOT EXISTS idx_clash_status
  ON clash_reports (status);

-- clash_reports: matching detected clashes by day + course codes
CREATE INDEX IF NOT EXISTS idx_clash_day_courses
  ON clash_reports (day_of_week, course_1_code, course_2_code);

-- enrollments: student enrollment lookups
CREATE INDEX IF NOT EXISTS idx_enrollments_student
  ON enrollments (student_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_offering
  ON enrollments (offering_id);

-- users: role filter (e.g. notifying all students)
CREATE INDEX IF NOT EXISTS idx_users_role
  ON users (role);
