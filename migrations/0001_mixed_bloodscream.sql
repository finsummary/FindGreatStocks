ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "watchlist" ALTER COLUMN "company_symbol" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "revenue_growth_3y" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "revenue_growth_5y" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "revenue_growth_10y" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "total_equity" numeric(20, 0);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "asset_turnover" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "financial_leverage" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "roe" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "dow_jones_companies" ADD COLUMN "return_drawdown_ratio_10_year" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "dow_jones_companies" ADD COLUMN "revenue_growth_3y" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "dow_jones_companies" ADD COLUMN "revenue_growth_5y" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "dow_jones_companies" ADD COLUMN "revenue_growth_10y" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "dow_jones_companies" ADD COLUMN "total_equity" numeric(20, 0);--> statement-breakpoint
ALTER TABLE "dow_jones_companies" ADD COLUMN "asset_turnover" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "dow_jones_companies" ADD COLUMN "financial_leverage" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "dow_jones_companies" ADD COLUMN "roe" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "nasdaq100_companies" ADD COLUMN "revenue_growth_3y" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "nasdaq100_companies" ADD COLUMN "revenue_growth_5y" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "nasdaq100_companies" ADD COLUMN "revenue_growth_10y" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "nasdaq100_companies" ADD COLUMN "total_equity" numeric(20, 0);--> statement-breakpoint
ALTER TABLE "nasdaq100_companies" ADD COLUMN "asset_turnover" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "nasdaq100_companies" ADD COLUMN "financial_leverage" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "nasdaq100_companies" ADD COLUMN "roe" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "watchlist" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "total_assets";--> statement-breakpoint
ALTER TABLE "dow_jones_companies" DROP COLUMN "total_assets";--> statement-breakpoint
ALTER TABLE "nasdaq100_companies" DROP COLUMN "total_assets";--> statement-breakpoint
ALTER TABLE "watchlist" DROP COLUMN "added_at";--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_company_unique" UNIQUE("user_id","company_symbol");