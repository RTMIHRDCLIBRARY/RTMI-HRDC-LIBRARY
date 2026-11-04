RTMI-HRDC Library Version 2.0 — Starter

Included:
- Supabase email/password login
- User profile and role display
- Book catalogue and search
- Admin/librarian book entry and PDF upload
- Signed PDF viewing for authenticated users
- Book record deletion for staff

SETUP:
1. Extract this ZIP file.
2. Open config.js using Notepad.
3. Replace PASTE_YOUR_PROJECT_URL_HERE with your Project URL.
4. Replace PASTE_YOUR_PUBLISHABLE_KEY_HERE with your Publishable key.
5. Keep quotation marks and save.

IMPORTANT:
- Use only the Supabase Project URL and Publishable key.
- Never put a Supabase secret key or service_role key in browser files.
- The private Storage bucket must be named library-pdfs.
- Supabase tables/policies must match the earlier setup.
- This is the first connected stage. Circulation, fines, member administration, audit trail and stronger role governance are still to be added.
- Do not enable public sign-up yet. Create accounts through the administrator workflow.

To run locally, use a local web server (for example, VS Code with the free Live Server extension). Opening index.html directly may not work because this project uses JavaScript modules. We will set up GitHub Pages step by step.
