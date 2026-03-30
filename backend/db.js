/**
 * Seeds the Supabase database with initial data on first run.
 * Only runs if the users table is empty.
 *
 * Seeding order matters due to foreign key dependencies:
 *   departments → rooms → courses → users → course_offerings
 *   → timetable_entries → clash_reports
 */
require('dotenv').config();
const bcrypt   = require('bcryptjs');
const supabase = require('./supabase');

// day_of_week: 1 = Monday … 7 = Sunday
const DAY = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };

async function seed() {
  // Check for a specific seeded account, not just any user.
  // This prevents dummy/placeholder data from blocking the seed.
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'panford@knust.edu.gh')
    .maybeSingle();

  if (existing) {
    console.log('Database already seeded — skipping.');
    return;
  }

  console.log('Seeding database...');

  // ── 1. Departments ──────────────────────────────────────
  const { data: depts, error: deptErr } = await supabase
    .from('departments')
    .insert([
      { code: 'CS',   name: 'Computer Science', faculty: 'Science'     },
      { code: 'MATH', name: 'Mathematics',       faculty: 'Science'     },
      { code: 'ENG',  name: 'Engineering',       faculty: 'Engineering' },
    ])
    .select();
  if (deptErr) throw new Error(`departments: ${deptErr.message}`);

  const cs   = depts.find(d => d.code === 'CS');
  const math = depts.find(d => d.code === 'MATH');

  // ── 2. Rooms ───────────────────────────────────────────
  const { data: rooms, error: roomErr } = await supabase
    .from('rooms')
    .insert([
      { name: 'Room 301', building: 'Block A', capacity: 50, is_lab: false },
      { name: 'Room 303', building: 'Block A', capacity: 50, is_lab: false },
      { name: 'Room 402', building: 'Block B', capacity: 60, is_lab: false },
      { name: 'Room 201', building: 'Block A', capacity: 40, is_lab: false },
      { name: 'Room 501', building: 'Block C', capacity: 45, is_lab: false },
      { name: 'Lab 205',  building: 'Block B', capacity: 30, is_lab: true  },
    ])
    .select();
  if (roomErr) throw new Error(`rooms: ${roomErr.message}`);

  const room = (name) => rooms.find(r => r.name === name);

  // ── 3. Courses ─────────────────────────────────────────
  const { data: courses, error: courseErr } = await supabase
    .from('courses')
    .insert([
      { code: 'CS301', title: 'Computer Networks',    department_id: cs.id,   credit_hours: 3, level: '300' },
      { code: 'CS201', title: 'Data Structures',      department_id: cs.id,   credit_hours: 3, level: '200' },
      { code: 'CS401', title: 'Software Engineering', department_id: cs.id,   credit_hours: 3, level: '400' },
      { code: 'CS302', title: 'Web Development',      department_id: cs.id,   credit_hours: 3, level: '300' },
      { code: 'CS402', title: 'Machine Learning',     department_id: cs.id,   credit_hours: 3, level: '400' },
      { code: 'CS303', title: 'Database Systems',     department_id: cs.id,   credit_hours: 3, level: '300' },
    ])
    .select();
  if (courseErr) throw new Error(`courses: ${courseErr.message}`);

  const course = (code) => courses.find(c => c.code === code);

  // ── 4. Users ───────────────────────────────────────────
  const hash = (pw) => bcrypt.hashSync(pw, 10);
  const { data: users, error: userErr } = await supabase
    .from('users')
    .insert([
      { full_name: 'Dr. Asante',  email: 'asante@knust.edu.gh',  password_hash: hash('password123'), role: 'lecturer', department_id: cs.id,   staff_id: 'STF001' },
      { full_name: 'Dr. Ofori',   email: 'ofori@knust.edu.gh',   password_hash: hash('password123'), role: 'lecturer', department_id: cs.id,   staff_id: 'STF002' },
      { full_name: 'Dr. Boateng', email: 'boateng@knust.edu.gh', password_hash: hash('password123'), role: 'lecturer', department_id: cs.id,   staff_id: 'STF003' },
      { full_name: 'Dr. Mensah',  email: 'mensah@knust.edu.gh',  password_hash: hash('password123'), role: 'lecturer', department_id: math.id, staff_id: 'STF004' },
      { full_name: 'John Doe',    email: 'john@knust.edu.gh',    password_hash: hash('password123'), role: 'lecturer', department_id: cs.id,   staff_id: 'STF005' },
      { full_name: 'Jane Smith',  email: 'jane@knust.edu.gh',    password_hash: hash('password123'), role: 'lecturer', department_id: math.id, staff_id: 'STF006' },
      { full_name: 'Alex Asante', email: 'alex@knust.edu.gh',    password_hash: hash('password123'), role: 'student',  department_id: cs.id,   student_id: 'STU001' },
    ])
    .select();
  if (userErr) throw new Error(`users: ${userErr.message}`);

  const user = (name) => users.find(u => u.full_name === name);

  // ── 5. Course offerings ────────────────────────────────
  const { data: offerings, error: offerErr } = await supabase
    .from('course_offerings')
    .insert(
      courses.map(c => ({
        course_id:      c.id,
        academic_year:  '2025/2026',
        semester:       '2',
        coordinator_id: user('John Doe').id,
      }))
    )
    .select();
  if (offerErr) throw new Error(`course_offerings: ${offerErr.message}`);

  const offering = (code) => {
    const c = course(code);
    return offerings.find(o => o.course_id === c.id);
  };

  // ── 6. Timetable entries ───────────────────────────────
  const { error: ttErr } = await supabase.from('timetable_entries').insert([
    { offering_id: offering('CS301').id, day_of_week: DAY.Monday,    start_time: '09:00', end_time: '11:00', room_id: room('Room 301').id, lecturer_id: user('Dr. Asante').id,  created_by: user('John Doe').id },
    { offering_id: offering('CS201').id, day_of_week: DAY.Tuesday,   start_time: '09:00', end_time: '11:00', room_id: room('Room 303').id, lecturer_id: user('Dr. Ofori').id,   created_by: user('John Doe').id },
    { offering_id: offering('CS401').id, day_of_week: DAY.Tuesday,   start_time: '10:00', end_time: '12:00', room_id: room('Room 402').id, lecturer_id: user('Dr. Boateng').id, created_by: user('John Doe').id },
    { offering_id: offering('CS302').id, day_of_week: DAY.Wednesday, start_time: '10:00', end_time: '12:00', room_id: room('Room 201').id, lecturer_id: user('Dr. Boateng').id, created_by: user('John Doe').id },
    { offering_id: offering('CS402').id, day_of_week: DAY.Thursday,  start_time: '11:00', end_time: '13:00', room_id: room('Room 501').id, lecturer_id: user('Dr. Mensah').id,  created_by: user('John Doe').id },
    { offering_id: offering('CS303').id, day_of_week: DAY.Friday,    start_time: '13:00', end_time: '15:00', room_id: room('Lab 205').id,  lecturer_id: user('Dr. Mensah').id,  created_by: user('John Doe').id },
  ]);
  if (ttErr) throw new Error(`timetable_entries: ${ttErr.message}`);

  // ── 7. Clash reports ───────────────────────────────────
  const { error: clashErr } = await supabase.from('clash_reports').insert([
    {
      reported_by:   user('John Doe').id,
      course_1_code: 'CS301',
      course_2_code: 'CS303',
      day_of_week:   DAY.Monday,
      time_range:    '13:00 – 15:00',
      status:        'pending',
      description:   'Room overlap detected on Monday afternoon.',
    },
    {
      reported_by:   user('Jane Smith').id,
      course_1_code: 'CS302',
      course_2_code: 'CS401',
      day_of_week:   DAY.Thursday,
      time_range:    '14:00 – 16:00',
      status:        'pending',
      description:   'Schedule conflict on Thursday.',
    },
    {
      reported_by:     user('Alex Asante').id,
      course_1_code:   'CS201',
      course_2_code:   'CS402',
      day_of_week:     DAY.Friday,
      time_range:      '11:00 – 13:00',
      status:          'resolved',
      description:     'Lecturer room booking overlap on Friday.',
      resolution_note: 'Room reassigned to Room 210. Schedule adjusted to avoid overlap.',
      resolved_by:     user('John Doe').id,
      resolved_at:     new Date().toISOString(),
    },
  ]);
  if (clashErr) throw new Error(`clash_reports: ${clashErr.message}`);

  // ── 8. Enrollments ─────────────────────────────────────────
  // Enroll Alex Asante (student) in all CS course offerings
  const student = user('Alex Asante');
  const { error: enrollErr } = await supabase
    .from('enrollments')
    .insert(offerings.map(o => ({ student_id: student.id, offering_id: o.id })));
  if (enrollErr) throw new Error(`enrollments: ${enrollErr.message}`);

  console.log('Database seeded successfully.');
}

module.exports = { seed };
