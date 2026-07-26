// ─── Dashboard Core Types ─────────────────────────────────────────────────────

export type DashboardRole = 'admin' | 'coach' | 'student' | 'parent'; // parent: future

// ─── Icon Keys ────────────────────────────────────────────────────────────────

export type DashboardIconKey =
  | 'layoutDashboard'
  | 'users'
  | 'graduationCap'
  | 'calendarDays'
  | 'video'
  | 'bookOpen'
  | 'fileText'
  | 'bell'
  | 'award'
  | 'barChart'
  | 'settings'
  | 'checkSquare'
  | 'playCircle'
  | 'trendingUp'
  | 'star'
  | 'user'
  | 'brain'
  | 'externalLink'
  | 'megaphone'
  | 'search'
  | 'plus'
  | 'chevronLeft'
  | 'chevronRight'
  | 'image'
  | 'tag'
  | 'folder'
  | 'dollarSign'
  | 'activity'
  | 'shield'
  | 'globe'
  | 'link'
  | 'puzzle'
  | 'clipboard'
  | 'pencil'
  | 'trash'
  | 'eye'
  | 'x'
  | 'arrowLeft'
  | 'refresh'
  | 'menu'
  | 'trophy'
  | 'clock'
  | 'target'
  | 'heart'
  | 'home';

// ─── Navigation ───────────────────────────────────────────────────────────────

export interface SubNavItem {
  label: string;
  href: string;
  iconKey?: DashboardIconKey;
}

export interface NavItem {
  label: string;
  href: string;
  iconKey: DashboardIconKey;
  roles: DashboardRole[];
  badge?: number;
  disabled?: boolean;
  futurePermission?: string;
  children?: SubNavItem[];
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

export type TrendDirection = 'up' | 'down' | 'neutral';

export interface StatCardData {
  label: string;
  value: string;
  trend?: TrendDirection;
  trendValue?: string;
  iconKey: DashboardIconKey;
  colorScheme?: 'blue' | 'gold' | 'green' | 'purple';
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  iconKey: DashboardIconKey;
}

// ─── Table ────────────────────────────────────────────────────────────────────

export interface TableColumn {
  key: string;
  label: string;
  width?: string;
}

// ─── Quick Action Card ────────────────────────────────────────────────────────

export interface QuickAction {
  label: string;
  description: string;
  href: string;
  iconKey: DashboardIconKey;
  colorScheme?: 'blue' | 'gold' | 'green' | 'purple';
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationCategory =
  | 'homework'
  | 'classes'
  | 'announcements'
  | 'certificates'
  | 'bookings'
  | 'system';

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

// ─── Settings Section ─────────────────────────────────────────────────────────

export interface SettingsSection {
  label: string;
  href: string;
  iconKey: DashboardIconKey;
}

// ─── Database Entity Types ────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'COACH' | 'STUDENT';
export type UserStatus = 'active' | 'disabled' | 'archived';
export type StudentLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type BookingStatus = 'pending' | 'assigned' | 'completed' | 'cancelled';
export type FideTitle = 'GM' | 'WGM' | 'IM' | 'WIM' | 'FM' | 'WFM' | 'CM' | 'WCM' | 'NM' | '';

export interface DbUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface DbCoachProfile {
  id: string;
  user_id: string;
  title: string;
  photo_url: string | null;
  whatsapp: string;
  languages: string[];
  experience_years: number;
  bio: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface DbStudentProfile {
  id: string;
  user_id: string;
  age: number;
  level: StudentLevel;
  parent_name: string;
  parent_whatsapp: string;
  joined_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface DbCoachAssignment {
  id: string;
  coach_id: string;
  student_id: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface DbBooking {
  id: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  student_name: string;
  student_age: number;
  preferred_time: string;
  assigned_coach_id: string | null;
  zoom_meeting_url: string | null;
  status: BookingStatus;
  created_at: string;
}

export interface DbAnnouncement {
  id: string;
  title: string;
  body: string;
  target_roles: string[];
  is_published: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCertificate {
  id: string;
  student_id: string;
  title: string;
  file_url: string | null;
  issued_at: string;
  created_at: string;
  updated_at: string;
}

// ─── Enriched / Joined Types ─────────────────────────────────────────────────

export interface AdminCoachRow extends DbUser {
  profile: DbCoachProfile | null;
  assigned_student_count: number;
}

export interface AdminStudentRow extends DbUser {
  profile: DbStudentProfile | null;
  assigned_coach: { id: string; first_name: string; last_name: string } | null;
}

export interface AdminCertificateRow extends DbCertificate {
  student: Pick<DbUser, 'id' | 'first_name' | 'last_name' | 'email'> | null;
}
