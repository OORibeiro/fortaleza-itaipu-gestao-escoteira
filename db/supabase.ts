import { env } from "cloudflare:workers";
import { createClient } from "@supabase/supabase-js";

function getEnvValue(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const cloudflareValue = env[name];
  const nodeValue = typeof process !== "undefined" ? process.env[name] : undefined;
  const value = cloudflareValue || nodeValue;

  if (!value) {
    throw new Error(`Variável de ambiente ${name} não configurada.`);
  }

  return value;
}

export function getSupabaseAdmin() {
  return createClient(
    getEnvValue("SUPABASE_URL"),
    getEnvValue("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
