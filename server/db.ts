import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import * as schema from '@shared/schema';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// For compatibility with existing code, we'll create a mock db object
export const db = {
  select: () => ({
    from: (table: any) => ({
      where: (condition: any) => supabase.from(table).select('*').match(condition),
      limit: (count: number) => supabase.from(table).select('*').limit(count),
      orderBy: (column: any) => supabase.from(table).select('*').order(column),
    }),
  }),
  insert: (table: any) => ({
    values: (data: any) => supabase.from(table).insert(data),
  }),
  update: (table: any) => ({
    set: (data: any) => ({
      where: (condition: any) => supabase.from(table).update(data).match(condition),
    }),
  }),
  delete: (table: any) => ({
    where: (condition: any) => supabase.from(table).delete().match(condition),
  }),
};