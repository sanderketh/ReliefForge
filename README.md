# ReliefForge

> **Image → 3D STL Generator** — Upload any image, get a printable 3D relief heightmap in seconds.

---

## What it does

1. User uploads a PNG/JPG image
2. The server converts it to grayscale and maps brightness → height
3. A binary STL mesh is generated (solid base + heightmap top surface + walls)
4. User downloads the `.stl` file and prints it on any 3D printer

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Auth | JWT (jose) + bcryptjs |
| ORM | Prisma |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Image processing | sharp (Node.js native) |
| STL generation | Pure TypeScript (no Python needed) |

---

## Project Structure

```
reliefforge/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migration.sql          # Reference SQL
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout + fonts
│   │   ├── page.tsx            # Landing page
│   │   ├── globals.css         # Tailwind + custom styles
│   │   ├── login/
│   │   │   └── page.tsx        # Login form
│   │   ├── register/
│   │   │   └── page.tsx        # Register form
│   │   ├── dashboard/
│   │   │   └── page.tsx        # Dashboard (server component)
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── register/route.ts
│   │       │   ├── login/route.ts
│   │       │   └── logout/route.ts
│   │       ├── generate/
│   │       │   └── route.ts    # ← CORE: image→STL endpoint
│   │       └── user/
│   │           └── me/route.ts
│   ├── components/
│   │   └── DashboardClient.tsx # Main generator UI
│   ├── lib/
│   │   ├── auth.ts             # JWT helpers
│   │   ├── prisma.ts           # Prisma client singleton
│   │   └── stl-generator.ts   # STL mesh generation (pure TS)
│   └── middleware.ts           # Route protection
├── .env.example
├── next.config.js
├── tailwind.config.js
├── vercel.json
└── package.json
```

---

## Local Setup (Step by Step)

### Prerequisites

- **Node.js** ≥ 18.17 ([nodejs.org](https://nodejs.org))
- **npm** ≥ 9

### 1. Clone / create the project

```bash
# If cloning from git:
git clone https://github.com/youruser/reliefforge.git
cd reliefforge

# Or just enter the project directory:
cd reliefforge
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# SQLite for local development
DATABASE_URL="file:./dev.db"

# Generate a real secret: openssl rand -base64 32
JWT_SECRET="change-this-to-a-long-random-secret"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Set up the database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to SQLite (creates dev.db automatically)
npm run db:push
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How to Use

1. Go to `http://localhost:3000`
2. Click **Get started free** → Register with email + password
3. On the Dashboard:
   - **Upload** a PNG or JPG image
   - Adjust **Resolution** (low/medium/high)
   - Set **Height Scale** (0.5×–5× depth intensity)
   - Toggle **Invert** if you want dark = raised
4. Click **Generate STL**
5. Download the `.stl` file and open in Cura, PrusaSlicer, or any slicer

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/user/me` | Get current user info |
| POST | `/api/generate` | Upload image → returns STL binary |

### Generate endpoint

```
POST /api/generate
Content-Type: multipart/form-data

Fields:
  image       File      PNG/JPG/WebP, max 10MB
  resolution  string    "low" | "medium" | "high"
  heightScale number    0.5 – 5.0
  inverted    string    "true" | "false"

Response:
  Content-Type: application/octet-stream
  Binary STL file
```

---

## STL Generation — How It Works

File: `src/lib/stl-generator.ts`

The generator is **pure TypeScript** with zero external dependencies (except `sharp` for image decode).

1. **Image → Grayscale pixels** (via `sharp`)
2. **Resample** to target grid (50×50, 100×100, or 200×200) using nearest-neighbor
3. **Build height grid**: `height = baseThickness + brightness × maxHeight`
4. **Generate binary STL** mesh with 4 parts:
   - Top surface (heightmap quads → 2 triangles each)
   - Bottom flat base (facing down)
   - 4 side walls (connecting top edge to z=0)
5. Write **valid binary STL format**: 80-byte header + triangle count + 50 bytes/triangle

The output is a **watertight, manifold mesh** — suitable for 3D printing directly.

---

## Deployment

### Option A: Vercel (Recommended)

**1. Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/youruser/reliefforge.git
git push -u origin main
```

**2. Import on Vercel**
- Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
- Select your repo
- Framework: **Next.js** (auto-detected)

**3. Set environment variables in Vercel dashboard:**

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your PostgreSQL URL (from Railway) |
| `JWT_SECRET` | Random 32+ char string |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

**4. Deploy** — Vercel runs `npx prisma generate && next build` automatically (see `vercel.json`)

---

### Option B: Railway (PostgreSQL Database)

**1. Create PostgreSQL on Railway**
- Go to [railway.app](https://railway.app) → New Project → Add PostgreSQL
- Copy the `DATABASE_URL` connection string from the **Variables** tab

**2. Update your `.env` for production:**
```env
DATABASE_URL="postgresql://postgres:password@host.railway.app:5432/railway"
```

**3. Run migrations on Railway** (one time):
```bash
# With Railway CLI installed:
railway run npx prisma db push

# Or set DATABASE_URL locally and run:
DATABASE_URL="your-railway-url" npx prisma db push
```

**4. Set `DATABASE_URL` in Vercel** using the Railway PostgreSQL URL.

---

### Full Production Deploy Checklist

- [ ] `JWT_SECRET` is a long random string (not the example value)
- [ ] `DATABASE_URL` points to PostgreSQL (not SQLite)
- [ ] `NEXT_PUBLIC_APP_URL` matches your Vercel domain
- [ ] Run `prisma db push` against the production database
- [ ] Test register → generate → download flow

---

## Database Schema

```prisma
model User {
  id          String       @id @default(cuid())
  email       String       @unique
  password    String       // bcrypt hash (cost 12)
  name        String?
  usageCount  Int          @default(0)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  generations Generation[]
}

model Generation {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(...)
  filename    String
  resolution  String
  heightScale Float
  inverted    Boolean
  createdAt   DateTime @default(now())
}
```

---

## Useful Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run db:generate  # Regenerate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations (production)
npm run db:studio    # Open Prisma Studio (DB browser)
```

---

## Customization

| What | Where |
|------|-------|
| Free generation limit | `src/lib/auth.ts` → `FREE_LIMIT = 3` |
| Max height in mm | `src/lib/stl-generator.ts` → `maxHeight` |
| Base thickness | `src/lib/stl-generator.ts` → `baseThickness` |
| Grid resolutions | `src/lib/stl-generator.ts` → `RESOLUTION_SIZES` |
| Brand colors | `tailwind.config.js` → `forge` palette |

---

## License

MIT — free to use and modify.
