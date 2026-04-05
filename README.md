# Admin-Based Clothing Inventory, Shop Order, and Cutting Management System

This project is an admin-only web system for:
- supplier and material management
- purchases and stock tracking
- shop order tracking
- cutting records with stock deduction
- dashboard and reports

## Stack
- Frontend: React, Tailwind CSS, React Router, Axios
- Backend: Node.js, Express, Prisma ORM
- Database: PostgreSQL
- Auth: JWT + bcrypt

## Project Structure
- `client/` React frontend
- `server/` Express backend + Prisma schema

## Quick Start
1. Install dependencies:
   - `npm run install:all`
2. Configure environment:
   - Copy `server/.env.example` to `server/.env`
   - Set `DATABASE_URL`, `JWT_SECRET`
3. Run migration from `server/`:
   - `npx prisma migrate dev --name init`
4. Generate Prisma client:
   - `npm run prisma:generate`
5. Seed first admin from `server/`:
   - `npm run seed:admin`
6. Start backend:
   - `npm run dev:server`
7. Start frontend:
   - `npm run dev:client`

## Current Status
- Folder structure initialized
- Prisma schema completed for all core modules
- Authentication API implemented (`POST /api/auth/login`, `GET /api/auth/me`)
- Protected routing enabled for domain modules
- Master CRUD implemented for suppliers, shops, materials, products
- Purchases API implemented with automatic stock increase via transaction
- Stock list API implemented with low-stock filtering

## Foundation Decisions Locked
- Materials and products are separated by design:
   - materials = raw cloth/input stock
   - products = finished dress/design
- Stock has one row per material (`material_id` unique in stock table)
- Material unit is fixed per material (`yard`, `kg`, `piece`)
- Stock changes are controlled by events:
   - purchases increase
   - cuttings decrease (to be implemented next)
   - adjustments correct
- Deletion behavior is restrictive by default:
   - referenced records cannot be hard-deleted (enforced by DB FK and API 409 response)
   - soft delete can be added later if needed

## Next Build Order
1. Validate DB credentials and run migration + seed on a real PostgreSQL instance
2. Frontend login + protected layout + integration of working master CRUD pages
3. Cuttings API with stock deduction and insufficient-stock validation
4. Shop orders API and UI
5. Reports + dashboard summary APIs
