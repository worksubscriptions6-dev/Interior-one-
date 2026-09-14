# Interior One

The Karunagappally studio's operating system — leads, calls, quotations,
projects, collections and the monthly numbers.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui ·
Prisma · Supabase (Postgres + Auth) · Vercel · GitHub.

## Why there is no separate backend

Vercel runs serverless functions, not a long-lived Node server, so a NestJS app
would have to be bundled into a function anyway — losing its lifecycle, paying
cold starts, and giving you two deploys to keep in step for no benefit at three
people. The API lives in `src/app/api/**/route.ts` instead. All the business
logic is untouched in `src/server/` as plain TypeScript, so it is still
testable on its own and could be lifted back out later if you ever outgrow this.

```
interior-one/
├── prisma/
│   ├── schema.prisma      Supabase Postgres, pooled + direct URLs
│   └── seed.ts            owner account, rate card, 12 monthly targets
├── middleware.ts          refreshes the Supabase session, guards every page
└── src/
    ├── app/api/           31 route handlers
    ├── lib/               db, auth, errors, route wrapper, supabase clients
    └── server/            the business logic — leads, quotes, projects,
                           analytics, settings, quote-math, schemas
```

## Setting it up

**1. Supabase.** Create a project in the `ap-south-1` (Mumbai) region — it is
the closest to Kerala and every millisecond shows on a site visit. From
*Project settings → API* take the URL, the anon key and the service role key.
From *Project settings → Database* take both connection strings.

**2. Environment.** `cp .env.example .env.local` and fill it in. Two database
URLs are needed and they are not interchangeable: `DATABASE_URL` is the
**pooled** connection on port 6543, which is what serverless functions must use
or you will exhaust Postgres connections; `DIRECT_URL` is port 5432 and is only
used by migrations.

**3. Database and first user.**

```bash
npm install
npm run db:migrate      # creates the schema in Supabase
npm run db:seed         # creates the Supabase auth user + owner profile,
                        # the 44-item rate card and the 12 monthly targets
npm run dev
```

**4. GitHub.** `git init && git add -A && git commit -m "Interior One" && git push`.
CI type-checks, lints and builds every push and pull request.

**5. Vercel.** Import the repo. Add all the variables from `.env.example` under
*Settings → Environment Variables* for Production and Preview. Set the build
command to `prisma generate && next build` (already the `build` script). Every
push to `main` deploys; every pull request gets its own preview URL.

## Auth

Supabase Auth owns passwords, sessions, resets and confirmation emails — none
of that lives in our tables. Our `User` row uses the Supabase auth uid as its
primary key and adds the one thing Supabase does not know: the role.

| Role | Sees |
|---|---|
| `OWNER` | Everything. The only role that can delete projects and quotations, or edit the rate card, targets and ad spend. |
| `SALES` | Leads, calls, quotations — but never cost or mark-up. |
| `COORDINATOR` | Leads, quotations with cost, projects, delivery steps, payments. |

`middleware.ts` refreshes the session on every request and bounces signed-out
visitors to `/login`. Route handlers call `requireUser()` and check roles
through the `route()` wrapper, so a forgotten check fails closed.

## Opening the app: the PIN

Day to day, opening the CRM is one thing — type **1188** and you are in.

Underneath there are two gates, because a four digit code on a public URL is
only ten thousand combinations and a script would walk all of them in under a
minute.

1. **Once per device**, a real sign-in with email and password through Supabase.
   The session then refreshes indefinitely while the person keeps using it, so
   nobody types a password again on that phone.
2. **Every session after that**, the PIN. It unlocks the app for twelve hours
   through a signed `io_unlock` cookie, then asks again. `middleware.ts` checks
   for it on every page and every API call, so a locked app returns `423` rather
   than data.

The PIN is bcrypt-hashed per user, never stored or compared in the browser, and
**five wrong tries locks it for fifteen minutes**. That turns ten thousand
combinations into weeks of guessing.

Each person has their own PIN, which matters: the app records who logged every
call and who owns every lead, and the roles decide who sees cost and margin.
A shared code would throw all of that away.

- Change your own PIN in Settings — you have to enter the current one first.
- The owner can reset anyone's PIN without knowing the old one.
- `POST /api/pin/verify` unlocks · `POST /api/pin/set` sets or resets.
- The seed gives the owner `1188` from `SEED_OWNER_PIN`. Change it once you
  are in — it is in this README, and this README will be in your GitHub repo.

## The rules the server enforces

These are business rules, not interface conveniences, so they live where
nothing can route around them.

**A lead only moves when a call is logged.** `POST /api/leads/:id/calls` is the
only endpoint that changes a stage. Zod rejects it without remarks and a
resulting stage, without a next call date on any open stage, and without a
reason when marking a lead lost. There is no endpoint that deletes a lead —
Lost is the only way out, and Reopen brings it back.

**"Call these now" is computed, not stored.** Open leads with no next call date
(never called) plus open leads whose date has arrived. Nothing can drift.

**A quotation always belongs to a lead**, and revisions keep the base number:
`IO-2026-001` becomes `IO-2026-001 R2`.

**Cost and mark-up are stripped per request by role**, so a `SALES` user can
build and send a quotation without ever seeing what the work costs the firm.

**Margin lives in one file.** `src/server/quote-math.ts` holds the only copy of
the arithmetic — a 35% mark-up is a 26% margin, a 45% mark-up is 31% — in
Decimal, not floats. When a discount is shown, the list price is worked
backwards from the price actually wanted, so the margin never moves.

**Accepting a quotation is one transaction**: contract value set, a call
written so it lands on the timeline, lead won, project opened with its four
milestones sized. **Deleting a project** returns the lead to Negotiation with
today as the next call and a call record explaining why; quotations are kept.

## Still to build

- The six screens — Lead, Pipeline, Quotes, Projects, Money, Numbers — in the
  charcoal-and-gold design, with the WhatsApp buttons, the call sheet, the
  quotation builder and the single-row pipeline.
- The client quotation rendered server side as a PDF.
- Meta lead form ingestion, so leads arrive without being typed.
