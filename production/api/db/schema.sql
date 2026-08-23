CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text UNIQUE NOT NULL,
 phone text UNIQUE NOT NULL,
 password_hash text NOT NULL,
 full_name text NOT NULL,
 birth_date date NOT NULL,
 cpf_hash text UNIQUE NOT NULL,
 role text NOT NULL DEFAULT 'user' CHECK(role IN('user','verified','support','moderator','admin')),
 status text NOT NULL DEFAULT 'pending_kyc' CHECK(status IN('pending_kyc','active','suspended','banned','self_excluded')),
 kyc_status text NOT NULL DEFAULT 'not_started' CHECK(kyc_status IN('not_started','pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_sessions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash text UNIQUE NOT NULL, user_agent text, ip inet, expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kyc_cases(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 provider text NOT NULL, provider_case_id text UNIQUE NOT NULL, status text NOT NULL,
 provider_payload jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallets(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 balance numeric(18,2) NOT NULL DEFAULT 0 CHECK(balance>=0), held_balance numeric(18,2) NOT NULL DEFAULT 0 CHECK(held_balance>=0),
 currency char(3) NOT NULL DEFAULT 'BRL', updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), wallet_id uuid NOT NULL REFERENCES wallets(id), kind text NOT NULL,
 amount numeric(18,2) NOT NULL, balance_after numeric(18,2) NOT NULL, reference text,
 idempotency_key text UNIQUE NOT NULL, status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deposits(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), provider text NOT NULL,
 provider_payment_id text UNIQUE, amount numeric(18,2) NOT NULL CHECK(amount>0), status text NOT NULL DEFAULT 'pending',
 provider_payload jsonb, approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS withdrawals(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), amount numeric(18,2) NOT NULL CHECK(amount>0),
 status text NOT NULL DEFAULT 'pending_review' CHECK(status IN('pending_review','processing','paid','rejected','failed')),
 provider_payout_id text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS responsible_limits(
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, max_stake numeric(18,2) NOT NULL,
 daily_deposit_limit numeric(18,2) NOT NULL, weekly_deposit_limit numeric(18,2) NOT NULL,
 session_time_limit_min integer, self_excluded_until timestamptz, permanent_self_exclusion boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sports_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), external_id text UNIQUE NOT NULL, sport_key text NOT NULL, sport_title text NOT NULL,
 home_team text NOT NULL, away_team text NOT NULL, commence_time timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'scheduled' CHECK(status IN('scheduled','live','finished','cancelled')),
 home_score integer, away_score integer, provider_payload jsonb, updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sports_markets(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES sports_events(id) ON DELETE CASCADE,
 market_key text NOT NULL, selection text NOT NULL, point numeric(10,3),
 point_key numeric(10,3) GENERATED ALWAYS AS (coalesce(point,-999999::numeric)) STORED,
 odds numeric(10,3) NOT NULL CHECK(odds>1), source text, is_open boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(event_id,market_key,selection,point_key)
);

CREATE TABLE IF NOT EXISTS sports_bets(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), market_id uuid NOT NULL REFERENCES sports_markets(id),
 stake numeric(18,2) NOT NULL CHECK(stake>0), odds_at_bet numeric(10,3) NOT NULL, potential_payout numeric(18,2) NOT NULL,
 status text NOT NULL DEFAULT 'open' CHECK(status IN('open','won','lost','void')),
 idempotency_key text UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), settled_at timestamptz
);

CREATE TABLE IF NOT EXISTS casino_games(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider_game_id text UNIQUE NOT NULL, name text NOT NULL, category text NOT NULL,
 thumbnail_url text, is_active boolean NOT NULL DEFAULT true, provider_payload jsonb, updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS casino_sessions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), provider_game_id text NOT NULL,
 provider_session_id text, status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz
);

CREATE TABLE IF NOT EXISTS webhook_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL, event_key text UNIQUE NOT NULL, payload jsonb NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz
);

CREATE TABLE IF NOT EXISTS admin_audit(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid REFERENCES users(id), action text NOT NULL,
 target_type text, target_id text, details jsonb, ip inet, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON refresh_sessions(user_id,expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_wallet_created ON ledger(wallet_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_user_created ON deposits(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status,created_at);
CREATE INDEX IF NOT EXISTS idx_bets_user_created ON sports_bets(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_time ON sports_events(commence_time);
CREATE INDEX IF NOT EXISTS idx_kyc_user_created ON kyc_cases(user_id,created_at DESC);
