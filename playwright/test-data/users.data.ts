export const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@chesshubacademy.online',
    password: process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!',
    name: 'Master Admin',
    role: 'admin',
  },
  coach: {
    email: process.env.TEST_COACH_EMAIL || 'coach@chesshubacademy.online',
    password: process.env.TEST_COACH_PASSWORD || 'CoachPassword123!',
    name: 'GM Coach Alex',
    role: 'coach',
  },
  student: {
    email: process.env.TEST_STUDENT_EMAIL || 'student@chesshubacademy.online',
    password: process.env.TEST_STUDENT_PASSWORD || 'StudentPassword123!',
    name: 'Leo Grandmaster-in-Training',
    role: 'student',
  },
  invalidUser: {
    email: 'nonexistent@chesshubacademy.online',
    password: 'WrongPassword123!',
  },
  emptyUser: {
    email: '',
    password: '',
  },
};
