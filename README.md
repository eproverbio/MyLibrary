A mobile-first book library app scaffold for Expo, React Native, local SQLite storage, and native OCR experiments.

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

This project now relies on native modules such as `react-native-fast-tflite`, so it should be run with an Expo development build instead of Expo Go.

1. Install dependencies with `npm install`
2. Build and install the Android development client with `npm run android`
3. Start Metro for the dev client with `npm run start`
4. Open the installed `MyLibrary` development build on your device or emulator

If you change native dependencies or Expo plugins later, rebuild the Android app with `npm run android` before testing again.

## Notes

- In Expo, the actual SQLite file lives inside the app's local sandbox on the device or emulator.
- The database setup code is in `src/database/libraryDb.ts`, and the CRUD service is in `src/services/books.ts`.
- `npm run start` and `npm run start:dev-client` both start Metro in development-client mode, so the app should be opened through the installed dev build, not Expo Go.

## Blender asset pipeline

The project includes a small Blender-based asset pipeline under `assets_pipeline/`.

1. Start Blender with the MCP bridge enabled.
2. In VS Code, the workspace server config is available in `.vscode/mcp.json`.
3. Generate and copy sample assets with `npm run assets:blend`.

Generated files land in `assets_pipeline/outputs/` and are then copied into:

- `android/app/src/main/res/drawable/`
- `android/app/src/main/assets/models/`
