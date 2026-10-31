# Notebook

A personal notebook app. Notebooks hold chapters, chapters hold pages, and
pages hold blocks: text notes, images, and files (including PDFs). Notes
support multi-color highlighting, and each notebook has a Highlights view
that collects everything you marked.

## Structure

- Notebook (user-named subject) → Chapter → Page → blocks
- Every level supports create, rename, reorder, and delete.
- Notebook covers have a solid color the user picks and can change anytime.
- Search covers notebooks, chapters, pages, and note text.

## Auth

Username + password, bcrypt-hashed, with a signed JWT session cookie
(30 days). Login accepts a username, an email, or a display name, so
accounts created by other apps on a shared database keep working here.
This app only ever creates new user records on signup — it never modifies
or deletes existing login data.

## Environment

Set these on the host (e.g. Vercel project settings):

- `MONGODB_URI` — MongoDB connection string
- `SESSION_SECRET` — random string used to sign session cookies

## Develop

```bash
npm install
npm run dev
```

## Notes

- Images are compressed in the browser (max 1200px, JPEG) before upload.
- File attachments are capped at 10 MB per file.
