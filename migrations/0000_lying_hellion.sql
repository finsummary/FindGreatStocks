CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"market_cap" numeric(20, 2) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"daily_change" numeric(5, 2),
	"daily_change_percent" numeric(5, 2),
	"country" text NOT NULL,
	"country_code" text,
	"rank" integer NOT NULL,
	"logo_url" text,
	"industry" text,
	"sector" text,
	"website" text,
	"description" text,
	"ceo" text,
	"employees" integer,
	"pe_ratio" numeric(8, 2),
	"eps" numeric(8, 2),
	"beta" numeric(5, 3),
	"dividend_yield" numeric(8, 4),
	"price_to_sales_ratio" numeric(8, 2),
	"net_profit_margin" numeric(8, 4),
	"return_on_equity" numeric(8, 4),
	"return_on_assets" numeric(8, 4),
	"debt_to_equity" numeric(8, 4),
	"volume" numeric(20, 2),
	"avg_volume" numeric(20, 2),
	"day_low" numeric(10, 2),
	"day_high" numeric(10, 2),
	"year_low" numeric(10, 2),
	"year_high" numeric(10, 2),
	"revenue" numeric(20, 0),
	"gross_profit" numeric(20, 0),
	"operating_income" numeric(20, 0),
	"net_income" numeric(20, 0),
	"total_assets" numeric(20, 0),
	"total_debt" numeric(20, 0),
	"cash_and_equivalents" numeric(20, 0),
	"free_cash_flow" numeric(20, 0),
	"dcf_enterprise_value" numeric(20, 0),
	"margin_of_safety" numeric(10, 4),
	"dcf_implied_growth" numeric(10, 4),
	"return_3_year" numeric(8, 2),
	"return_5_year" numeric(8, 2),
	"return_10_year" numeric(8, 2),
	"max_drawdown_10_year" numeric(8, 2),
	"max_drawdown_5_year" numeric(8, 2),
	"max_drawdown_3_year" numeric(8, 2),
	"return_drawdown_ratio_10_year" numeric(8, 2),
	"ar_mdd_ratio_10_year" numeric(10, 4),
	"ar_mdd_ratio_5_year" numeric(10, 4),
	"ar_mdd_ratio_3_year" numeric(10, 4),
	CONSTRAINT "companies_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "dow_jones_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"market_cap" numeric(20, 2),
	"price" numeric(10, 2),
	"daily_change" numeric(10, 2),
	"daily_change_percent" numeric(5, 2),
	"country" text,
	"country_code" text,
	"rank" integer,
	"logo_url" text,
	"industry" text,
	"sector" text,
	"website" text,
	"description" text,
	"ceo" text,
	"employees" integer,
	"pe_ratio" numeric(10, 2),
	"eps" numeric(10, 2),
	"beta" numeric(8, 4),
	"dividend_yield" numeric(8, 4),
	"price_to_sales_ratio" numeric(10, 2),
	"net_profit_margin" numeric(8, 4),
	"volume" numeric(20, 0),
	"avg_volume" numeric(20, 0),
	"day_low" numeric(10, 2),
	"day_high" numeric(10, 2),
	"year_low" numeric(10, 2),
	"year_high" numeric(10, 2),
	"revenue" numeric(20, 0),
	"gross_profit" numeric(20, 0),
	"operating_income" numeric(20, 0),
	"net_income" numeric(20, 0),
	"total_assets" numeric(20, 0),
	"total_debt" numeric(20, 0),
	"cash_and_equivalents" numeric(20, 0),
	"free_cash_flow" numeric(20, 0),
	"dcf_enterprise_value" numeric(20, 0),
	"margin_of_safety" numeric(10, 4),
	"dcf_implied_growth" numeric(10, 4),
	"return_3_year" numeric(8, 2),
	"return_5_year" numeric(8, 2),
	"return_10_year" numeric(8, 2),
	"max_drawdown_10_year" numeric(8, 2),
	"max_drawdown_5_year" numeric(8, 2),
	"max_drawdown_3_year" numeric(8, 2),
	"ar_mdd_ratio_10_year" numeric(10, 4),
	"ar_mdd_ratio_5_year" numeric(10, 4),
	"ar_mdd_ratio_3_year" numeric(10, 4),
	CONSTRAINT "dow_jones_companies_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "nasdaq100_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"market_cap" numeric(20, 2) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"daily_change" numeric(5, 2),
	"daily_change_percent" numeric(5, 2),
	"country" text NOT NULL,
	"country_code" text,
	"rank" integer NOT NULL,
	"logo_url" text,
	"industry" text,
	"sector" text,
	"website" text,
	"description" text,
	"ceo" text,
	"employees" integer,
	"pe_ratio" numeric(8, 2),
	"eps" numeric(8, 2),
	"beta" numeric(5, 3),
	"dividend_yield" numeric(8, 4),
	"price_to_sales_ratio" numeric(8, 2),
	"net_profit_margin" numeric(8, 4),
	"return_on_equity" numeric(8, 4),
	"return_on_assets" numeric(8, 4),
	"debt_to_equity" numeric(8, 4),
	"volume" numeric(20, 2),
	"avg_volume" numeric(20, 2),
	"day_low" numeric(10, 2),
	"day_high" numeric(10, 2),
	"year_low" numeric(10, 2),
	"year_high" numeric(10, 2),
	"revenue" numeric(20, 0),
	"gross_profit" numeric(20, 0),
	"operating_income" numeric(20, 0),
	"net_income" numeric(20, 0),
	"total_assets" numeric(20, 0),
	"total_debt" numeric(20, 0),
	"cash_and_equivalents" numeric(20, 0),
	"free_cash_flow" numeric(20, 0),
	"dcf_enterprise_value" numeric(20, 0),
	"margin_of_safety" numeric(10, 4),
	"dcf_implied_growth" numeric(10, 4),
	"return_3_year" numeric(8, 2),
	"return_5_year" numeric(8, 2),
	"return_10_year" numeric(8, 2),
	"max_drawdown_10_year" numeric(8, 2),
	"max_drawdown_5_year" numeric(8, 2),
	"max_drawdown_3_year" numeric(8, 2),
	"return_drawdown_ratio_10_year" numeric(8, 2),
	"ar_mdd_ratio_10_year" numeric(10, 4),
	"ar_mdd_ratio_5_year" numeric(10, 4),
	"ar_mdd_ratio_3_year" numeric(10, 4),
	CONSTRAINT "nasdaq100_companies_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_symbol" text NOT NULL,
	"user_id" varchar NOT NULL,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");

ALTER TABLE "companies" ADD COLUMN "total_assets" numeric(20, 0);
ALTER TABLE "companies" ADD COLUMN "total_equity" numeric(20, 0);
ALTER TABLE "companies" ADD COLUMN "asset_turnover" numeric(10, 4);
ALTER TABLE "companies" ADD COLUMN "financial_leverage" numeric(10, 4);
ALTER TABLE "companies" ADD COLUMN "roe" numeric(10, 4);

ALTER TABLE "nasdaq100_companies" ADD COLUMN "total_assets" numeric(20, 0);
ALTER TABLE "nasdaq100_companies" ADD COLUMN "total_equity" numeric(20, 0);
ALTER TABLE "nasdaq100_companies" ADD COLUMN "asset_turnover" numeric(10, 4);
ALTER TABLE "nasdaq100_companies" ADD COLUMN "financial_leverage" numeric(10, 4);
ALTER TABLE "nasdaq100_companies" ADD COLUMN "roe" numeric(10, 4);

ALTER TABLE "dow_jones_companies" ADD COLUMN "total_assets" numeric(20, 0);
ALTER TABLE "dow_jones_companies" ADD COLUMN "total_equity" numeric(20, 0);
ALTER TABLE "dow_jones_companies" ADD COLUMN "asset_turnover" numeric(10, 4);
ALTER TABLE "dow_jones_companies" ADD COLUMN "financial_leverage" numeric(10, 4);
ALTER TABLE "dow_jones_companies" ADD COLUMN "roe" numeric(10, 4);