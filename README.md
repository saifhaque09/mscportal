# MSC Portal

This repository contains the MSC Portal application and Business Invoice System.

## Project layout

- `frontend/` — Next.js web application
- `backend/` — Laravel API, invoice processing, payments, and PDF generation

## Local setup

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed --class=IndividualInvoiceSampleSeeder
php artisan serve --port=8000
```

The invoice pages are available at `/business/invoices` and `/business/individual-invoices`.

Never commit `.env`, database credentials, API tokens, `node_modules`, `vendor`, or generated storage files.
