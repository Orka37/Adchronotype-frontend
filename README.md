# ADChronotype

ADChronotype is an Expo React Native application for sleep, chronotype, cognitive-test, caregiver, and physician-report workflows. The mobile app connects to the ADChronotype backend API hosted on Railway.

## Requirements

- Node.js 20 or newer
- npm
- Expo CLI through `npx expo`

## Environment

Create a local `.env` file:

```env
EXPO_PUBLIC_API_URL=https://web-production-fa250.up.railway.app
```

For Vercel, set the same value in the project environment variables.

## Local Development

```bash
npm install
npm run web
```

For mobile testing:

```bash
npx expo start
```

Then scan the Expo QR code with Expo Go or run an iOS/Android development build.

## Production Checks

```bash
npm run typecheck
npm run export:web
```

## Web Deployment

The web deployment is used for browser testing and password reset links. Vercel should use:

- Build command: `npm run export:web`
- Output directory: `dist`

After deployment, update the backend Railway variables:

```env
FRONTEND_APP_URL=https://your-vercel-domain.vercel.app
FRONTEND_ORIGINS=https://your-vercel-domain.vercel.app
```

## License

This project is proprietary. See `LICENSE`.
