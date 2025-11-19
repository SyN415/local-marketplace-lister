# Supabase Local Development Setup

## Overview
This document provides information about the local Supabase development environment for the Local Marketplace Lister project.

## Supabase CLI Version
- **Version**: 2.58.5

## Local Supabase Instance Details

### Dashboard & Service URLs

| Service | URL |
|---------|-----|
| **Supabase Studio** (Dashboard) | http://127.0.0.1:54323 |
| **API URL** | http://127.0.0.1:54321 |
| **GraphQL URL** | http://127.0.0.1:54321/graphql/v1 |
| **S3 Storage URL** | http://127.0.0.1:54321/storage/v1/s3 |
| **MCP URL** | http://127.0.0.1:54321/mcp |
| **Database URL** | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| **Mailpit URL** (Email Testing) | http://127.0.0.1:54324 |

### Authentication Keys

| Key Type | Value |
|----------|-------|
| **Anon Key (JWT)** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0` |
| **Service Role Key (JWT)** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU` |
| **Publishable Key** (New Format) | `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH` |
| **Secret Key** (New Format) | `sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz` |
| **JWT Secret** | `super-secret-jwt-token-with-at-least-32-characters-long` |

### S3 Storage Credentials

| Credential | Value |
|------------|-------|
| **S3 Access Key** | `625729a08b95bf1b7ff351a663f3a23c` |
| **S3 Secret Key** | `850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907` |
| **S3 Region** | `local` |

## Common Commands

### Start Supabase
```bash
supabase start
```

### Stop Supabase
```bash
supabase stop
```

### Check Status
```bash
supabase status
```

### Reset Database (WARNING: Deletes all data)
```bash
supabase db reset
```

### View Logs
```bash
supabase logs
```

### Generate TypeScript Types
```bash
supabase gen types typescript --local > frontend/src/types/database.ts
```

## Database Migrations

Migrations are located in the `supabase/migrations/` directory.

### Create a New Migration
```bash
supabase migration new <migration_name>
```

### Apply Migrations
```bash
supabase db reset  # Applies all migrations from scratch
```

## Environment Files

The following environment files have been created with local Supabase credentials:

1. **Root `.env`** - Contains all environment variables for the project
2. **`backend/.env`** - Backend-specific environment variables
3. **`frontend/.env`** - Frontend-specific environment variables (with VITE_ prefix)

## Accessing Supabase Studio

Open your browser and navigate to:
```
http://127.0.0.1:54323
```

This is your local Supabase dashboard where you can:
- View and edit database tables
- Manage authentication users
- Configure storage buckets
- Test SQL queries
- View API documentation

## Testing Email Functionality

Mailpit is available for testing email functionality locally:
```
http://127.0.0.1:54324
```

All emails sent by Supabase will be captured here instead of being sent to real email addresses.

## Important Notes

1. **Local Development Only**: These credentials are for local development only and should never be used in production.

2. **Data Persistence**: Data is stored in Docker volumes. Running `supabase stop` preserves your data, while `supabase db reset` will delete all data and reapply migrations.

3. **Port Conflicts**: If you encounter port conflicts, you can modify the ports in `supabase/config.toml`.

4. **Docker Required**: Supabase local development requires Docker to be running.

5. **Migrations**: Always create database schema changes as migrations in the `supabase/migrations/` directory to ensure they can be applied to production.

## Troubleshooting

### Supabase Won't Start
- Ensure Docker is running
- Check if ports 54321-54324 are available
- Try `supabase stop` followed by `supabase start`

### Database Connection Issues
- Verify the DATABASE_URL in your .env files
- Check that Supabase is running with `supabase status`

### Type Generation Issues
- Ensure migrations have been applied
- Run `supabase db reset` to apply all migrations
- Then run the type generation command

## Next Steps

1. Access Supabase Studio at http://127.0.0.1:54323
2. Review the database schema created by the initial migration
3. Test authentication flows
4. Set up storage buckets if needed
5. Configure Row Level Security (RLS) policies

## Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)