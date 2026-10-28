# Development workflow

- User instruction, 2026-10-28: develop and upload changes on `feature/supabase-integration`. Keep this as the working branch for subsequent code work. Do not push changes to `main` or merge without a user request.
- The existing Supabase project is `czxcnvgbrrakyydtdhgh`. Initial schema/seed SQL has already been applied; do not re-run it against this project.
- Scope: fabric selection, lookup, evidence, and combination analysis. Detailed test guides, result persistence and AI chatbot belong to other team members. Preserve the complete analysis response for their integration.
- Frontend may contain only the browser-safe publishable key. Never commit a service-role key, secret key, database password or access token.
