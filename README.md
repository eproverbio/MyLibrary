A mobile-first book library app scaffold for Expo, React Native, and local SQLite storage.

## Local database

The app stores books in a local SQLite database named `mylibrary.db` using the Expo SQLite module.
The database schema is created automatically the first time the app opens.

The `books` table contains:

- `title`
- `author`
- `notes`
- `status` with values `In progress`, `Read`, `Not Read`
- `bookmark` optional, used for the last page reached when a book is in progress
- `aiSummary` optional
- `createdAt`

## Local setup

1. Install dependencies with `npm install`
2. Start the app with `npm run start`
3. Add books from the UI and they will be stored locally on the device

## Notes

- In Expo, the actual SQLite file lives inside the app's local sandbox on the device or emulator.
- The database setup code is in `src/database/libraryDb.ts`, and the CRUD service is in `src/services/books.ts`.
- If you want AI later, we can add a separate service layer for summarizing or tagging books.
