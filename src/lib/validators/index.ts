import { z } from 'zod';

export const EmailSchema = z
  .string({ message: 'Email is required' })
  .trim()
  .email('Invalid email address')
  .max(254, 'Email must be at most 254 characters');

export const PasswordSchema = z
  .string({ message: 'Password is required' })
  .min(6, 'Password must be at least 6 characters')
  .max(72, 'Password must be at most 72 characters');

export const RoleSchema = z.enum(['ADMIN', 'COACH', 'STUDENT'], {
  message: 'Role must be ADMIN, COACH, or STUDENT',
});

export const CreateCoachSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  username: z.string().min(3, 'Username must be at least 3 characters').max(150).optional(),
  firstName: z.string().min(1, 'First name is required').max(150),
  lastName: z.string().min(1, 'Last name is required').max(150),
  title: z.string().min(1, 'Title is required').max(100),
  photoUrl: z.string().url('Invalid photo URL').max(512).optional().nullable(),
  whatsapp: z.string().min(1, 'WhatsApp number is required').max(30),
  languages: z.array(z.string()).min(1, 'At least one language is required'),
  experienceYears: z.number().int().min(0, 'Experience years must be a positive integer'),
  bio: z.string().min(1, 'Biography is required'),
  // Extended fields
  fideId: z.string().optional().nullable(),
  fideRating: z.number().int().optional().nullable(),
  country: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  specializations: z.array(z.string()).optional().nullable(),
});

export const CreateStudentSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  username: z.string().min(3, 'Username must be at least 3 characters').max(150).optional(),
  firstName: z.string().min(1, 'First name is required').max(150),
  lastName: z.string().min(1, 'Last name is required').max(150),
  age: z.number().int().min(0, 'Age must be a positive integer'),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], {
    message: 'Level must be BEGINNER, INTERMEDIATE, or ADVANCED',
  }),
  parentName: z.string().min(1, 'Parent name is required').max(255),
  parentWhatsapp: z.string().min(1, 'Parent WhatsApp number is required').max(30),
  notes: z.string().optional().nullable(),
  // Extended fields
  fideRating: z.number().int().optional().nullable(),
  country: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  lichessUsername: z.string().optional().nullable(),
  assignedCoachId: z.string().optional().nullable(),
});

export const UpdateCoachProfileSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  photoUrl: z.string().url('Invalid photo URL').max(512).optional().nullable(),
  whatsapp: z.string().min(1).max(30).optional(),
  languages: z.array(z.string()).optional(),
  experienceYears: z.number().int().min(0).optional(),
  bio: z.string().optional(),
  // Extended fields
  fideId: z.string().optional().nullable(),
  fideRating: z.number().int().optional().nullable(),
  country: z.string().optional().nullable(),
});

export const UpdateStudentProfileSchema = z.object({
  age: z.number().int().min(0).optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  parentName: z.string().min(1).max(255).optional(),
  parentWhatsapp: z.string().min(1).max(30).optional(),
  notes: z.string().optional().nullable(),
  // Extended fields
  fideRating: z.number().int().optional().nullable(),
  country: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
});

export const CreateAdminSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  username: z.string().min(3, 'Username must be at least 3 characters').max(150).optional(),
  firstName: z.string().min(1, 'First name is required').max(150),
  lastName: z.string().min(1, 'Last name is required').max(150),
});

export const UpdateUserProfileSchema = z.object({
  username: z.string().min(3).max(150).optional(),
  firstName: z.string().min(1).max(150).optional(),
  lastName: z.string().min(1).max(150).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['ADMIN', 'COACH', 'STUDENT']).optional(),
  phone: z.string().max(30).optional(),
  languages: z.array(z.string()).optional(),
  timezone: z.string().max(100).optional(),
  avatarUrl: z.string().url('Invalid avatar URL').max(512).optional().nullable(),
});

export type CreateCoachInput = z.infer<typeof CreateCoachSchema>;
export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
export type CreateAdminInput = z.infer<typeof CreateAdminSchema>;
export type UpdateCoachProfileInput = z.infer<typeof UpdateCoachProfileSchema>;
export type UpdateStudentProfileInput = z.infer<typeof UpdateStudentProfileSchema>;
export type UpdateUserProfileInput = z.infer<typeof UpdateUserProfileSchema>;
