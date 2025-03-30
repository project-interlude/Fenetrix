import { pgTable, text, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the base schema for a kick preset
export const kickPresetSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.enum(["gated", "euphoric", "zaag", "reverse"]),
  key: z.string(),
  parameters: z.object({
    // Punch Layer
    click: z.object({
      enabled: z.boolean(),
      amount: z.number(),
      tone: z.number()
    }),
    pitch: z.object({
      start: z.number(),
      time: z.number()
    }),
    adsr: z.object({
      attack: z.number(),
      decay: z.number(),
      sustain: z.number(),
      release: z.number()
    }),
    sub: z.object({
      enabled: z.boolean(),
      amount: z.number()
    }),
    // Crunch Layer
    distortion: z.object({
      type: z.enum(["gated", "euphoric", "zaag", "reverse"]),
      amount: z.number(),
      drive: z.number()
    }),
    // EQ & Effects
    eq: z.object({
      low: z.number(),
      mid: z.number(),
      high: z.number()
    }),
    effects: z.object({
      saturation: z.number(),
      reverb: z.number(),
      bitcrush: z.number()
    })
  })
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Presets table to store kick presets
export const kickPresets = pgTable("kick_presets", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  data: jsonb("data").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPresetSchema = createInsertSchema(kickPresets).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type KickPreset = z.infer<typeof kickPresetSchema>;
export type InsertPreset = z.infer<typeof insertPresetSchema>;
export type Preset = typeof kickPresets.$inferSelect;
