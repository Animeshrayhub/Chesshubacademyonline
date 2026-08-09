import type { NavItem, DashboardRole, SubNavItem } from '@/types/dashboard';

// ─── Admin Navigation ─────────────────────────────────────────────────────────

const BLOG_CHILDREN: SubNavItem[] = [
  { label: 'All Posts',   href: '/dashboard/admin/blog' },
  { label: 'Create Post', href: '/dashboard/admin/blog/create' },
  { label: 'Categories',  href: '/dashboard/admin/blog/categories' },
  { label: 'Tags',        href: '/dashboard/admin/blog/tags' },
  { label: 'Drafts',      href: '/dashboard/admin/blog/drafts' },
  { label: 'Media',       href: '/dashboard/admin/blog/media' },
];

const REPORTS_CHILDREN: SubNavItem[] = [
  { label: 'Overview',         href: '/dashboard/admin/reports' },
  { label: 'Students',         href: '/dashboard/admin/reports/students' },
  { label: 'Attendance',       href: '/dashboard/admin/reports/attendance' },
  { label: 'Homework',         href: '/dashboard/admin/reports/homework' },
  { label: 'Coach Performance',href: '/dashboard/admin/reports/coaches' },
  { label: 'Demo Bookings',    href: '/dashboard/admin/reports/bookings' },
  { label: 'Revenue',          href: '/dashboard/admin/reports/revenue' },
  { label: 'Analytics',        href: '/dashboard/admin/reports/analytics' },
];

const ADMIN_SETTINGS_CHILDREN: SubNavItem[] = [
  { label: 'General',       href: '/dashboard/admin/settings' },
  { label: 'Profile',       href: '/dashboard/admin/settings/profile' },
  { label: 'Security',      href: '/dashboard/admin/settings/security' },
  { label: 'Notifications', href: '/dashboard/admin/settings/notifications' },
  { label: 'Appearance',    href: '/dashboard/admin/settings/appearance' },
  { label: 'Language',      href: '/dashboard/admin/settings/language' },
  { label: 'System',        href: '/dashboard/admin/settings/system' },
  { label: 'Integrations',  href: '/dashboard/admin/settings/integrations' },
];

const ADMIN_HOMEWORK_CHILDREN: SubNavItem[] = [
  { label: 'Workbooks & Chapters', href: '/dashboard/admin/homework' },
  { label: 'Library',              href: '/dashboard/admin/homework/library' },
];

export const ADMIN_NAV: NavItem[] = [
  { label: 'Overview',      href: '/dashboard/admin',               iconKey: 'layoutDashboard', roles: ['admin'] },
  { label: 'Admins',        href: '/dashboard/admin/admins',        iconKey: 'shield',          roles: ['admin'] },
  { label: 'Students',      href: '/dashboard/admin/students',      iconKey: 'users',           roles: ['admin'] },
  { label: 'Coaches',       href: '/dashboard/admin/coaches',       iconKey: 'graduationCap',   roles: ['admin'] },
  { label: 'Bookings',      href: '/dashboard/admin/bookings',      iconKey: 'calendarDays',    roles: ['admin'] },
  { label: 'Classes',       href: '/dashboard/admin/classes',       iconKey: 'video',           roles: ['admin'] },
  { label: 'Class Recordings', href: '/dashboard/admin/recordings', iconKey: 'video',          roles: ['admin'] },
  { label: 'Homework',      href: '/dashboard/admin/homework',      iconKey: 'bookOpen',        roles: ['admin'], children: ADMIN_HOMEWORK_CHILDREN },
  { label: 'Teaching Curriculum', href: '/dashboard/admin/curriculum', iconKey: 'bookOpen',     roles: ['admin'] },
  { label: 'Blog',          href: '/dashboard/admin/blog',          iconKey: 'fileText',        roles: ['admin'], children: BLOG_CHILDREN },
  { label: 'Announcements', href: '/dashboard/admin/announcements', iconKey: 'megaphone',       roles: ['admin'] },
  { label: 'Website Reviews', href: '/dashboard/admin/reviews', iconKey: 'award',           roles: ['admin'] },
  { label: 'Photo Gallery',   href: '/dashboard/admin/gallery', iconKey: 'fileText',        roles: ['admin'] },
  { label: 'Puzzle Bank',     href: '/dashboard/admin/puzzles',       iconKey: 'award',           roles: ['admin'] },
  { label: 'Site Media & Images', href: '/dashboard/admin/media', iconKey: 'fileText',       roles: ['admin'] },
  { label: 'Certificates',  href: '/dashboard/admin/certificates',  iconKey: 'award',           roles: ['admin'] },
  { label: 'Reports',       href: '/dashboard/admin/reports',       iconKey: 'barChart',        roles: ['admin'], children: REPORTS_CHILDREN },
  { label: 'Settings',      href: '/dashboard/admin/settings',      iconKey: 'settings',        roles: ['admin'], children: ADMIN_SETTINGS_CHILDREN },
];


// ─── Coach Navigation ─────────────────────────────────────────────────────────

const COACH_RECORDINGS_CHILDREN: SubNavItem[] = [
  { label: 'All Recordings',      href: '/dashboard/coach/recordings' },
  { label: 'Live Classes',        href: '/dashboard/coach/recordings/live-classes' },
  { label: 'Coach Lessons',       href: '/dashboard/coach/recordings/lessons' },
  { label: 'Tournament Analysis', href: '/dashboard/coach/recordings/tournament' },
  { label: 'Opening Library',     href: '/dashboard/coach/recordings/openings' },
  { label: 'Endgame Library',     href: '/dashboard/coach/recordings/endgame' },
];

const COACH_SETTINGS_CHILDREN: SubNavItem[] = [
  { label: 'General',       href: '/dashboard/coach/settings' },
  { label: 'Profile',       href: '/dashboard/coach/settings/profile' },
  { label: 'Security',      href: '/dashboard/coach/settings/security' },
  { label: 'Notifications', href: '/dashboard/coach/settings/notifications' },
];

const COACH_HOMEWORK_CHILDREN: SubNavItem[] = [
  { label: 'Submissions Review', href: '/dashboard/coach/homework' },
  { label: 'Library',            href: '/dashboard/coach/homework/library' },
];

export const COACH_NAV: NavItem[] = [
  { label: 'Overview',        href: '/dashboard/coach',              iconKey: 'layoutDashboard', roles: ['coach'] },
  { label: 'My Students',     href: '/dashboard/coach/students',     iconKey: 'users',           roles: ['coach'] },
  { label: "Today's Classes", href: '/dashboard/coach/classes',      iconKey: 'video',           roles: ['coach'] },
  { label: 'Attendance',      href: '/dashboard/coach/attendance',   iconKey: 'checkSquare',     roles: ['coach'] },
  { label: 'Homework',        href: '/dashboard/coach/homework',     iconKey: 'bookOpen',        roles: ['coach'], children: COACH_HOMEWORK_CHILDREN },
  { label: 'Teaching Curriculum', href: '/dashboard/coach/curriculum', iconKey: 'bookOpen',    roles: ['coach'] },
  { label: 'Puzzle Bank',      href: '/dashboard/coach/puzzles',      iconKey: 'award',           roles: ['coach'] },
  { label: 'Notes',           href: '/dashboard/coach/notes',        iconKey: 'fileText',        roles: ['coach'] },
  { label: 'Recordings',      href: '/dashboard/coach/recordings',   iconKey: 'playCircle',      roles: ['coach'], children: COACH_RECORDINGS_CHILDREN },
  { label: 'Profile',         href: '/dashboard/coach/profile',      iconKey: 'user',            roles: ['coach'] },
  { label: 'Settings',        href: '/dashboard/coach/settings',     iconKey: 'settings',        roles: ['coach'], children: COACH_SETTINGS_CHILDREN },
];

// ─── Student Navigation ───────────────────────────────────────────────────────

const STUDENT_HOMEWORK_CHILDREN: SubNavItem[] = [
  { label: 'Overview',          href: '/dashboard/student/homework' },
  { label: 'Tactics Puzzles',   href: '/dashboard/student/homework/puzzles' },
  { label: 'Study Workbooks',   href: '/dashboard/student/homework/workbooks' },
  { label: 'My Assignments',    href: '/dashboard/student/homework/assignments' },
];

const STUDENT_RECORDINGS_CHILDREN: SubNavItem[] = [
  { label: 'All Recordings',      href: '/dashboard/student/recordings' },
  { label: 'Live Classes',        href: '/dashboard/student/recordings/live-classes' },
  { label: 'Coach Lessons',       href: '/dashboard/student/recordings/lessons' },
  { label: 'Tournament Analysis', href: '/dashboard/student/recordings/tournament' },
  { label: 'Opening Library',     href: '/dashboard/student/recordings/openings' },
  { label: 'Endgame Library',     href: '/dashboard/student/recordings/endgame' },
];

const STUDENT_SETTINGS_CHILDREN: SubNavItem[] = [
  { label: 'General',       href: '/dashboard/student/settings' },
  { label: 'Profile',       href: '/dashboard/student/settings/profile' },
  { label: 'Security',      href: '/dashboard/student/settings/security' },
  { label: 'Notifications', href: '/dashboard/student/settings/notifications' },
];

export const STUDENT_NAV: NavItem[] = [
  { label: 'Overview',            href: '/dashboard/student',             iconKey: 'layoutDashboard', roles: ['student'] },
  { label: '📹 Live Classroom',    href: '/dashboard/student/classes',     iconKey: 'video',           roles: ['student'] },
  { label: 'AI Game Review Bot',  href: '/dashboard/student/review-bot',  iconKey: 'brain',           roles: ['student'] },
  { label: 'Homework',            href: '/dashboard/student/homework',    iconKey: 'bookOpen',        roles: ['student'], children: STUDENT_HOMEWORK_CHILDREN },
  { label: 'Puzzle Bank',         href: '/dashboard/student/puzzles',     iconKey: 'puzzle',          roles: ['student'] },
  { label: 'Study Library',       href: '/dashboard/student/studies',     iconKey: 'bookOpen',        roles: ['student'] },
  { label: 'My Games',       href: '/dashboard/student/games',       iconKey: 'bookOpen',        roles: ['student'] },
  { label: 'Progress',       href: '/dashboard/student/progress',    iconKey: 'trendingUp',      roles: ['student'] },
  { label: 'Certificates',   href: '/dashboard/student/certificates',iconKey: 'award',           roles: ['student'] },
  { label: 'Recordings',     href: '/dashboard/student/recordings',  iconKey: 'playCircle',      roles: ['student'], children: STUDENT_RECORDINGS_CHILDREN },
  { label: 'Profile',        href: '/dashboard/student/settings/profile',     iconKey: 'user',            roles: ['student'] },
  { label: 'Settings',       href: '/dashboard/student/settings',    iconKey: 'settings',        roles: ['student'], children: STUDENT_SETTINGS_CHILDREN },
];

// ─── Role → Nav resolver ──────────────────────────────────────────────────────
// Adding a new role: define its NavItem[] above, add to navMap below.
// Zero changes to any component or layout.

export function getNavForRole(role: DashboardRole): NavItem[] {
  const navMap: Partial<Record<DashboardRole, NavItem[]>> = {
    admin:   ADMIN_NAV,
    coach:   COACH_NAV,
    student: STUDENT_NAV,
    // parent: PARENT_NAV,  // ← Uncomment when Parent role is implemented
  };
  return navMap[role] ?? [];
}

// ─── Role metadata ────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<DashboardRole, string> = {
  admin:   'Administrator',
  coach:   'Coach',
  student: 'Student',
  parent:  'Parent',
};

export const ROLE_COLORS: Record<DashboardRole, string> = {
  admin:   'bg-purple-100 text-purple-700 border-purple-200',
  coach:   'bg-blue-100 text-blue-700 border-blue-200',
  student: 'bg-green-100 text-green-700 border-green-200',
  parent:  'bg-orange-100 text-orange-700 border-orange-200',
};
