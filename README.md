# Y JOEX Storefront

Mobile first Next.js storefront for Y JOEX and the JOEXÉ women's edit. Orders and shipping fees use Neon Postgres through Neon's serverless driver. The catalog starts with 12 preview products and the supplied product photography.

## Local setup

1. Install Node.js 20.9 or newer.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL`, the admin credentials, and the admin session secret.
3. In Neon SQL Editor, run `neon/schema.sql` once to create and seed the tables.
4. Run `npm install`, then `npm run dev` and open `http://localhost:3000`.

Use `npm run typecheck` and `npm run build` before deployment.

## Neon

Create a Neon project and copy its pooled connection string into `DATABASE_URL`. Keep this value private; it is server-only and must not use the `NEXT_PUBLIC_` prefix. Run `neon/schema.sql` against the production branch. It creates products, orders, shipping fees and site settings, and seeds the 12 preview products plus sample shipping fees.

Order checkout verifies the submitted product variants against Neon, calculates subtotal and delivery from database prices, saves the order, then opens WhatsApp with the saved order summary. The current admin login uses `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`. Use a unique long password and at least 32 random characters for the session secret.

## GitHub and Vercel

1. Push the repository to GitHub.
2. In Vercel, import the GitHub repository as a Next.js project.
3. In Vercel project settings, add `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, and `NEXT_PUBLIC_WHATSAPP_NUMBER` for Production and Preview as needed.
4. Deploy. Set `NEXT_PUBLIC_SITE_URL` to the final domain, then test checkout and `/admin` on the deployment.

Neon and Vercel integrations can also create preview database branches; make sure the Preview `DATABASE_URL` points to the intended Neon branch.

## Replacing preview data

- Edit names, prices, variants, stock and image paths in `src/lib/products.ts` for the storefront preview.
- Update the matching seed rows in `neon/schema.sql` before initializing a live database.
- Replace the sample images in `public/images/products` with the final product photography and update image paths.
- Remove the “Preview sample” product copy in `src/components/product-detail.tsx` when final fabric and fit details are approved.
- Confirm shipping fees, returns policy, social links and the WhatsApp number before launch.

## Current admin scope

The admin route has password sign in, Neon backed order listing, status updates, and WhatsApp contact links. Product CRUD, hosted image uploads, editable site settings and shipping fee editing are not yet implemented; products are currently maintained in code and the SQL seed. Neon provides the database, not file storage, so use a hosted image service or keep optimized static files in `public/images`.
