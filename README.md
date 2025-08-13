<p align="center">
  <img src="https://i.postimg.cc/c4bKKGgh/Chat-GPT-Image-Aug-13-2025-05-43-02-AM.png" alt="File Uploader Banner" width="900" />
</p>

<div align="center">

# File Uploader (Node.js + Prisma + Supabase)

A minimal Drive-like app built for learning Node.js and Prisma as part of The
Odin Project.

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4-black?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Local-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Passport](https://img.shields.io/badge/Passport-Local-34E27A?logo=passport&logoColor=white)](http://www.passportjs.org/)
[![Multer](https://img.shields.io/badge/Multer-Uploads-4B8BBE)](https://github.com/expressjs/multer)
[![EJS](https://img.shields.io/badge/EJS-Templates-8BC34A)](https://ejs.co/)

</div>

---

## Table of Contents

- [About](#about)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Routes](#routes)
- [Supabase setup](#supabase-setup)
- [Notes](#notes)

---

## About

This project is a stripped-down version of a personal storage service: users can
register/login, upload files, organize them into folders, view and download
their files, and delete files/folders. It follows The Odin Project’s File
Uploader assignment for Node.js and Prisma.

- Assignment:
  [The Odin Project — NodeJS: Project File Uploader](https://www.theodinproject.com/lessons/nodejs-file-uploader)
- Database: PostgreSQL (local via Prisma) — stores users, folders, and file
  metadata (path/public URL)
- Storage: Supabase Storage (public bucket) — stores actual file blobs

## Requirements

- Node.js and npm
- PostgreSQL (local) for Prisma
- Supabase project for Storage (public bucket named `files`)

## Quick start

```bash
# 1) Install dependencies
npm install

# 2) Create and populate .env (see below)
#    Then generate client and run migrations
npm run prisma:generate
npm run prisma:migrate

# 3) Start the dev server
npm run dev
# Server: http://localhost:3000
```

Log in at `/auth/login` or register at `/auth/register`, then go to `/upload` to
manage files and folders.

## Environment variables

Create a `.env` in the project root:

```env
# Server
PORT=3000
NODE_ENV=development
SESSION_SECRET=replace-with-strong-secret

# Prisma / Database (local Postgres connection string)
# Example (adjust to your local setup)
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DB_NAME?schema=public

# Supabase (server-side)
# Get these from Project Settings -> API
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Notes:

- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in any frontend; it is server-only.
- Ensure your Supabase Postgres and storage are in the same project for
  simplicity.

## Scripts

- `npm start` — start server
- `npm run dev` — start with nodemon
- `npm run prisma:generate` — generate Prisma client
- `npm run prisma:migrate` — run Prisma migrations (dev)

## Tech stack

- **Backend:** Node.js, Express, EJS (server-rendered)
- **Auth:** Passport (local strategy), express-session, Prisma session store
- **ORM/DB:** Prisma ORM, PostgreSQL (local)
- **Uploads:** Multer (memory storage) -> Supabase Storage (public URLs)
- **Validation/Misc:** express-validator, method-override, connect-flash, dotenv

## Project structure

```
.
├─ prisma/
│  ├─ migrations/
│  └─ schema.prisma
├─ public/
│  └─ css/
├─ src/
│  ├─ controllers/
│  ├─ middleware/
│  ├─ routes/
│  ├─ views/
│  └─ app.js
└─ README.md
```

## Routes

- **Auth**
  - `GET /auth/login` — login page
  - `POST /auth/login` — login
  - `GET /auth/register` — registration page
  - `POST /auth/register` — register
  - `GET /auth/logout` — logout
- **Files (protected)**
  - `GET /upload` — list user root files/folders
  - `POST /upload` — upload file (`multipart/form-data` field: `file`); optional
    `folderId`
  - `GET /upload/:id` — redirect to public URL (download)
  - `DELETE /upload/:id` — delete file (DB + Supabase storage)
- **Folders (protected)**
  - `POST /folders` — create folder (`name`, optional `parentId`)
  - `GET /folders/:id` — view folder contents (files + children)
  - `DELETE /folders/:id` — delete folder (cascade delete files in storage + DB)

Protected routes require an authenticated session (`isAuthenticated`).

## Supabase setup

1. Create a Supabase project
2. Database (local): set your local PostgreSQL `DATABASE_URL` in `.env` (Prisma
   uses this)
3. Storage: create a bucket named `files`
   - Set it to Public (so `getPublicUrl(...)` works)
4. API keys (Project Settings → API):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)

The app uploads to paths like `userId/root/<timestamp>-<filename>` or
`userId/<folderId>/<timestamp>-<filename>` and stores the `publicUrl` in the DB.

## Notes

- Sessions are persisted in Postgres using `@quixo3/prisma-session-store`.
- File size limit is currently 10MB (configured in Multer).
- Views are rendered with EJS and `express-ejs-layouts`.
- Database stores metadata (filename, size, mimetype, Supabase path and public
  URL); files live in Supabase Storage.
