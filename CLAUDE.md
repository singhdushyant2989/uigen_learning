# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup       # First-time setup: install deps, generate Prisma client, run migrations
npm run dev         # Start dev server with Turbopack (localhost:3000)
npm run build       # Production build
npm run lint        # ESLint
npm run test        # Vitest unit tests (jsdom environment)
npm run db:reset    # Reset SQLite database
```

To run a single test file: `npx vitest run src/path/to/file.test.ts`

## Environment

Requires `ANTHROPIC_API_KEY` in `.env`. Without it, the app falls back to a mock provider that returns static hardcoded responses.

## Architecture

**UIGen** is an AI-powered React component IDE. Users describe components in a chat; Claude generates/edits code via tool calls; changes are reflected instantly in a sandboxed iframe preview.

### Three-Panel Layout (`src/app/main-content.tsx`)
- **Left (35%):** Chat interface — streams AI responses, displays tool call results
- **Right (65%):** Toggle between live Preview (iframe) and Code view (file tree + Monaco editor)

### Virtual File System (`src/lib/file-system.ts`)
`VirtualFileSystem` is an in-memory file tree (no disk I/O). All AI-generated code lives here. It serializes to JSON for DB persistence and for generating iframe HTML. Context in `src/lib/contexts/file-system-context.tsx`.

### AI/Tool Use Flow (`src/app/api/chat/route.ts`)
1. POST to `/api/chat` streams a response via Vercel AI SDK's `streamText()`
2. Claude is given two tools: `str_replace_editor` (create/edit files) and `file_manager` (rename/delete)
3. Tool implementations in `src/lib/tools/` mutate the `VirtualFileSystem`
4. On stream finish, messages + serialized filesystem are saved to the DB

### JSX Preview (`src/lib/transform/jsx-transformer.ts`)
Transforms virtual filesystem files into a self-contained HTML document rendered in a sandboxed `<iframe>`. Uses `@babel/standalone` for JSX parsing and generates blob-URL import maps. Entry point auto-detected: `App.jsx` → `App.tsx` → `index.jsx` → `index.tsx`.

### Authentication (`src/lib/auth.ts`, `src/middleware.ts`)
JWT tokens in httpOnly cookies (7-day expiry). Anonymous users get session-storage-only persistence. Authenticated users have projects saved to SQLite via Prisma.

### Database (`prisma/schema.prisma`)
SQLite with two models: `User` (email + bcrypt password) and `Project` (name, messages JSON, filesystem JSON, optional userId). Prisma client generated to `src/generated/`.

The database schema is defined in `prisma/schema.prisma`. Reference it anytime you need to understand the structure of data stored in the database.

## Code Style

- Use comments sparingly. Only comment complex code.

## Key Conventions

- **Path alias:** `@/*` maps to `src/*`
- **shadcn/ui** components in `src/components/ui/`, config in `components.json` (style: new-york, Tailwind CSS variables)
- **Server actions** in `src/actions/` use `"use server"` and `server-only` for auth-gated DB operations
- **AI system prompt** in `src/lib/prompts/generation.tsx` — instructs Claude to use Tailwind CSS, React hooks, and the virtual filesystem tools
- Tailwind CSS v4 (PostCSS plugin, no `tailwind.config.js`)
