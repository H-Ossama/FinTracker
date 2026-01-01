# FinTracker

FinTracker is a personal finance tracker built with Expo (React Native) and TypeScript. It is designed to work offline-first, storing your data locally by default.

## Screenshots

<table>
   <tr>
      <td><img src="Screenshots/screen-1.png" width="250" alt="FinTracker screenshot 1" /></td>
      <td><img src="Screenshots/screen-2.png" width="250" alt="FinTracker screenshot 2" /></td>
      <td><img src="Screenshots/screen-3.png" width="250" alt="FinTracker screenshot 3" /></td>
   </tr>
   <tr>
      <td><img src="Screenshots/screen-4.png" width="250" alt="FinTracker screenshot 4" /></td>
      <td><img src="Screenshots/screen-5.png" width="250" alt="FinTracker screenshot 5" /></td>
      <td><img src="Screenshots/screen-6.png" width="250" alt="FinTracker screenshot 6" /></td>
   </tr>
</table>

## Features

- Multiple wallets with transfers
- Income and expense tracking
- Budgets, reminders, bills, and goals
- Charts and insights
- Data stored locally (offline-first)

## Tech Stack

- Expo + React Native
- TypeScript
- SQLite (local database)
- React Navigation

## Project Structure

- Mobile app: root of the repository
- Backend API (optional): `backend/`

## Getting Started (Mobile App)

### Prerequisites

- Node.js 18+
- npm
- Expo Go (device) or an Android/iOS emulator

### Install & Run

```bash
npm install
npm start
```

### Run on Device/Emulator

```bash
npm run android
# or
npm run ios
```

## Backend (Optional)

The backend lives in `backend/`. Setup instructions are in `backend/SETUP.md`.

Typical workflow:

```bash
cd backend
npm install
npm run dev
```

## Releases

Download the latest build from the GitHub releases page:
https://github.com/H-Ossama/FinTracker/releases

## Contributing

- Bug reports: https://github.com/H-Ossama/FinTracker/issues
- Feature requests: https://github.com/H-Ossama/FinTracker/discussions

## License

MIT (see `LICENSE`).

## ⭐ Show Your Support

**Built with ❤️ for financial privacy and control**

If you find this project useful, please consider:
- [Starring this repository](https://github.com/H-Ossama/FinTracker) ⭐
- Testing the development build and sharing feedback
- Contributing to the codebase
- Reporting issues you encounter
