ALTER TABLE "companies" ADD COLUMN "dcf_fair_value" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "margin_of_safety" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "dcf_implied_growth" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "nasdaq100_companies" ADD COLUMN "dcf_fair_value" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "nasdaq100_companies" ADD COLUMN "margin_of_safety" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "nasdaq100_companies" ADD COLUMN "dcf_implied_growth" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "dow_jones_companies" ADD COLUMN "dcf_fair_value" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "dow_jones_companies" ADD COLUMN "margin_of_safety" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "dow_jones_companies" ADD COLUMN "dcf_implied_growth" numeric(10, 4);