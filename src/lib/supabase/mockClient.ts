import { cookies } from 'next/headers';

// Define the global database structure to persist state across Next.js compiler reloads
const globalForMock = globalThis as any;

if (!globalForMock.__mockUsers) {
  globalForMock.__mockUsers = [
    {
      id: 'usr-admin-123',
      username: 'admin_portal',
      email: 'admin@chesshub.com',
      password: 'Admin123!',
      first_name: 'Academy',
      last_name: 'Admin',
      role: 'ADMIN',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      archived_at: null,
    },
    {
      id: 'usr-admin-roy',
      username: 'royduguu',
      email: 'royduguu786@gmail.com',
      password: 'Admin123!',
      first_name: 'Roy',
      last_name: 'Duguu',
      role: 'ADMIN',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      archived_at: null,
    },

    {
      id: 'usr-student-123',
      username: 'student_rahul',
      email: 'student@chesshub.com',
      password: 'Student123!',
      first_name: 'Rahul',
      last_name: 'Patel',
      role: 'STUDENT',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      archived_at: null,
    },
  ];
}

if (!globalForMock.__mockCoachProfiles) {
  globalForMock.__mockCoachProfiles = [];
}

if (!globalForMock.__mockStudentProfiles) {
  globalForMock.__mockStudentProfiles = [
    {
      id: 'prof-student-rahul',
      user_id: 'usr-student-123',
      age: 12,
      level: 'BEGINNER',
      parent_name: 'Carol Patel',
      parent_whatsapp: '+19998887777',
      joined_date: '2026-01-01T00:00:00Z',
      notes: 'Positional training focus.',
      created_at: '2026-01-01T00:00:00Z',
    }
  ];
}

if (!globalForMock.__mockCoachStudentAssignments) {
  globalForMock.__mockCoachStudentAssignments = [];
}

if (!globalForMock.__mockClasses) globalForMock.__mockClasses = [];
if (!globalForMock.__mockBookings) globalForMock.__mockBookings = [];
if (!globalForMock.__mockAuditLogs) globalForMock.__mockAuditLogs = [];
if (!globalForMock.__mockAnnouncements) globalForMock.__mockAnnouncements = [];
if (!globalForMock.__mockNotifications) globalForMock.__mockNotifications = [];
if (!globalForMock.__mockHomeworkAssignments) globalForMock.__mockHomeworkAssignments = [];
if (!globalForMock.__mockHomeworkSubmissions) globalForMock.__mockHomeworkSubmissions = [];
if (!globalForMock.__mockClassEnrollments) globalForMock.__mockClassEnrollments = [];
if (!globalForMock.__mockClassStudents) globalForMock.__mockClassStudents = [];
if (!globalForMock.__mockClassRecordings) globalForMock.__mockClassRecordings = [];

if (!globalForMock.__mockHomeworkWorkbooks) {
  globalForMock.__mockHomeworkWorkbooks = [
    {
      id: 'wb-beginner-tactics',
      title: 'Beginner Tactics',
      description: 'Fundamental tactical chess motifs.',
      track: 'Beginner',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'wb-intermediate-endgames',
      title: 'Intermediate Endgames',
      description: 'Essential king and pawn endgames.',
      track: 'Intermediate',
      created_at: '2026-01-01T00:00:00Z',
    }
  ];
}

if (!globalForMock.__mockHomeworkChapters) {
  globalForMock.__mockHomeworkChapters = [
    {
      id: 'ch-pin',
      workbook_id: 'wb-beginner-tactics',
      chapter_number: 1,
      title: 'The Pin',
      description: 'Pinning opponent pieces.',
      questions_count: 5,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'ch-fork',
      workbook_id: 'wb-beginner-tactics',
      chapter_number: 2,
      title: 'The Fork',
      description: 'Forking with knights and pawns.',
      questions_count: 5,
      created_at: '2026-01-01T00:00:00Z',
    }
  ];
}

if (!globalForMock.__mockLmsModules) globalForMock.__mockLmsModules = [];
if (!globalForMock.__mockLmsCourseEnrollments) globalForMock.__mockLmsCourseEnrollments = [];
if (!globalForMock.__mockSystemConfig) globalForMock.__mockSystemConfig = [];
if (!globalForMock.__mockClassroomChat) globalForMock.__mockClassroomChat = [];

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const mockUsers = globalForMock.__mockUsers;
export const mockCoachProfiles = globalForMock.__mockCoachProfiles;
export const mockStudentProfiles = globalForMock.__mockStudentProfiles;
export const mockCoachStudentAssignments = globalForMock.__mockCoachStudentAssignments;
export const mockClasses = globalForMock.__mockClasses;
export const mockBookings = globalForMock.__mockBookings;
export const mockAuditLogs = globalForMock.__mockAuditLogs;
export const mockAnnouncements = globalForMock.__mockAnnouncements;
export const mockNotifications = globalForMock.__mockNotifications;
export const mockHomeworkAssignments = globalForMock.__mockHomeworkAssignments;
export const mockHomeworkSubmissions = globalForMock.__mockHomeworkSubmissions;
export const mockClassEnrollments = globalForMock.__mockClassEnrollments;
export const mockClassStudents = globalForMock.__mockClassStudents;
export const mockClassRecordings = globalForMock.__mockClassRecordings;
export const mockHomeworkWorkbooks = globalForMock.__mockHomeworkWorkbooks;
export const mockHomeworkChapters = globalForMock.__mockHomeworkChapters;
export const mockLmsModules = globalForMock.__mockLmsModules;
export const mockLmsCourseEnrollments = globalForMock.__mockLmsCourseEnrollments;
export const mockSystemConfig = globalForMock.__mockSystemConfig;
export const mockClassroomChat = globalForMock.__mockClassroomChat;

// Allowed accounts and passwords in offline mock mode
const mockCredentials: Record<string, { role: 'ADMIN' | 'COACH' | 'STUDENT'; password: string }> = {
  'admin@chesshub.com': { role: 'ADMIN', password: 'Admin123!' },
  'royduguu786@gmail.com': { role: 'ADMIN', password: 'Admin123!' },
  'coach.alex@chesshub.com': { role: 'COACH', password: 'Coach123!' },
  'student@chesshub.com': { role: 'STUDENT', password: 'Student123!' },
  'admin@chesshubacademy.online': { role: 'ADMIN', password: 'AdminPassword123!' },
  'coach@chesshubacademy.online': { role: 'COACH', password: 'CoachPassword123!' },
  'student@chesshubacademy.online': { role: 'STUDENT', password: 'StudentPassword123!' },
};

// Helper to decode a fake session from headers or cookie
function getMockUserFromCookie(cookieString: string | null): any {
  if (!cookieString) return null;
  try {
    const parsed = JSON.parse(cookieString);
    if (Array.isArray(parsed) && parsed[0]) {
      const token = parsed[0];
      const tokenParts = token.split(':');
      const email = tokenParts[0].toLowerCase().trim();
      const role = tokenParts[1] || 'ADMIN';
      
      const matched = mockUsers.find((u: any) => u.email.toLowerCase().trim() === email);
      if (matched) return matched;
      
      let firstName = 'Academy';
      let lastName = 'Admin';
      if (role === 'COACH') {
        firstName = 'Coach';
        lastName = 'Alex';
      } else if (role === 'STUDENT') {
        firstName = 'Rahul';
        lastName = 'Patel';
      }

      return {
        id: role === 'COACH' ? 'usr-coach-456' : role === 'STUDENT' ? 'usr-student-789' : 'usr-admin-roy',
        username: email.split('@')[0],
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: role,
        is_active: true,
        created_at: new Date().toISOString(),
      };
    }
  } catch (e) {}
  return null;
}

// Simple chainable mock query builder supporting in-memory filtering, inserting, updating and deleting
class MockQueryBuilder {
  private tableName: string;
  private isSingleResult: boolean = false;
  private headers: any = {};
  private filters: Array<{ column: string; value: any; operator: string }> = [];
  private updateValues: any = null;
  private isDelete: boolean = false;
  private insertedRecords: any[] = [];
  private isInsertOrUpsert: boolean = false;

  constructor(tableName: string, headers: any) {
    this.tableName = tableName;
    this.headers = headers;
  }

  select() { return this; }
  
  eq(column: string, value: any) {
    this.filters.push({ column, value, operator: 'eq' });
    return this;
  }
  
  gte(column: string, value: any) {
    this.filters.push({ column, value, operator: 'gte' });
    return this;
  }
  
  lte(column: string, value: any) {
    this.filters.push({ column, value, operator: 'lte' });
    return this;
  }
  
  gt(column: string, value: any) {
    this.filters.push({ column, value, operator: 'gt' });
    return this;
  }
  
  lt(column: string, value: any) {
    this.filters.push({ column, value, operator: 'lt' });
    return this;
  }
  
  filter(column: string, operator: string, value: any) {
    this.filters.push({ column, value, operator });
    return this;
  }
  
  is(column: string, value: any) {
    this.filters.push({ column, value, operator: 'is' });
    return this;
  }
  
  in(column: string, values: any[]) {
    this.filters.push({ column, value: values, operator: 'in' });
    return this;
  }
  
  order() { return this; }
  limit() { return this; }
  single() {
    this.isSingleResult = true;
    return this;
  }
  maybeSingle() {
    this.isSingleResult = true;
    return this;
  }

  update(values: any) {
    this.updateValues = values;
    return this;
  }

  upsert(values: any, options?: any) {
    this.isInsertOrUpsert = true;
    const items = Array.isArray(values) ? values : [values];
    let dataset: any[] = [];
    switch (this.tableName) {
      case 'users':
        dataset = mockUsers;
        break;
      case 'student_profiles':
        dataset = mockStudentProfiles;
        break;
      case 'coach_profiles':
        dataset = mockCoachProfiles;
        break;
      case 'coach_student_assignments':
        dataset = mockCoachStudentAssignments;
        break;
      case 'classes':
        dataset = mockClasses;
        break;
      case 'bookings':
        dataset = mockBookings;
        break;
      case 'audit_logs':
        dataset = mockAuditLogs;
        break;
      case 'announcements':
        dataset = mockAnnouncements;
        break;
      case 'notifications':
        dataset = mockNotifications;
        break;
            case 'homework_assignments':
        dataset = mockHomeworkAssignments;
        break;
      case 'homework_submissions':
        dataset = mockHomeworkSubmissions;
        break;
      case 'class_enrollments':
        dataset = mockClassEnrollments;
        break;
      case 'class_students':
        dataset = mockClassStudents;
        break;
      case 'class_recordings':
        dataset = mockClassRecordings;
        break;
      case 'homework_workbooks':
        dataset = mockHomeworkWorkbooks;
        break;
      case 'homework_chapters':
        dataset = mockHomeworkChapters;
        break;
      case 'lms_modules':
        dataset = mockLmsModules;
        break;
      case 'lms_course_enrollments':
        dataset = mockLmsCourseEnrollments;
        break;
      case 'system_config':
        dataset = mockSystemConfig;
        break;
      case 'classroom_chat':
        dataset = mockClassroomChat;
        break;
    }

    items.forEach(item => {
      const onConflict = options?.onConflict || 'id';
      const existingIndex = dataset.findIndex(x => String(x[onConflict]) === String(item[onConflict]));
      const record = {
        updated_at: new Date().toISOString(),
        ...item,
      };
      if (existingIndex !== -1) {
        dataset[existingIndex] = { ...dataset[existingIndex], ...record };
        this.insertedRecords.push(dataset[existingIndex]);
      } else {
        if (!record.id && onConflict !== 'id') {
          record.id = generateUUID();
        }
        if (!record.created_at) {
          record.created_at = new Date().toISOString();
        }
        dataset.push(record);
        this.insertedRecords.push(record);
      }
    });

    return this;
  }

  insert(values: any) {
    this.isInsertOrUpsert = true;
    const items = Array.isArray(values) ? values : [values];
    items.forEach(item => {
      const record = {
        id: item.id || generateUUID(),
        created_at: new Date().toISOString(),
        ...item,
      };
      
      if (this.tableName === 'users') {
        mockUsers.push(record);
      } else if (this.tableName === 'student_profiles') {
        mockStudentProfiles.push(record);
      } else if (this.tableName === 'coach_profiles') {
        mockCoachProfiles.push(record);
      } else if (this.tableName === 'coach_student_assignments') {
        mockCoachStudentAssignments.push(record);
      } else if (this.tableName === 'classes') {
        mockClasses.push(record);
      } else if (this.tableName === 'bookings') {
        mockBookings.push(record);
      } else if (this.tableName === 'announcements') {
        mockAnnouncements.push(record);
      } else if (this.tableName === 'notifications') {
        mockNotifications.push(record);
            } else if (this.tableName === 'homework_assignments') {
        mockHomeworkAssignments.push(record);
      } else if (this.tableName === 'homework_submissions') {
        mockHomeworkSubmissions.push(record);
      } else if (this.tableName === 'class_enrollments') {
        mockClassEnrollments.push(record);
      } else if (this.tableName === 'class_students') {
        mockClassStudents.push(record);
      } else if (this.tableName === 'class_recordings') {
        mockClassRecordings.push(record);
      } else if (this.tableName === 'homework_workbooks') {
        mockHomeworkWorkbooks.push(record);
      } else if (this.tableName === 'homework_chapters') {
        mockHomeworkChapters.push(record);
      } else if (this.tableName === 'lms_modules') {
        mockLmsModules.push(record);
      } else if (this.tableName === 'lms_course_enrollments') {
        mockLmsCourseEnrollments.push(record);
      } else if (this.tableName === 'classroom_chat') {
        mockClassroomChat.push(record);
      }
      
      this.insertedRecords.push(record);
    });
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  async then(resolve: any) {
    let dataset: any[] = [];

    if (this.isInsertOrUpsert) {
      dataset = this.insertedRecords;
    } else {
      switch (this.tableName) {
        case 'users': {
          const cookieHeader = this.headers?.Cookie || this.headers?.cookie || '';
          const match = cookieHeader.match(/(^|;\s*)sb-[a-z]+-auth-token=([^;]*)/);
          const cookieValue = match ? decodeURIComponent(match[2]) : null;
          let currentUser = getMockUserFromCookie(cookieValue);

          if (!currentUser) {
            const authHeader = this.headers?.Authorization || this.headers?.authorization || '';
            if (authHeader.startsWith('Bearer ')) {
              const bearerToken = authHeader.substring(7);
              const tokenParts = bearerToken.split(':');
              const email = tokenParts[0].toLowerCase().trim();
              const role = tokenParts[1] || 'ADMIN';
              
              const matched = mockUsers.find((u: any) => u.email.toLowerCase().trim() === email);
              currentUser = matched || {
                id: role === 'COACH' ? 'usr-coach-456' : role === 'STUDENT' ? 'usr-student-789' : 'usr-admin-roy',
                username: email.split('@')[0],
                email,
                first_name: role === 'COACH' ? 'Coach' : role === 'STUDENT' ? 'Rahul' : 'Roy',
                last_name: role === 'COACH' ? 'Alex' : role === 'STUDENT' ? 'Patel' : 'Duguu',
                role,
                is_active: true,
                created_at: new Date().toISOString(),
                archived_at: null,
              };
            }
          }

          dataset = [...mockUsers];
          if (currentUser && !dataset.some(u => u.id === currentUser.id)) {
            dataset.push(currentUser);
          }
          break;
        }
        case 'student_profiles':
          dataset = mockStudentProfiles;
          break;
        case 'coach_profiles':
          dataset = mockCoachProfiles;
          break;
        case 'coach_student_assignments':
          dataset = mockCoachStudentAssignments;
          break;
        case 'classes':
          dataset = mockClasses;
          break;
        case 'bookings':
          dataset = mockBookings;
          break;
        case 'audit_logs':
          dataset = mockAuditLogs;
          break;
        case 'announcements':
          dataset = mockAnnouncements;
          break;
        case 'notifications':
          dataset = mockNotifications;
          break;
        case 'homework_assignments':
          dataset = mockHomeworkAssignments;
          break;
        case 'homework_submissions':
          dataset = mockHomeworkSubmissions;
          break;
        case 'class_enrollments':
          dataset = mockClassEnrollments;
          break;
        case 'class_students':
          dataset = mockClassStudents;
          break;
        case 'class_recordings':
          dataset = mockClassRecordings;
          break;
        case 'homework_workbooks':
          dataset = mockHomeworkWorkbooks;
          break;
        case 'homework_chapters':
          dataset = mockHomeworkChapters;
          break;
        case 'lms_modules':
          dataset = mockLmsModules;
          break;
        case 'lms_course_enrollments':
          dataset = mockLmsCourseEnrollments;
          break;
        case 'system_config':
          dataset = mockSystemConfig;
          break;
        case 'classroom_chat':
          dataset = mockClassroomChat;
          break;
        default:
          dataset = [];
      }
    }

    // Apply updates if requested
    if (this.updateValues) {
      dataset.forEach(item => {
        let matches = true;
        for (const f of this.filters) {
          const itemValue = item[f.column];
          if (f.operator === 'eq' && String(itemValue) !== String(f.value)) {
            matches = false;
            break;
          }
        }
        if (matches) {
          Object.assign(item, this.updateValues, { updated_at: new Date().toISOString() });
        }
      });
    }

    // Apply deletes if requested
    if (this.isDelete) {
      for (let i = dataset.length - 1; i >= 0; i--) {
        const item = dataset[i];
        let matches = true;
        for (const f of this.filters) {
          const itemValue = item[f.column];
          if (f.operator === 'eq' && String(itemValue) !== String(f.value)) {
            matches = false;
            break;
          }
        }
        if (matches) {
          dataset.splice(i, 1);
        }
      }
    }

    // Filter dataset
    let filteredData = [...dataset];
    for (const f of this.filters) {
      filteredData = filteredData.filter(item => {
        const itemValue = item[f.column];
        if (f.operator === 'eq') {
          return String(itemValue) === String(f.value);
        }
        if (f.operator === 'is') {
          const itemVal = itemValue === undefined ? null : itemValue;
          const filterVal = f.value === undefined ? null : f.value;
          return itemVal === filterVal;
        }
        if (f.operator === 'in') {
          return Array.isArray(f.value) && f.value.map(String).includes(String(itemValue));
        }
        if (f.operator === 'gte') return itemValue >= f.value;
        if (f.operator === 'lte') return itemValue <= f.value;
        if (f.operator === 'gt') return itemValue > f.value;
        if (f.operator === 'lt') return itemValue < f.value;
        return true;
      });
    }

    let data: any = filteredData;
    if (this.isSingleResult) {
      data = filteredData[0] || null;
    }

    resolve({
      data,
      error: null,
      count: Array.isArray(data) ? data.length : (data ? 1 : 0),
    });
  }
}

class MockRealtimeChannel {
  name: string;
  config: any;
  listeners: Array<{ type: string; event: string; callback: Function }> = [];
  trackedUsers: any[] = [];

  constructor(name: string, config: any) {
    this.name = name;
    this.config = config;
    if (typeof window !== 'undefined') {
      const globalForMock = globalThis as any;
      if (!globalForMock.__mockChannels) {
        globalForMock.__mockChannels = [];
      }
      globalForMock.__mockChannels.push(this);
    }
  }

  on(type: string, filter: any, callback: Function) {
    const event = filter?.event || '*';
    this.listeners.push({ type, event, callback });
    return this;
  }

  subscribe(callback?: Function) {
    if (callback) {
      setTimeout(() => {
        callback('SUBSCRIBED');
      }, 0);
    }
    return this;
  }

  async send(payload: any) {
    const eventName = payload.event;
    const globalForMock = globalThis as any;
    const channels = globalForMock.__mockChannels || [];
    setTimeout(() => {
      channels.forEach((chan: MockRealtimeChannel) => {
        if (chan.name === this.name) {
          chan.listeners.forEach(l => {
            if (l.type === 'broadcast' && (l.event === '*' || l.event === eventName)) {
              l.callback({ payload: payload.payload });
            }
          });
        }
      });
    }, 50);
    return 'ok';
  }

  async track(payload: any) {
    this.trackedUsers = [payload];
    const globalForMock = globalThis as any;
    const channels = globalForMock.__mockChannels || [];
    setTimeout(() => {
      channels.forEach((chan: MockRealtimeChannel) => {
        if (chan.name === this.name) {
          chan.listeners.forEach(l => {
            if (l.type === 'presence' && l.event === 'sync') {
              l.callback();
            }
          });
        }
      });
    }, 50);
    return 'ok';
  }

  async untrack() {
    this.trackedUsers = [];
    return 'ok';
  }

  presenceState() {
    const globalForMock = globalThis as any;
    const channels = globalForMock.__mockChannels || [];
    const state: Record<string, any[]> = {};
    channels.forEach((chan: MockRealtimeChannel) => {
      if (chan.name === this.name) {
        chan.trackedUsers.forEach(u => {
          state[u.userId] = [u];
        });
      }
    });
    return state;
  }

  unsubscribe() {
    if (typeof window !== 'undefined') {
      const globalForMock = globalThis as any;
      if (globalForMock.__mockChannels) {
        globalForMock.__mockChannels = globalForMock.__mockChannels.filter((c: any) => c !== this);
      }
    }
    return Promise.resolve();
  }
}

export function getMockSupabaseClient(options?: any) {
  const headers = options?.global?.headers || {};
  
  return {
    channel(name: string, config?: any) {
      return new MockRealtimeChannel(name, config);
    },
    async removeChannel(channel: any) {
      if (channel && typeof channel.unsubscribe === 'function') {
        await channel.unsubscribe();
      }
      return Promise.resolve({ error: null });
    },
    async removeAllChannels() {
      return Promise.resolve({ error: null });
    },
    auth: {
      async signInWithPassword({ email, password }: any) {
        const emailLower = email.toLowerCase().trim();

        // 1. Check if the user is in mockUsers (meaning they were created dynamically or seeded)
        const matched = mockUsers.find((u: any) => u.email.toLowerCase().trim() === emailLower);

        if (matched && matched.password) {
          if (matched.password === password) {
            const session = {
              access_token: `${emailLower}:${matched.role}`,
              refresh_token: 'mock-refresh-token',
              expires_in: 3600,
            };
            return {
              data: { user: matched, session },
              error: null,
            };
          } else {
            return {
              data: { user: null, session: null },
              error: { message: 'Invalid email or password. Please try again.' },
            };
          }
        }

        // 2. Fall back to standard credentials for seed users
        const validCreds = mockCredentials[emailLower];

        if (!validCreds || validCreds.password !== password) {
          return {
            data: { user: null, session: null },
            error: { message: 'Invalid email or password. Please try again.' },
          };
        }

        const role = validCreds.role;
        const user = matched || {
          id: role === 'COACH' ? 'usr-coach-456' : role === 'STUDENT' ? 'usr-student-789' : 'usr-admin-roy',
          username: emailLower.split('@')[0],
          email: emailLower,
          first_name: role === 'COACH' ? 'Coach' : role === 'STUDENT' ? 'Rahul' : 'Roy',
          last_name: role === 'COACH' ? 'Alex' : role === 'STUDENT' ? 'Patel' : 'Duguu',
          role: role,
          is_active: true,
          created_at: new Date().toISOString(),
          archived_at: null,
        };

        // Ensure newly created auth user is present in mockUsers list
        if (!matched) {
          mockUsers.push(user);
          // Create profiles for default logins if missing
          if (role === 'COACH') {
            const hasProfile = mockCoachProfiles.some((p: any) => p.user_id === user.id);
            if (!hasProfile) {
              mockCoachProfiles.push({
                id: 'prof-coach-456',
                user_id: user.id,
                title: 'Grandmaster',
                photo_url: '',
                whatsapp: '+919999999999',
                languages: ['English'],
                experience_years: 10,
                bio: 'Professional chess coach.',
                created_at: new Date().toISOString(),
              });
            }
          } else if (role === 'STUDENT') {
            const hasProfile = mockStudentProfiles.some((p: any) => p.user_id === user.id);
            if (!hasProfile) {
              mockStudentProfiles.push({
                id: 'prof-student-789',
                user_id: user.id,
                age: 12,
                level: 'BEGINNER',
                parent_name: 'Carol Patel',
                parent_whatsapp: '+19998887777',
                joined_date: new Date().toISOString(),
                notes: 'Chess training focus.',
                created_at: new Date().toISOString(),
              });
            }
          }
        }

        const session = {
          access_token: `${emailLower}:${role}`,
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
        };

        return {
          data: { user, session },
          error: null,
        };
      },

      async signOut() {
        return { error: null };
      },

      async getUser(token?: string) {
        const cookieHeader = headers.Cookie || headers.cookie || '';
        const match = cookieHeader.match(/(^|;\s*)sb-[a-z]+-auth-token=([^;]*)/);
        const cookieValue = match ? decodeURIComponent(match[2]) : null;

        const user = getMockUserFromCookie(cookieValue);
        if (user) {
          return { data: { user }, error: null };
        }

        const authHeader = headers.Authorization || headers.authorization || '';
        if (authHeader.startsWith('Bearer ')) {
          const bearerToken = authHeader.substring(7);
          const tokenParts = bearerToken.split(':');
          const email = tokenParts[0].toLowerCase().trim();
          const role = tokenParts[1] || 'ADMIN';
          
          const matched = mockUsers.find((u: any) => u.email.toLowerCase().trim() === email);
          if (matched) return { data: { user: matched }, error: null };
          
          let firstName = 'Academy';
          let lastName = 'Admin';
          if (role === 'COACH') {
            firstName = 'Coach';
            lastName = 'Alex';
          } else if (role === 'STUDENT') {
            firstName = 'Rahul';
            lastName = 'Patel';
          }

          const newUser = {
            id: role === 'COACH' ? 'usr-coach-456' : role === 'STUDENT' ? 'usr-student-789' : 'usr-admin-roy',
            username: email.split('@')[0],
            email,
            first_name: firstName,
            last_name: lastName,
            role,
            is_active: true,
            created_at: new Date().toISOString(),
            archived_at: null,
          };
          mockUsers.push(newUser);

          return {
            data: { user: newUser },
            error: null,
          };
        }

        return { data: { user: null }, error: { message: 'No session active' } };
      },

      async setSession({ access_token, refresh_token }: any) {
        return {
          data: {
            session: {
              access_token,
              refresh_token,
              expires_in: 3600,
            },
            user: getMockUserFromCookie(JSON.stringify([access_token, refresh_token])),
          },
          error: null,
        };
      },

      admin: {
        async listUsers() {
          return {
            data: { users: mockUsers },
            error: null,
          };
        },
        async createUser({ email, password, user_metadata, app_metadata }: any) {
          const role = app_metadata?.role || 'STUDENT';
          const emailLower = email.toLowerCase().trim();
          const newUser = {
            id: 'usr-' + Math.random().toString(36).substr(2, 9),
            username: user_metadata?.username || emailLower.split('@')[0],
            email: emailLower,
            password: password,
            first_name: user_metadata?.first_name || 'Mock',
            last_name: user_metadata?.last_name || 'User',
            role,
            is_active: true,
            created_at: new Date().toISOString(),
            archived_at: null,
          };
          mockUsers.push(newUser);
          mockCredentials[emailLower] = { role, password };

          // Simulating database triggers for profiles
          if (role === 'COACH') {
            const newCoachProfile = {
              id: 'prof-' + Math.random().toString(36).substr(2, 9),
              user_id: newUser.id,
              title: user_metadata?.title || 'FIDE Coach',
              photo_url: user_metadata?.photo_url || '',
              whatsapp: user_metadata?.whatsapp || '',
              languages: user_metadata?.languages || ['English'],
              experience_years: Number(user_metadata?.experience_years) || 5,
              bio: user_metadata?.bio || 'Professional chess coach.',
              created_at: new Date().toISOString(),
            };
            mockCoachProfiles.push(newCoachProfile);
          } else if (role === 'STUDENT') {
            const newStudentProfile = {
              id: 'prof-' + Math.random().toString(36).substr(2, 9),
              user_id: newUser.id,
              age: Number(user_metadata?.age) || 10,
              level: user_metadata?.level || 'BEGINNER',
              parent_name: user_metadata?.parent_name || 'Parent Name',
              parent_whatsapp: user_metadata?.parent_whatsapp || '',
              joined_date: new Date().toISOString(),
              notes: user_metadata?.notes || '',
              created_at: new Date().toISOString(),
            };
            mockStudentProfiles.push(newStudentProfile);
          }

          return { data: { user: newUser }, error: null };
        },
        async deleteUser(userId: string) {
          const index = mockUsers.findIndex((u: any) => u.id === userId);
          if (index !== -1) {
            mockUsers.splice(index, 1);
          }
          return { error: null };
        },
        async updateUserById(userId: string, attributes: any) {
          const matched = mockUsers.find((u: any) => u.id === userId);
          if (!matched) {
            return { data: { user: null }, error: { message: 'User not found' } };
          }
          
          if (attributes.password) {
            matched.password = attributes.password;
          }
          if (attributes.email) {
            matched.email = attributes.email.toLowerCase().trim();
          }
          if (attributes.user_metadata) {
            matched.first_name = attributes.user_metadata.first_name || matched.first_name;
            matched.last_name = attributes.user_metadata.last_name || matched.last_name;
            matched.user_metadata = { ...matched.user_metadata, ...attributes.user_metadata };
          }
          if (attributes.app_metadata) {
            matched.role = attributes.app_metadata.role || matched.role;
          }
          
          return { data: { user: matched }, error: null };
        },
      },
    },

    storage: {
      from(bucketName: string) {
        return {
          async upload(filePath: string, _fileBody: any, _options?: any) {
            return { data: { path: filePath }, error: null };
          },
          getPublicUrl(filePath: string) {
            return { data: { publicUrl: `/mock-storage/${bucketName}/${filePath}` } };
          },
          async remove(filePaths: string[]) {
            return { data: filePaths.map((p) => ({ name: p })), error: null };
          },
          async createSignedUrl(filePath: string, _expiresIn?: number) {
            return { data: { signedUrl: `/mock-storage/${bucketName}/${filePath}` }, error: null };
          },
        };
      },
    },

    from(tableName: string) {
      return new MockQueryBuilder(tableName, headers);
    },
  } as any;
}
