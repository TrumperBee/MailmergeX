import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  fullName: text('full_name'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const smtpSettings = pgTable('smtp_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  host: text('host').notNull(),
  port: integer('port').default(587),
  secure: boolean('secure').default(false),
  username: text('username').notNull(),
  encryptedPassword: text('encrypted_password').notNull(),
  fromName: text('from_name'),
  fromEmail: text('from_email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  subject: text('subject'),
  template: text('template'),
  status: varchar('status', { length: 50 }).default('draft'),
  attachments: jsonb('attachments').$type<Array<{ name: string; size: number; path: string; type: string }>>().default([]),
  totalEmails: integer('total_emails').default(0),
  sentEmails: integer('sent_emails').default(0),
  failedEmails: integer('failed_emails').default(0),
  scheduledAt: timestamp('scheduled_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  name: text('name'),
  customFields: jsonb('custom_fields').$type<Record<string, string>>().default({}),
  createdAt: timestamp('created_at').defaultNow(),
})

export const emails = pgTable('emails', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  recipientEmail: text('recipient_email').notNull(),
  subject: text('subject'),
  body: text('body'),
  status: varchar('status', { length: 50 }).default('pending'),
  sentAt: timestamp('sent_at'),
  openedAt: timestamp('opened_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const emailLogs = pgTable('email_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  emailId: uuid('email_id').notNull().references(() => emails.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  message: text('message'),
  createdAt: timestamp('created_at').defaultNow(),
})
