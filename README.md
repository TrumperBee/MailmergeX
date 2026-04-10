# MailMergeX

A modern bulk email marketing application with **unlimited free PostgreSQL** using Neon.

## Features

- **User Authentication** - Sign up, login, logout with NextAuth.js
- **Campaign Management** - Create, edit, delete email campaigns
- **CSV Import** - Upload contacts with automatic column detection
- **Email Templates** - Create personalized templates with placeholders
- **Mail Merge Engine** - Replace placeholders like `{{name}}` with contact data
- **Bulk Email Sending** - Send personalized emails via SMTP
- **Email Tracking** - Track sent, failed, and opened emails
- **SMTP Configuration** - Connect Gmail, Outlook, or any SMTP provider
- **Dark Mode UI** - Clean, modern dark theme interface

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: **Neon** (PostgreSQL - unlimited free projects!)
- **Authentication**: NextAuth.js
- **ORM**: Drizzle ORM
- **Email Sending**: Nodemailer

## Why Neon?

| Provider | Free Projects | Expiration | Best For |
|----------|-------------|------------|----------|
| **Neon** | 100 | None | This app! |
| Supabase | 2 | None | Limited |
| Render | Unlimited | 30 days | Temporary |
| Railway | Unlimited | Monthly credit | Temporary |

## Getting Started

### 1. Create Neon Database (Free)

1. Go to [neon.tech](https://neon.tech) and sign up (free)
2. Click **New Project** → **Empty project**
3. Copy your connection string (looks like `postgresql://user:pass@host/db?sslmode=require`)

### 2. Setup Project

```bash
git clone <repository-url>
cd mailmergex
npm install
```

### 3. Configure Environment

Create `.env.local` in the root directory:

```env
# Neon PostgreSQL
DATABASE_URL=postgresql://username:password@ep-xxx-123456.us-east-2.aws.neon.tech/neondb?sslmode=require

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Encryption (generate with: openssl rand -base64 32)
ENCRYPTION_KEY=your-32-character-encryption-key
```

### 4. Push Database Schema

```bash
npm run db:push
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage Guide

### Setting Up SMTP

1. Go to **Settings** in the sidebar
2. Enter your SMTP credentials:
   - **Gmail**: `smtp.gmail.com` with port `587`
   - **Outlook**: `smtp-mail.outlook.com` with port `587`
3. For Gmail, generate an **App Password** (Google Account → Security → 2-Step Verification → App Passwords)
4. Click **Test Connection** → **Save Settings**

### Creating a Campaign

1. Click **New Campaign**
2. Enter campaign name
3. Upload CSV with contacts
4. Map email/name columns
5. Create template with placeholders:
   - `{{name}}` - Contact's name
   - `{{email}}` - Contact's email
   - `{{company}}` - Custom field
6. Review → Create

### CSV Format

```csv
name,email,company
John Doe,john@example.com,Acme Inc
Jane Smith,jane@example.com,Tech Corp
```

## Database Schema

```
users ─────────────┐
    │              │
smtp_settings      │ (user_id)
    │              │
    └──────────────┤
                   │
campaigns ──── contacts ──── emails ──── email_logs
(campaign_id)  (contact_id)   (email_id)
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy!

### Other Platforms

Set these environment variables:
- `DATABASE_URL` - Neon connection string
- `NEXTAUTH_URL` - Your deployment URL
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `ENCRYPTION_KEY` - For encrypting SMTP passwords

## Troubleshooting

### "Connection refused" errors
- Check your Neon connection string is correct
- Ensure `?sslmode=require` is at the end

### Auth not working
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your deployment URL

### Gmail authentication failed
- Enable 2-Step Verification on Google account
- Generate App Password (not your regular password)

## License

MIT License
