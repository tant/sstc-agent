import { z } from "zod";

export const userProfileSchema = z.object({
  name: z.string().optional(),
  language: z.string().optional(),
  location: z.string().optional(),
  timezone: z.string().optional(),
  interests: z.array(z.string()).optional(),
  preferences: z.object({
    communicationStyle: z.string().optional(),
    channel: z.string().optional(),
  }).optional(),
  currentGoal: z.string().optional(),
  lastInteraction: z.string().optional(), // ISO string
  email: z.string().email().optional(),
  phone: z.string().optional(),
  painPoints: z.array(z.string()).optional(),
});
