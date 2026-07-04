-- Idempotent — safe to run against a database that already has some or all of these objects.
-- Tables: CREATE IF NOT EXISTS (skipped if present, existing data untouched)
-- Policies: DROP IF EXISTS then CREATE (always reflects latest definition)
-- Indexes: CREATE IF NOT EXISTS

-- ── Transactions ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.transactions (
  id          uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type        text          NOT NULL CHECK (type IN ('income', 'expense')),
  amount      numeric(10,2) NOT NULL CHECK (amount > 0),
  category    text          NOT NULL,
  note        text,
  date        date          NOT NULL DEFAULT current_date,
  created_at  timestamptz   DEFAULT now() NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own" ON public.transactions;
CREATE POLICY "select own" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert own" ON public.transactions;
CREATE POLICY "insert own" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update own" ON public.transactions;
CREATE POLICY "update own" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete own" ON public.transactions;
CREATE POLICY "delete own" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS transactions_user_date
  ON public.transactions (user_id, date DESC);

-- ── Recurring bills ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.recurring_bills (
  id          uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        text          NOT NULL,
  amount      numeric(10,2) NOT NULL CHECK (amount > 0),
  category    text          NOT NULL,
  cadence     text          NOT NULL CHECK (cadence IN ('weekly', 'fortnightly', 'monthly', 'annually')),
  created_at  timestamptz   DEFAULT now() NOT NULL
);

ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own" ON public.recurring_bills;
CREATE POLICY "select own" ON public.recurring_bills
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert own" ON public.recurring_bills;
CREATE POLICY "insert own" ON public.recurring_bills
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update own" ON public.recurring_bills;
CREATE POLICY "update own" ON public.recurring_bills
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete own" ON public.recurring_bills;
CREATE POLICY "delete own" ON public.recurring_bills
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS recurring_bills_user
  ON public.recurring_bills (user_id);

-- ── Budgets ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.budgets (
  id            uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category      text          NOT NULL,
  weekly_amount numeric(10,2) NOT NULL CHECK (weekly_amount > 0),
  created_at    timestamptz   DEFAULT now() NOT NULL,
  UNIQUE (user_id, category)
);

ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS rollover_reset_week text;

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own" ON public.budgets;
CREATE POLICY "select own" ON public.budgets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert own" ON public.budgets;
CREATE POLICY "insert own" ON public.budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update own" ON public.budgets;
CREATE POLICY "update own" ON public.budgets
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete own" ON public.budgets;
CREATE POLICY "delete own" ON public.budgets
  FOR DELETE USING (auth.uid() = user_id);
