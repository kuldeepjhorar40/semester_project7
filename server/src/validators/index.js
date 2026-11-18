const { z } = require('zod');
const { CATEGORIES, STATUSES, PRIORITIES } = require('../constants');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const blankToUndefined = (schema) => z.preprocess((v) => (v === '' ? undefined : v), schema);

const register = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(120),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
  studentId: blankToUndefined(z.string().trim().max(30).optional()),
  department: blankToUndefined(z.string().trim().max(80).optional()),
  phone: blankToUndefined(
    z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/, 'Enter a valid phone number').optional()
  ),
});

const login = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required').max(72),
});

const chatMessage = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message is too long (max 2000 characters)'),
});

const createComplaint = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().trim().min(20, 'Please describe the issue in at least 20 characters').max(3000),
  category: z.enum(CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
});

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
};

const studentComplaintQuery = z.object({
  status: blankToUndefined(z.enum(STATUSES).optional()),
  category: blankToUndefined(z.enum(CATEGORIES).optional()),
  q: blankToUndefined(z.string().trim().max(100).optional()),
  ...pagination,
});

const adminComplaintQuery = z.object({
  status: blankToUndefined(z.enum(STATUSES).optional()),
  category: blankToUndefined(z.enum(CATEGORIES).optional()),
  priority: blankToUndefined(z.enum(PRIORITIES).optional()),
  assignedTo: blankToUndefined(z.union([objectId, z.literal('unassigned')]).optional()),
  q: blankToUndefined(z.string().trim().max(100).optional()),
  ...pagination,
});

const updateComplaint = z
  .object({
    status: z.enum(STATUSES).optional(),
    priority: z.enum(PRIORITIES).optional(),
    category: z.enum(CATEGORIES).optional(),
    assignedTo: objectId.nullable().optional(),
    remark: z.string().trim().max(1000).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'Provide at least one field to update' });

const idParam = z.object({ id: z.string().min(1).max(40) });
const objectIdParam = z.object({ id: objectId });

module.exports = {
  register,
  login,
  chatMessage,
  createComplaint,
  studentComplaintQuery,
  adminComplaintQuery,
  updateComplaint,
  idParam,
  objectIdParam,
};
