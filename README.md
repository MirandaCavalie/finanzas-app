# 💰 Personal Finance Tracker

Web app for tracking personal finances, built for people who earn in one currency and spend in another. Built with **Next.js**, **Supabase**, and **Tailwind CSS**.

## Why I built this

I was earning in USD but spending in Peruvian soles, and I needed something simpler than a spreadsheet to understand where my money was going. I wanted to:

- See my expenses automatically converted to a base currency (USD)
- Categorize my spending to identify where most of my money went
- Set a monthly budget with a savings goal
- Use it as a widget on my phone without opening spreadsheets

## Features

- **Multi-currency transactions** — Log income and expenses in any currency with automatic USD conversion using real-time exchange rates
- **Monthly budget** — Set your fixed income and savings percentage. The app calculates your available budget and warns you if you go over
- **Custom categories** — Create categories with emojis for expenses and income (🍔 Food, 🚗 Transport, etc.)
- **Dashboard with charts** — Pie chart for spending by category and bar chart with 6-month trends
- **Smart metrics** — Average daily spending, top category, days remaining in the month, and projected savings
- **Trend analysis** — Compare your current month vs the previous one to see if you're improving or not
- **Multiple accounts** — Manage several accounts with independent balances
- **Payment methods** — Track whether you paid with cash, card, transfer, etc.

## Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 14** (App Router) | Frontend + SSR |
| **TypeScript** | Type safety |
| **Supabase** | Auth, database (PostgreSQL), Row Level Security |
| **Tailwind CSS** | Styling |
| **Recharts** | Charts (PieChart, BarChart) |
| **Exchange Rate API** | Real-time currency conversion |

## Project Structure

```
app/
├── auth/
│   └── login/          # Login page
├── dashboard/
│   ├── page.tsx        # Main dashboard
│   └── components/
│       ├── TransactionForm.tsx      # Modal for adding transactions
│       ├── MonthlyConfigModal.tsx   # Monthly budget configuration
│       ├── MonthlyBudgetCard.tsx    # Budget card with progress bar
│       ├── DashboardStats.tsx       # Charts and metrics
│       └── AddCategoryModal.tsx     # Modal for creating categories
├── lib/
│   ├── supabase.ts     # Supabase client
│   └── exchangeRate.ts # Currency conversion helpers
└── layout.tsx
```

## Database Schema (Supabase)

Main tables:

- **monthly_config** — Fixed income, savings %, and currency per month per user
- **transactions** — Amount, converted amount in USD, exchange rate used, category, account, payment method, and date
- **categories** — Name, type (income/expense), emoji icon, per user
- **accounts** — Name, type, and balance
- **currencies** — Code (USD, PEN, etc.) and symbol
- **payment_methods** — Available payment methods

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/MirandaCavalie/finanzas-app.git
cd finanzas-app
npm install
```

### 2. Configure Supabase

Create a project at [supabase.com](https://supabase.com) and set up the database tables.

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).


## License

Personal project. Free to use.
