# Tilshunos

O‘zbek tilidagi chet tillarini o‘rganish platformasi. Monorepo ichida Next.js sayti va alohida NestJS REST API joylashgan.

## Ishga tushirish

1. Node.js 20+ va MongoDB o‘rnating.
2. `apps/api/.env.example` dan `apps/api/.env` yarating va `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` qiymatlarini kiriting. Telegram login uchun bot tokenini API `.env` fayliga, bot username’ini esa `apps/web/.env.local` ichidagi `NEXT_PUBLIC_TELEGRAM_BOT_NAME` ga yozing. Web API manzili uchun `NEXT_PUBLIC_API_URL` ixtiyoriy (`http://localhost:4000/api` default).
3. `npm install` va `npm run dev` bajaring.
4. Sayt `http://localhost:3000`, API `http://localhost:4000/api`, Swagger hujjati `http://localhost:4000/api/docs` manzillarida ishlaydi.

Admin boshlang‘ich hisobi server env qiymatlaridan ilk ishga tushishda yaratiladi. Ilova birinchi marta ishga tushganda `apps/api/data/turkish-tests.json` faylidagi A1, A2, B1, B2 va C1 testlarini ham bazaga yuklaydi. Secretlarni repositoryga qo‘shmang.

## API

Asosiy endpointlar: `POST /auth/register`, `POST /auth/login`, `POST /auth/telegram`, `GET/POST /courses`, `GET/PATCH /courses/:id`, `GET /courses/mine`, `POST /courses/:id/request-access`, `POST /courses/:id/progress`, `GET /tests`, `GET /tests/:id`, `POST /tests/:id/submit`, `GET /admin/courses`, `POST /admin/tests/import`, `GET /admin/tests`, `PATCH /admin/courses/:id/review`, `GET /admin/access-requests`, `PATCH /admin/access-requests/:id`, `GET /admin/users`.

API role guard bilan himoyalangan; sayt API manzilini `NEXT_PUBLIC_API_URL` dan oladi (default `http://localhost:4000/api`). Admin panelidan yangi kurs darhol nashr qilinadi, o‘qituvchi kursi esa admin tasdig‘ini kutadi. Admin panelidagi “Testlar” bo‘limiga test JSON faylini import qiling; format yuborilgan `tests` → `level` → `questions` namunasi bilan bir xil bo‘lishi kerak. O‘quvchilar testni `/tests` sahifasida yechib, natija va to‘g‘ri javoblarni ko‘radi.
