-- Subaccounts
create table public.subaccounts (
  id uuid default gen_random_uuid() primary key,
  org_id text not null,
  paystack_subaccount_id text,
  business_name text,
  settlement_bank text,
  account_number text,
  currency text default 'NGN',
  active boolean default false,
  metadata jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Transactions
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  org_id text not null,
  funder_email text,
  amount bigint,
  currency text,
  paystack_reference text,
  paystack_event jsonb,
  status text,
  created_at timestamp with time zone default now()
);
