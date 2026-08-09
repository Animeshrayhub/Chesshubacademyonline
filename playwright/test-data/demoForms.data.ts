export interface DemoFormData {
  parentName: string;
  studentName: string;
  email: string;
  mobile: string;
  grade: string;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
}

export const VALID_DEMO_DATA: DemoFormData = {
  parentName: 'Sarah Connor',
  studentName: 'John Connor',
  email: 'sarah.connor@example.com',
  mobile: '9876543210',
  grade: 'Grade 5',
  preferredDate: '2026-08-15',
  preferredTime: '16:00',
  notes: 'Interested in advanced tactic puzzles and tournament prep.',
};

export const INVALID_EMAIL_DEMO_DATA: DemoFormData = {
  ...VALID_DEMO_DATA,
  email: 'invalid-email-address',
};

export const INVALID_PHONE_DEMO_DATA: DemoFormData = {
  ...VALID_DEMO_DATA,
  mobile: '123',
};

export const EMPTY_FIELDS_DEMO_DATA: DemoFormData = {
  parentName: '',
  studentName: '',
  email: '',
  mobile: '',
  grade: '',
};
