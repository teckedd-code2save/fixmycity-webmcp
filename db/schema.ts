import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(), email: text('email').notNull().unique(), name: text('name').notNull(),
  role: text('role', { enum: ['resident', 'operator', 'inspector'] }).notNull().default('resident'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(), title: text('title').notNull(), description: text('description').notNull(),
  category: text('category', { enum: ['flooding', 'drainage', 'road', 'lighting', 'waste'] }).notNull(),
  severity: text('severity', { enum: ['low', 'medium', 'high', 'critical'] }).notNull(),
  status: text('status', { enum: ['reported', 'triaged', 'assigned', 'inspecting', 'resolved', 'reopened'] }).notNull().default('reported'),
  address: text('address').notNull(), landmark: text('landmark'), latitude: real('latitude').notNull(), longitude: real('longitude').notNull(),
  affectedPeople: integer('affected_people').notNull().default(1), confirmations: integer('confirmations').notNull().default(1),
  reporterId: text('reporter_id').notNull().references(() => profiles.id), duplicateOf: text('duplicate_of'), imageKey: text('image_key'),
  priorityScore: integer('priority_score').notNull().default(0), createdAt: integer('created_at', { mode: 'timestamp' }).notNull(), updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => [index('idx_reports_status_category').on(table.status, table.category), index('idx_reports_priority').on(table.priorityScore), index('idx_reports_location').on(table.latitude, table.longitude)]);
export const inspectors = sqliteTable('inspectors', {
  id: text('id').primaryKey(), profileId: text('profile_id').notNull().references(() => profiles.id), phone: text('phone'),
  transport: text('transport', { enum: ['car', 'motorbike', 'foot'] }).notNull().default('car'), availability: text('availability', { enum: ['available', 'assigned', 'off_duty'] }).notNull().default('available'),
  startLatitude: real('start_latitude').notNull(), startLongitude: real('start_longitude').notNull(),
});
export const assignments = sqliteTable('assignments', {
  id: text('id').primaryKey(), inspectorId: text('inspector_id').notNull().references(() => inspectors.id), reportId: text('report_id').notNull().references(() => reports.id),
  stopOrder: integer('stop_order').notNull(), routeId: text('route_id').notNull(), status: text('status', { enum: ['proposed', 'accepted', 'in_progress', 'complete', 'blocked'] }).notNull().default('proposed'),
  assignedAt: integer('assigned_at', { mode: 'timestamp' }).notNull(),
}, (table) => [index('idx_assignments_inspector_status').on(table.inspectorId, table.status)]);
export const updates = sqliteTable('updates', {
  id: text('id').primaryKey(), reportId: text('report_id').notNull().references(() => reports.id), actorId: text('actor_id').notNull().references(() => profiles.id), action: text('action').notNull(), note: text('note'), imageKey: text('image_key'), createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [index('idx_updates_report_created').on(table.reportId, table.createdAt)]);
export const proposals = sqliteTable('proposals', {
  id: text('id').primaryKey(), kind: text('kind', { enum: ['duplicate_merge', 'priority', 'route'] }).notNull(), payload: text('payload', { mode: 'json' }).notNull(), confidence: integer('confidence').notNull(), explanation: text('explanation').notNull(), status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'), createdBy: text('created_by').notNull(), createdAt: integer('created_at', { mode: 'timestamp' }).notNull(), reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
});
