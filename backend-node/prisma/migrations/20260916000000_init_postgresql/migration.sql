-- ============================================================================
-- SmartTariff Phase 3: Initial PostgreSQL Schema Migration
-- Generated from backend-node/prisma/schema.prisma
-- ============================================================================

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('customer', 'admin');

-- CreateTable: users
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) DEFAULT '',
    "role" "Role" NOT NULL DEFAULT 'customer',
    "avatar" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: customer_profiles
CREATE TABLE "customer_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "current_plan_id" INTEGER,
    "monthly_budget" DOUBLE PRECISION DEFAULT 500,
    "minimum_data" DOUBLE PRECISION DEFAULT 10,
    "minimum_call_minutes" DOUBLE PRECISION DEFAULT 500,
    "minimum_sms" DOUBLE PRECISION DEFAULT 100,
    "preferred_duration" VARCHAR(50) DEFAULT '28',
    "requires_5g" BOOLEAN DEFAULT false,
    "preferred_operator" VARCHAR(50) DEFAULT '',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tariff_plans
CREATE TABLE "tariff_plans" (
    "id" SERIAL NOT NULL,
    "plan_code" VARCHAR(50),
    "name" VARCHAR(150) NOT NULL,
    "operator" VARCHAR(50) DEFAULT '',
    "category" VARCHAR(50) DEFAULT 'Standard',
    "price" DOUBLE PRECISION NOT NULL,
    "monthly_equivalent" DOUBLE PRECISION,
    "duration_months" INTEGER DEFAULT 1,
    "validity" INTEGER NOT NULL,
    "data_limit" DOUBLE PRECISION,
    "call_minutes" DOUBLE PRECISION,
    "sms_limit" DOUBLE PRECISION,
    "offer_type" VARCHAR(50) DEFAULT 'Standalone',
    "individual_cost" DOUBLE PRECISION,
    "discount_inr" DOUBLE PRECISION DEFAULT 0.0,
    "discount_percent" DOUBLE PRECISION DEFAULT 0.0,
    "five_g" BOOLEAN DEFAULT false,
    "description" TEXT DEFAULT '',
    "benefits" TEXT DEFAULT '[]',
    "image" VARCHAR(500),
    "popularity" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "tariff_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable: usages
CREATE TABLE "usages" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "data_usage" DOUBLE PRECISION NOT NULL,
    "call_minutes" DOUBLE PRECISION NOT NULL,
    "sms_count" DOUBLE PRECISION NOT NULL,
    "number_of_calls" INTEGER DEFAULT 0,
    "average_call_duration" DOUBLE PRECISION DEFAULT 0,
    "month" VARCHAR(7) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: recommendations
CREATE TABLE "recommendations" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "input_snapshot" TEXT DEFAULT '{}',
    "generated_by" VARCHAR(20) DEFAULT 'rule-based',
    "generated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: recommendation_plans
CREATE TABLE "recommendation_plans" (
    "id" SERIAL NOT NULL,
    "recommendation_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reasons" TEXT DEFAULT '[]',

    CONSTRAINT "recommendation_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable: feedbacks
CREATE TABLE "feedbacks" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "recommendation_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(1000) DEFAULT '',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- Create Indexes
CREATE UNIQUE INDEX "ix_users_email" ON "users"("email");
CREATE UNIQUE INDEX "ix_customer_profiles_user_id" ON "customer_profiles"("user_id");
CREATE INDEX "ix_tariff_plans_is_active" ON "tariff_plans"("is_active");
CREATE INDEX "ix_usages_customer_id" ON "usages"("customer_id");
CREATE INDEX "ix_recommendations_customer_id" ON "recommendations"("customer_id");
CREATE INDEX "ix_recommendation_plans_recommendation_id" ON "recommendation_plans"("recommendation_id");
CREATE INDEX "ix_feedbacks_customer_id" ON "feedbacks"("customer_id");

-- Add Foreign Keys
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_current_plan_id_fkey" FOREIGN KEY ("current_plan_id") REFERENCES "tariff_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "usages" ADD CONSTRAINT "usages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendation_plans" ADD CONSTRAINT "recommendation_plans_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendation_plans" ADD CONSTRAINT "recommendation_plans_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "tariff_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
