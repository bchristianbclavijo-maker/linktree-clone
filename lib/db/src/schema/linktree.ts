import { pgTable, text, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const linktreeTable = pgTable("linktree", {
  id: integer("id").primaryKey().default(1),
  profile: jsonb("profile").notNull().$type<{
    photo: string;
    name: string;
    description: string;
  }>(),
  links: jsonb("links").notNull().$type<
    Array<{
      id: string;
      label: string;
      url: string;
      emoji: string;
      order: number;
    }>
  >(),
  design: jsonb("design").notNull().$type<{
    bgColor: string;
    glowColor: string;
    glowOpacity: number;
    accentColor: string;
    textColor: string;
  }>(),
  clicks: jsonb("clicks").notNull().$type<Record<string, number>>(),
});

export const insertLinktreeSchema = createInsertSchema(linktreeTable);
export type InsertLinktree = z.infer<typeof insertLinktreeSchema>;
export type Linktree = typeof linktreeTable.$inferSelect;
