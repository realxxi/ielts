# Tilshunos

O‘zbek tilidagi chet tillarini o‘rganish platformasi. Monorepo ichida Next.js sayti va alohida NestJS REST API joylashgan.

## Ishga tushirish

1. Node.js 22+ va MongoDB o‘rnating.
2. `apps/api/.env.example` dan `apps/api/.env` yarating va `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` qiymatlarini kiriting. Email tasdiqlash uchun Brevo API kaliti (`BREVO_API_KEY`) va Brevo’da tasdiqlangan jo‘natuvchi emaili (`BREVO_SENDER_EMAIL`) ni sozlang; jo‘natuvchi nomi `BREVO_SENDER_NAME` bilan o‘zgartiriladi. Telegram bot tokenini API `.env` fayliga, bot username’ini esa `apps/web/.env.local` ichidagi `NEXT_PUBLIC_TELEGRAM_BOT_NAME` ga yozing. Web API manzili uchun `NEXT_PUBLIC_API_URL` ixtiyoriy (`http://localhost:4000/api` default).
3. `npm install` va `npm run dev` bajaring.
4. Sayt `http://localhost:3000`, API `http://localhost:4000/api`, Swagger hujjati `http://localhost:4000/api/docs` manzillarida ishlaydi.

Admin boshlang‘ich hisobi server env qiymatlaridan ilk ishga tushishda yaratiladi. Testlar MongoDB’da saqlanadi; yangi testlarni admin kabinetidagi “Testlar” bo‘limidan JSON import qilib bazaga qo‘shing. Secretlarni repositoryga qo‘shmang.

## Render’ga joylash

Repositoryni GitHub/GitLab’ga yuboring va Render boshqaruv panelida **New → Blueprint** orqali repositoryni ulang. Root papka sifatida repository ildizini qoldiring; `render.yaml` ikkita alohida Node servisini yaratadi. API uchun `MONGODB_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` va Telegram login ishlatilsa `TELEGRAM_BOT_TOKEN` qiymatlarini kiriting. `BREVO_SENDER_NAME` ixtiyoriy. Web servisiga Telegram login uchun `NEXT_PUBLIC_TELEGRAM_BOT_NAME` kiriting. `JWT_SECRET` Render tomonidan avtomatik yaratiladi. MongoDB Atlas’da Render serverlaridan ulanishga ruxsat berilganini tekshiring.

Web servisi build vaqtida `NEXT_PUBLIC_API_URL` ni API manziliga oladi. `NEXT_PUBLIC_TELEGRAM_BOT_NAME` qiymatiga Telegram bot username’ini `@` belgisiz kiriting. Blueprint’dagi servis nomlarini o‘zgartirsangiz, `render.yaml` ichidagi `WEB_ORIGIN` va `NEXT_PUBLIC_API_URL` qiymatlarini ham yangi `onrender.com` domenlariga moslang. Deploydan so‘ng API hujjatlari `https://<api-domeni>/api/docs` manzilida bo‘ladi.

## API

Email ro‘yxatdan o‘tish bosqichlari: `POST /auth/register` emailga kod yuboradi, `POST /auth/verify-registration` kodni tasdiqlab akkaunt yaratadi, `POST /auth/resend-registration-code` kodni qayta yuboradi. Telegram orqali kirish uchun `POST /auth/telegram` ishlatiladi. Asosiy boshqa endpointlar: `POST /auth/login`, `GET/POST /courses`, `GET/PATCH /courses/:id`, `GET /courses/mine`, `POST /courses/:id/request-access`, `POST /courses/:id/progress`, `GET /tests`, `GET /tests/:id`, `POST /tests/:id/submit`, `GET /admin/courses`, `POST /admin/tests/import`, `GET /admin/tests`, `PATCH /admin/courses/:id/review`, `GET /admin/access-requests`, `PATCH /admin/access-requests/:id`, `GET /admin/users`.

API role guard bilan himoyalangan; sayt API manzilini `NEXT_PUBLIC_API_URL` dan oladi (default `http://localhost:4000/api`). Admin panelidan yangi kurs darhol nashr qilinadi, o‘qituvchi kursi esa admin tasdig‘ini kutadi. Admin panelidagi “Testlar” bo‘limiga test JSON faylini import qiling; format yuborilgan `tests` → `level` → `questions` namunasi bilan bir xil bo‘lishi kerak. O‘quvchilar testni `/tests` sahifasida yechib, natija va to‘g‘ri javoblarni ko‘radi.
