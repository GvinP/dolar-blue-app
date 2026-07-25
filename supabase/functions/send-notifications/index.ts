import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const CODE_NAMES: Record<string, string> = {
  blue: "Dólar Blue",
  oficial: "Dólar Oficial",
  mep: "Dólar MEP",
  ccl: "Dólar CCL",
  tarjeta: "Dólar Tarjeta",
  cripto: "Dólar Cripto",
};

interface HistoryRow {
  sell: number | null;
  captured_at: string;
}

interface TokenRow {
  token: string;
  watch_code: string;
  threshold_pct: number;
}

interface Delta {
  curr: number;
  prev: number;
  delta: number;
  absDeltaPct: number;
}

// Cada token puede vigilar un código distinto con su propio umbral, así que
// calculamos el delta una sola vez por código (no por token).
async function computeDelta(code: string): Promise<Delta | null> {
  const { data: rows, error } = await supabase
    .from("quotes_history")
    .select("sell, captured_at")
    .eq("code", code)
    .not("sell", "is", null)
    .order("captured_at", { ascending: false })
    .limit(2);

  if (error) throw error;
  if (!rows || rows.length < 2) return null;

  const [current, previous] = rows as HistoryRow[];
  const curr = current.sell!;
  const prev = previous.sell!;
  if (prev === 0) return null;

  const delta = (curr - prev) / prev;
  return { curr, prev, delta, absDeltaPct: Math.abs(delta) * 100 };
}

Deno.serve(async (_req) => {
  try {
    // 1. Traemos todos los tokens activos con sus preferencias
    const { data: tokenRows, error: tokErr } = await supabase
      .from("push_tokens")
      .select("token, watch_code, threshold_pct")
      .eq("active", true);

    if (tokErr) throw tokErr;
    if (!tokenRows || tokenRows.length === 0) {
      return json({ ok: true, skipped: "no active tokens" });
    }

    // 2. Agrupamos por código vigilado para no recalcular el delta por token
    const tokensByCode = new Map<string, TokenRow[]>();
    for (const row of tokenRows as TokenRow[]) {
      const list = tokensByCode.get(row.watch_code) ?? [];
      list.push(row);
      tokensByCode.set(row.watch_code, list);
    }

    const messages: Array<{ to: string; title: string; body: string; sound: string }> = [];
    const deltaByCode: Record<string, string> = {};

    for (const [code, tokens] of tokensByCode) {
      const delta = await computeDelta(code);
      if (!delta) continue;

      const { curr, delta: rawDelta, absDeltaPct } = delta;
      deltaByCode[code] = `${(rawDelta * 100).toFixed(2)}%`;
      console.log(`${code}: Δ=${absDeltaPct.toFixed(2)}% (${tokens.length} tokens watching)`);

      const direction = rawDelta > 0 ? "▲" : "▼";
      const name = CODE_NAMES[code] ?? code;
      const title = `${name} ${direction} ${absDeltaPct.toFixed(1)}%`;
      const body = `Venta $${Math.round(curr)}`;

      for (const t of tokens) {
        if (absDeltaPct >= t.threshold_pct) {
          messages.push({ to: t.token, title, body, sound: "default" });
        }
      }
    }

    if (messages.length === 0) {
      return json({ ok: true, skipped: "no thresholds crossed", deltas: deltaByCode });
    }

    // 3. Expo Push API acepta lotes de hasta 100 mensajes
    const chunks: typeof messages[] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    let sent = 0;
    const errors: string[] = [];

    for (const chunk of chunks) {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(chunk),
      });

      if (!res.ok) {
        const txt = await res.text();
        errors.push(`HTTP ${res.status}: ${txt}`);
      } else {
        const result = await res.json();
        // Помечаем невалидные токены как неактивные
        const invalid = (result.data as Array<{ status: string; details?: { error?: string } }>)
          .map((r, i) => ({ ...r, token: chunk[i].to }))
          .filter(r => r.status === "error" && r.details?.error === "DeviceNotRegistered")
          .map(r => r.token);

        if (invalid.length > 0) {
          await supabase
            .from("push_tokens")
            .update({ active: false })
            .in("token", invalid);
          console.log(`Deactivated ${invalid.length} expired tokens`);
        }

        sent += chunk.length - invalid.length;
      }
    }

    console.log(`Sent notifications: ${sent}/${messages.length}, errors: ${errors.length}`);

    return json({
      ok: true,
      sent,
      total: messages.length,
      deltas: deltaByCode,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("send-notifications error:", err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
