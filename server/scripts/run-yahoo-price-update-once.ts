/**
 * One-shot: update all table prices from Yahoo. Usage: npx tsx server/scripts/run-yahoo-price-update-once.ts
 */
import { runYahooBulkPriceUpdate } from "../yahoo-price-update";
import { supabase } from "../db";

runYahooBulkPriceUpdate(supabase)
  .then((r) => {
    console.log("Done:", r);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
