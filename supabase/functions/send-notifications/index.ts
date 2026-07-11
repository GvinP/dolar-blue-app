import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Порог изменения курса (2%) — если больше, шлём уведомление
const CHANGE_THRESHOLD = 0.02;

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface HistoryRow {
  sell: number | null;
  captured_at: string;
}

Deno.serve(async (_req) => {
  try {
    // 1. Берём два последних значения blue из истории
    const { data: rows, error: histErr } = await supabase
      .from("quotes_history")
      .select("sell, captured_at")
      .eq("code", "blue")
      .not("sell", "is", null)
      .order("captured_at", { ascending: false })
      .limit(2);

    if (histErr) throw histErr;
    if (!rows || rows.length < 2) {
      return json({ ok: true, skipped: "not enough history" });
    }

    const [current, previous] = rows as HistoryRow[];
    const curr = current.sell!;
    const prev = previous.sell!;

    if (prev === 0) return json({ ok: true, skipped: "prev sell is zero" });

    const delta = (curr - prev) / prev;
    const absDelta = Math.abs(delta);

    console.log(`Blue sell: ${prev} → ${curr}, Δ=${(delta * 100).toFixed(2)}%`);

    if (absDelta < CHANGE_THRESHOLD) {
      return json({ ok: true, skipped: `delta ${(absDelta * 100).toFixed(2)}% below threshold` });
    }

    // 2. Получаем все активные токены
    const { data: tokenRows, error: tokErr } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("active", true);

    if (tokErr) throw tokErr;
    if (!tokenRows || tokenRows.length === 0) {
      return json({ ok: true, skipped: "no active tokens" });
    }

    const direction = delta > 0 ? "▲" : "▼";
    const pct = (absDelta * 100).toFixed(1);
    const title = `Dólar Blue ${direction} ${pct}%`;
    const body = `Venta $${Math.round(curr)}`;

    // 3. Expo Push API принимает батчи до 100 токенов
    const tokens = tokenRows.map((r: { token: string }) => r.token);
    const messages = tokens.map((to: string) => ({ to, title, body, sound: "default" }));

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

    console.log(`Sent notifications: ${sent}/${tokens.length}, errors: ${errors.length}`);

    return json({
      ok: true,
      sent,
      total: tokens.length,
      delta: `${(delta * 100).toFixed(2)}%`,
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
