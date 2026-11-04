CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tipos enumerados utilizados por ServicePlan.
CREATE TYPE service_plan_type_enum AS ENUM (
    'SINGLE_DAY',
    'THREE_DAYS_WEEK',
    'SIX_DAYS_WEEK',
    'SIX_DAYS_WEEK_GYM'
);

CREATE TYPE service_plan_billing_period_enum AS ENUM (
    'SESSION',
    'MONTHLY'
);

CREATE TYPE service_plan_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE'
);

-- Planes de servicio.
CREATE TABLE service_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type service_plan_type_enum NOT NULL,
    billing_period service_plan_billing_period_enum NOT NULL,
    payment_due_day SMALLINT NULL,
    status service_plan_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(120) NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deactivated_by VARCHAR(120) NULL,
    deactivated_at TIMESTAMPTZ NULL
);

-- Tarifas históricas de cada plan.
CREATE TABLE plan_tariffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    amount_cop INTEGER NOT NULL,
    effective_from DATE NOT NULL,
    created_by VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_plan_tariffs_service_plan
        FOREIGN KEY (plan_id)
        REFERENCES service_plans(id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_plan_tariff_effective_date
        UNIQUE (plan_id, effective_from)
);

-- Registro de auditoría de operaciones sobre planes y tarifas.
CREATE TABLE plan_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    actor_user_id VARCHAR(120) NOT NULL,
    action VARCHAR(40) NOT NULL,
    changes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plan_audit_logs_plan_created
    ON plan_audit_logs (plan_id, created_at);
