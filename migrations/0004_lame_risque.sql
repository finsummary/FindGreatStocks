ALTER TABLE "companies" DROP COLUMN IF EXISTS "dcf_fair_value";--> statement-breakpoint
ALTER TABLE "dow_jones_companies" DROP COLUMN IF EXISTS "dcf_fair_value";--> statement-breakpoint
ALTER TABLE "nasdaq100_companies" DROP COLUMN IF EXISTS "dcf_fair_value";--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "dcf_enterprise_value" numeric(20, 0);--> statement-breakpoint
ALTER TABLE "dow_jones_companies" ADD COLUMN "dcf_enterprise_value" numeric(20, 0);--> statement-breakpoint
ALTER TABLE "nasdaq100_companies" ADD COLUMN "dcf_enterprise_value" numeric(20, 0);