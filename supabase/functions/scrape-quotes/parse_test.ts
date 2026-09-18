// deno test supabase/functions/scrape-quotes/parse_test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  inferCode,
  isPlausiblePct,
  isPlausibleRate,
  parseNum,
  pickSingleValueField,
} from "./parse.ts";

Deno.test("parseNum: новый формат dolarhoy (es-AR, точка = тысячи)", () => {
  // Реальные значения со страницы на момент поломки 2026-09-18
  assertEquals(parseNum("$1.530"), 1530);
  assertEquals(parseNum("$1.550"), 1550);
  assertEquals(parseNum("$1.485"), 1485);
  assertEquals(parseNum("$1.530,20"), 1530.2);
  assertEquals(parseNum("$1.540,10"), 1540.1);
  assertEquals(parseNum("$1.589,31"), 1589.31);
  assertEquals(parseNum("$1.596,50"), 1596.5);
  assertEquals(parseNum("$1.995,50"), 1995.5);
});

Deno.test("parseNum: старый формат без разделителя тысяч", () => {
  assertEquals(parseNum("1530,20"), 1530.2);
  assertEquals(parseNum("$1535"), 1535);
  assertEquals(parseNum("995,50"), 995.5);
});

Deno.test("parseNum: проценты остаются десятичными", () => {
  // Точка здесь десятичная — после неё не 3 цифры
  assertEquals(parseNum("-0.33%"), -0.33);
  assertEquals(parseNum("0.12%"), 0.12);
  assertEquals(parseNum("-0.07%"), -0.07);
  assertEquals(parseNum("0.00%"), 0);
  assertEquals(parseNum("0,30%"), 0.3);
});

Deno.test("parseNum: en-US на всякий случай", () => {
  assertEquals(parseNum("1,530.20"), 1530.2);
});

Deno.test("parseNum: мусор", () => {
  assertEquals(parseNum(undefined), null);
  assertEquals(parseNum(""), null);
  assertEquals(parseNum("Compra"), null);
  assertEquals(parseNum("$"), null);
});

Deno.test("isPlausibleRate ловит поломку 2026-09-18", () => {
  // Ровно то, что уехало в базу: 1530 распарсилось как 1.53
  assertEquals(isPlausibleRate(1.53), false);
  assertEquals(isPlausibleRate(1.995), false);
  assertEquals(isPlausibleRate(0), false);
  assertEquals(isPlausibleRate(1530), true);
  assertEquals(isPlausibleRate(1995.5), true);
  assertEquals(isPlausibleRate(null), true); // нет данных — не поломка
});

Deno.test("isPlausiblePct", () => {
  assertEquals(isPlausiblePct(-0.33), true);
  assertEquals(isPlausiblePct(0), true);
  assertEquals(isPlausiblePct(null), true);
  assertEquals(isPlausiblePct(1530), false);
});

Deno.test("inferCode: заголовки плиток dolarhoy", () => {
  assertEquals(inferCode("DÓLAR BLUE")?.code, "blue");
  assertEquals(inferCode("DÓLAR OFICIAL")?.code, "oficial");
  assertEquals(inferCode("DÓLAR MEP")?.code, "mep");
  assertEquals(inferCode("CONTADO CON LIQUI")?.code, "ccl");
  assertEquals(inferCode("DÓLAR DIGITAL (USDC)")?.code, "cripto");
  assertEquals(inferCode("DÓLAR TARJETA")?.code, "tarjeta");
  assertEquals(inferCode("Dólar Mayorista")?.code, "mayorista");
  assertEquals(inferCode("Won"), null);
});

Deno.test("pickSingleValueField: плитка с одной ценой", () => {
  // tarjeta: на сайте единственная цена подписана «Venta»
  assertEquals(pickSingleValueField("DÓLAR TARJETA Venta $1.995,50"), "venta");
  assertEquals(pickSingleValueField("DÓLAR TARJETA VENTA $1.995,50"), "venta");
  // Обе подписи или ни одной — прежнее поведение
  assertEquals(pickSingleValueField("DÓLAR BLUE Compra $1.530 Venta $1.550"), "compra");
  assertEquals(pickSingleValueField("DÓLAR OFICIAL Compra $1.485"), "compra");
  assertEquals(pickSingleValueField("DÓLAR MAYORISTA $1.485"), "compra");
});
