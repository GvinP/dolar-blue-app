import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Debe coincidir con QUOTE_CODE_LIST en src/types.ts
const ALLOWED_CODES = new Set(["blue", "oficial", "mep", "ccl", "tarjeta", "cripto"]);

interface RegisterBody {
  token?: unknown;
  watch_code?: unknown;
  threshold_pct?: unknown;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  let body: RegisterBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const { token, watch_code, threshold_pct } = body;

  if (typeof token !== "string" || token.length === 0 || token.length > 200) {
    return json({ error: "invalid token" }, 400);
  }
  if (typeof watch_code !== "string" || !ALLOWED_CODES.has(watch_code)) {
    return json({ error: "invalid watch_code" }, 400);
  }
  if (typeof threshold_pct !== "number" || !Number.isFinite(threshold_pct) || threshold_pct <= 0 || threshold_pct > 100) {
    return json({ error: "invalid threshold_pct" }, 400);
  }

  // Reactiva el token por si había sido marcado inactivo (DeviceNotRegistered) y el usuario reinstaló/reabrió la app
  const { error } = await supabase
    .from("push_tokens")
    .upsert(
      { token, watch_code, threshold_pct, active: true },
      { onConflict: "token" },
    );

  if (error) {
    console.error("register-push-token: upsert failed:", error);
    return json({ error: "failed to save token" }, 500);
  }

  return json({ ok: true });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
