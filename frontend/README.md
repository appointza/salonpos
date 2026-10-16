# Krios — Frontend

React + Vite SPA for the Krios salon & business platform demo.

## Development

Requires Node.js 20+ and npm.

```sh
cd frontend
npm install
npm run dev
```

App runs at http://localhost:8080

## Production build

```sh
npm run build
```

Static files are written to `dist/`:

- `index.html`
- `assets/` (JS, CSS, images)

Preview locally:

```sh
npm run preview
```

## Deploy (Nginx / EC2 / S3)

Upload the entire `dist/` folder to your web server. Configure the host to serve `index.html` for client-side routes:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

No Node.js server is required.

## Android & iOS (Capacitor)

The same Vite app is wrapped with Capacitor. Native builds load the **production** site **https://kriosapp.com** (app id `com.krios`).

```sh
cd frontend
npm run cap:android   # Android Studio
npm run cap:ios       # Xcode — requires a Mac
```

- Android can be built on this Windows machine with Android Studio + JDK 17.
- iOS project files are generated here; compiling and App Store upload must be done on a Mac.
- After web changes, run `npm run cap:sync` again so `android/` and `ios/` pick up `dist/`.

App id: `com.krios`.

## Stack

- React 19
- Vite 8
- TanStack Router
- Tailwind CSS 4
