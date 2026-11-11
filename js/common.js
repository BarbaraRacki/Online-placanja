export const cfg = window.SHOP_CONFIG || {};
export const isConfigured = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
export const BUCKET = "product-images";

// Supabase biblioteka se učitava samo kad je baza povezana.
const createClient = isConfigured
  ? (await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm")).createClient
  : null;

export const supabase = isConfigured
  ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    })
  : null;

const fmt = new Intl.NumberFormat(cfg.locale || "hr-HR", {
  style: "currency",
  currency: cfg.currency || "EUR"
});
export const money = (n) => fmt.format(Number(n) || 0);

export function imageUrl(path) {
  if (!path || !supabase) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Siguran DOM helper — tekst se uvijek postavlja kao textContent (nema XSS-a).
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function toast(msg, type = "") {
  let box = document.getElementById("toast");
  if (!box) {
    box = h("div", { id: "toast", role: "status", "aria-live": "polite" });
  }
  // Ako je otvoren dijalog, toast mora biti u njemu da bude vidljiv iznad njega.
  const host = [...document.querySelectorAll("dialog[open]")].pop() || document.body;
  if (box.parentNode !== host) host.append(box);
  box.textContent = msg;
  box.className = "show " + type;
  clearTimeout(box._t);
  box._t = setTimeout(() => (box.className = ""), 3200);
}

export function placeholderFor(name = "") {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return h("div", { class: "ph", style: `--hue:${hue}` }, (name.trim()[0] || "?").toUpperCase());
}
