import { z } from "zod";


const profileItemSchema = z.object({
  value: z.string(),
  confidence: z.number().min(0).max(1).optional(),
});

export const userProfileSchema = z.object({
  name: z.string().optional(),
  language: z.string().optional(),
  location: z.string().optional(),
  timezone: z.string().optional(),
  interests: z.array(profileItemSchema).optional(),
  preferences: z.object({
    communicationStyle: z.string().optional(),
    channel: z.string().optional(),
  }).optional(),
  goals: z.array(profileItemSchema).optional(),
  lastInteraction: z.string().optional(), // ISO string
  email: z.string().email().optional(),
  phone: z.string().optional(),
  painPoints: z.array(profileItemSchema).optional(),
});
