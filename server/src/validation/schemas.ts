import { z } from 'zod';

export const ListingCategories = ['general','medication','equipment','supplies','other'] as const;
export const ListingCategorySchema = z.enum(ListingCategories);

export const RegisterSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  name: z
    .string()
    .min(1, { message: 'Name is required' })
    .max(120, { message: 'Name is too long' })
    .optional()
    .or(z.literal('').transform(() => undefined)),
  org_name: z.string().min(2).max(200).optional().or(z.literal('').transform(() => undefined)),
  org_type: z.string().min(2).max(100).optional().or(z.literal('').transform(() => undefined)),
  org_license_id: z.string().min(2).max(100).optional().or(z.literal('').transform(() => undefined)),
  org_phone: z.string().min(7).max(40).optional().or(z.literal('').transform(() => undefined)),
  org_address: z.string().min(5).max(300).optional().or(z.literal('').transform(() => undefined)),
  doc_url: z.string().url({ message: 'Document link must be a valid URL' }).optional().or(z.literal('').transform(() => undefined)),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const ListingCreateSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(500).optional().or(z.literal('').transform(() => undefined)),
  quantity: z.number().int().min(1).optional(),
  category: ListingCategorySchema.optional(),
  is_urgent: z.boolean().optional(),
  // support either top-level lat/lon or nested location
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  location: z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }).optional(),
}).refine((v) => (v.lat !== undefined && v.lon !== undefined) || v.location !== undefined, {
  message: 'Either {lat, lon} or {location:{lat,lon}} required',
  path: ['location']
});

export const ListingUpdateSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(500).optional().or(z.literal('').transform(() => undefined)),
  quantity: z.number().int().min(1).optional(),
  category: ListingCategorySchema.optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ListingCreateInput = z.infer<typeof ListingCreateSchema>;
export type ListingUpdateInput = z.infer<typeof ListingUpdateSchema>;

export const UserUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional().or(z.literal('').transform(() => undefined)),
  password: z.string().min(6).optional(),
  org_name: z.string().min(2).max(200).optional().or(z.literal('').transform(() => undefined)),
  org_type: z.string().min(2).max(100).optional().or(z.literal('').transform(() => undefined)),
  org_address: z.string().min(5).max(300).optional().or(z.literal('').transform(() => undefined)),
});
export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;

export const RatingCreateSchema = z.object({
  to_user_id: z.number().int().positive(),
  listing_id: z.number().int().positive().optional(),
  rating: z.number().int().min(1).max(5),
  review_text: z.string().max(1000).optional().or(z.literal('').transform(() => undefined)),
});
export type RatingCreateInput = z.infer<typeof RatingCreateSchema>;
