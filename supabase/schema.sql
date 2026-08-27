-- ============================================================
-- TRM PARTNERS PORTAL — SCHEMA (Phase 1: admin-only)
-- Client accounts/login are NOT part of this phase. Client
-- contact info lives as plain fields on the project. When you're
-- ready to add client logins later, that's a separate, additive
-- migration — nothing here needs to be redesigned for it.
-- Run this once against a FRESH Supabase project (SQL Editor).
-- ============================================================

-- ============================
-- USERS (admin accounts only, for now)
-- Supabase Auth handles the actual login/password; this table
-- stores the profile that Auth's user maps to.
-- ============================
CREATE TABLE users (
    id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role         VARCHAR(10) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
    admin_role   VARCHAR(20) CHECK (admin_role IN ('owner', 'project_manager', 'office_staff')),
    full_name    VARCHAR(150) NOT NULL,
    email        VARCHAR(150) NOT NULL,
    phone        VARCHAR(30),
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- ============================
-- MILESTONE TEMPLATE (the fixed 15-step phase list, defined once)
-- ============================
CREATE TABLE milestone_templates (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    sort_order   INT NOT NULL,
    description  TEXT
);

-- ============================
-- PROJECTS
-- Client contact info is plain fields here — NOT a login account.
-- ============================
CREATE TABLE projects (
    id                        SERIAL PRIMARY KEY,
    name                      VARCHAR(150) NOT NULL,
    client_name               VARCHAR(150) NOT NULL,
    client_entity_name        VARCHAR(150),
    address                   VARCHAR(255),
    client_phone              VARCHAR(30),
    client_email              VARCHAR(150),
    status                    VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
    start_date                DATE,
    estimated_completion_date DATE,

    -- Estimate / contract lifecycle dates
    estimate_sent_date        DATE,
    estimate_accepted_date    DATE,
    estimate_file_key         VARCHAR(500),
    contract_sent_date        DATE,
    contract_signed_date      DATE,
    contract_file_key         VARCHAR(500),

    -- Financials
    contract_value            NUMERIC(12,2),

    -- QuickBooks Online mapping (for later)
    qbo_customer_id           VARCHAR(50),

    created_by                UUID REFERENCES users(id),
    created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- PROJECT MILESTONES (template instantiated per project)
-- ============================
CREATE TABLE project_milestones (
    id                  SERIAL PRIMARY KEY,
    project_id          INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    template_id         INT REFERENCES milestone_templates(id),
    name                VARCHAR(100) NOT NULL,
    sort_order          INT NOT NULL,
    completion_percent  INT DEFAULT 0 CHECK (completion_percent BETWEEN 0 AND 100),
    status              VARCHAR(20) DEFAULT 'not_started'
                          CHECK (status IN ('not_started', 'in_progress', 'complete')),
    notes               TEXT,
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- MILESTONE TO-DOS
-- ============================
CREATE TABLE milestone_todos (
    id            SERIAL PRIMARY KEY,
    milestone_id  INT NOT NULL REFERENCES project_milestones(id) ON DELETE CASCADE,
    text          VARCHAR(255) NOT NULL,
    done          BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- PHOTOS (attached to a specific milestone)
-- ============================
CREATE TABLE photos (
    id             SERIAL PRIMARY KEY,
    milestone_id   INT NOT NULL REFERENCES project_milestones(id) ON DELETE CASCADE,
    storage_key    VARCHAR(500) NOT NULL,
    caption        VARCHAR(255),
    uploaded_by    UUID REFERENCES users(id),
    uploaded_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- PAYMENTS (received against a project — manual or synced from QBO later)
-- ============================
CREATE TABLE payments (
    id             SERIAL PRIMARY KEY,
    project_id     INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    amount         NUMERIC(12,2) NOT NULL,
    payment_date   DATE NOT NULL,
    method         VARCHAR(30),
    reference      VARCHAR(100),
    notes          TEXT,
    source         VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'qbo')),
    qbo_payment_id VARCHAR(50),
    recorded_by    UUID REFERENCES users(id),
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- PAYMENT SCHEDULE (planned draws — informational until clients log in)
-- ============================
CREATE TABLE payment_schedule (
    id            SERIAL PRIMARY KEY,
    project_id    INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id  INT REFERENCES project_milestones(id),
    description   VARCHAR(150) NOT NULL,
    due_date      DATE NOT NULL,
    amount        NUMERIC(12,2) NOT NULL,
    status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    payment_id    INT REFERENCES payments(id)
);

-- ============================
-- PROJECT COSTS (for profitability tracking — materials, labor, subs)
-- ============================
CREATE TABLE project_costs (
    id              SERIAL PRIMARY KEY,
    project_id      INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category        VARCHAR(50),
    vendor          VARCHAR(150),
    amount          NUMERIC(12,2) NOT NULL,
    cost_date       DATE NOT NULL,
    qbo_expense_id  VARCHAR(50),
    notes           TEXT,
    recorded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- CHANGE ORDERS
-- E-signing is disabled until client logins exist — for now this
-- just tracks what was issued and its status, set manually by admin.
-- ============================
CREATE TABLE change_orders (
    id              SERIAL PRIMARY KEY,
    project_id      INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title           VARCHAR(150) NOT NULL,
    description     TEXT,
    amount          NUMERIC(12,2),
    file_name       VARCHAR(255),
    storage_key     VARCHAR(500),
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined')),
    sent_date       DATE,
    signed_date     DATE,
    signed_by_name  VARCHAR(150),
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- DOCUMENTS (Plans / Permits / Insurance / Other — general library)
-- ============================
CREATE TABLE documents (
    id            SERIAL PRIMARY KEY,
    project_id    INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category      VARCHAR(30) NOT NULL CHECK (category IN ('plans', 'permits', 'insurance', 'other')),
    file_name     VARCHAR(255) NOT NULL,
    storage_key   VARCHAR(500) NOT NULL,
    uploaded_by   UUID REFERENCES users(id),
    uploaded_at   TIMESTAMPTZ DEFAULT NOW(),
    notes         VARCHAR(255)
);

-- ============================
-- MATTERPORT 3D TOURS
-- ============================
CREATE TABLE matterport_tours (
    id              SERIAL PRIMARY KEY,
    project_id      INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id    INT REFERENCES project_milestones(id),
    title           VARCHAR(150) NOT NULL,
    matterport_url  VARCHAR(500) NOT NULL,
    scan_date       DATE,
    uploaded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- DAILY LOGS (site diary)
-- ============================
CREATE TABLE daily_logs (
    id              SERIAL PRIMARY KEY,
    project_id      INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    log_date        DATE NOT NULL,
    weather         VARCHAR(30),
    crew            TEXT,
    work_completed  TEXT,
    delays          TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- SELECTIONS (finish choices tracked by admin until clients log in)
-- ============================
CREATE TABLE selections (
    id                 SERIAL PRIMARY KEY,
    project_id         INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category           VARCHAR(150) NOT NULL,
    allowance          NUMERIC(12,2),
    due_date           DATE,
    chosen_option_id   INT,
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE selection_options (
    id             SERIAL PRIMARY KEY,
    selection_id   INT NOT NULL REFERENCES selections(id) ON DELETE CASCADE,
    name           VARCHAR(150) NOT NULL,
    price          NUMERIC(12,2)
);

ALTER TABLE selections
  ADD CONSTRAINT fk_selections_chosen_option
  FOREIGN KEY (chosen_option_id) REFERENCES selection_options(id);

-- ============================
-- RFIs (tracked internally by admin for now)
-- ============================
CREATE TABLE rfis (
    id            SERIAL PRIMARY KEY,
    project_id    INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    question      TEXT NOT NULL,
    raised_date   DATE NOT NULL,
    answer        TEXT,
    answered_at   TIMESTAMPTZ,
    created_by    UUID REFERENCES users(id),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- USEFUL INDEXES
-- ============================
CREATE INDEX idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX idx_payments_project_id ON payments(project_id);
CREATE INDEX idx_change_orders_project_id ON change_orders(project_id);
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_daily_logs_project_id ON daily_logs(project_id);
