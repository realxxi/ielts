# Tilshunos Mobile

Expo SDK 52 ilovasi. API va web manzillari `EXPO_PUBLIC_API_URL` hamda `EXPO_PUBLIC_WEB_URL` orqali sozlanadi. Telegram orqali kirish uchun web loyihasidagi `NEXT_PUBLIC_TELEGRAM_BOT_NAME` ham to‘g‘ri sozlangan bo‘lishi kerak.

## Ishga tushirish

1. Repository ildizida `npm install` bajaring.
2. `apps/mobile/.env.example` faylidan `apps/mobile/.env` nusxa oling va API URL manzilini sozlang. Render'dagi API manzili `https://<api-domain>/api` ko‘rinishida bo‘ladi. Telefon orqali lokal API'ga ulanishda `localhost` o‘rniga kompyuterning LAN IP manzilidan foydalaning.
3. Repository ildizida `npm run dev:mobile` buyrug‘ini bajaring.

Telegram login uchun web ilova deploy qilingan bo‘lishi, web `.env` ichida `NEXT_PUBLIC_TELEGRAM_BOT_NAME` sozlanishi va mobil `.env` ichidagi `EXPO_PUBLIC_WEB_URL` web ilova manziliga mos kelishi kerak.

TypeScript tekshiruvi: `npm run typecheck:mobile`. Lint: `npm run lint:mobile`.

## Android EAS Build

`apps/mobile` papkasiga kirib, Expo hisobiga kiring va loyihani ulang:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
```

Telefonga o‘rnatiladigan APK:

```sh
npx eas-cli@latest build --platform android --profile preview
```

Google Play uchun AAB:

```sh
npx eas-cli@latest build --platform android --profile production
```

EAS buyruqlarini `apps/mobile` papkasidan bajaring. `EXPO_PUBLIC_API_URL` va `EXPO_PUBLIC_WEB_URL` qiymatlarini EAS build environment'ida ham sozlang. `uz.tilshunos.mobile` application ID'sini chiqarishdan oldin uning unikal ekanini tekshiring.
