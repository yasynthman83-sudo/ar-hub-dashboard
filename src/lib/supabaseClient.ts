import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zzvnxzkvesiaunwuymxa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6dm54emt2ZXNpYXVud3V5bXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDYwMTIsImV4cCI6MjA4ODQ4MjAxMn0.i1-4JXjnDEEMWwEI05BK27WkxiFJbIINCtJeyn30LUQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
