import { db } from "./db";
import { companies } from "@shared/schema";
import { count } from "drizzle-orm";

async function verifyCount() {
  console.log("Verifying S&P 500 company count...");
  try {
    const result = await db.select({ value: count() }).from(companies);
    const companyCount = result[0].value;
    console.log(`✅ Found ${companyCount} companies in the S&P 500 table.`);
    if (companyCount >= 500) {
        console.log("🎉 Success! The company count is correct.");
    } else {
        console.error(`❌ Error: Expected around 503 companies, but found only ${companyCount}.`);
    }
  } catch (error) {
    console.error("❌ An error occurred while counting companies:", error);
  }
  process.exit(0);
}

verifyCount();
