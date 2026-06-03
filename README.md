# IronLog (Expo + TypeScript)

IronLog is a dark, high-energy gym tracker app with:

- Auth (login/register + persistent token in SecureStore)
- Muscles grid
- Exercise list with add/delete workflow
- Session logging with live PR detection
- Progress dashboard with Victory chart
- AI Coach chat connected to backend

## 1) Install prerequisites

- Node.js 20+
- Expo CLI (optional, can use npx)

## 2) Install dependencies

```bash
npm install
```

## 3) Set backend URL

Edit BASE_URL in src/services/api.ts:

```ts
export const BASE_URL = 'http://192.168.1.100:8000';
```

## 4) Run

```bash
npm run start
```

Then open Android, iOS, or web.

## Structure

- src/services/api.ts: axios instance, token interceptor, endpoint functions
- src/services/AuthContext.tsx: auth state + rehydration
- src/navigation/RootNavigator.tsx: auth stack + tabs + home stack
- src/screens/*: all app screens
- src/components/theme.ts: design system tokens
