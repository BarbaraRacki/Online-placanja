import { cfg, isConfigured, supabase, money, imageUrl, h, toast, placeholderFor } from "./common.js";

const $ = (s) => document.querySelector(s);
const CART_KEY = "shop_cart_v1";

const DEMO = [
  { id: "d1", name: "Keramička šalica", description: "Ručno glazirana šalica, 350 ml. Svaka je malo drukčija.", price: 18.5, sort_order: 1 },
  { id: "d2", name: "Lanena krpa", description: "100 % lan, 50 × 70 cm. Mekša nakon svakog pranja.", price: 12, sort_order: 2 },
  { id: "d3", name: "Svijeća od sojinog voska", description: "Miris smokve i cedra, gori oko 40 sati.", price: 22.9, sort_order: 3 },
  { id: "d4", name: "Drvena daska za rezanje", description: "Hrastovina, nauljena prirodnim uljem.", price: 34, sort_order: 4 },
  { id: "d5", name: "Platnena torba", description: "Debelo pamučno platno s unutarnjim džepom.", price: 15, sort_order: 5 },
  { id: "d6", name: "Set od 4 podmetača", description: "Pluto i filc, otporni na toplinu.", price: 16.4, sort_order: 6 }
];

let products = [];
let cart = loadCart();

// ---------- Init ----------
document.title = cfg.shopName || "Trgovina";
$("#shopName").textContent = cfg.shopName || "Trgovina";
$("#tagline").textContent = cfg.tagline || "";
$("#footName").textContent = `© ${new Date().getFullYear()} ${cfg.shopName || ""}`;

init();

async function init() {
  if (!isConfigured) {
    $("#demoBanner").hidden = false;
    products = DEMO;
  } else {
    const { data, error } = await supabase
      .from("products")
      .select("id,name,description,price,image_path,sort_order,created_at")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      $("#grid").replaceChildren(h("p", { class: "muted center" }, "Proizvode trenutno nije moguće učitati. Pokušaj ponovno kasnije."));
      console.error(error);
      return;
    }
    products = data || [];
  }
  syncCartWithProducts();
  render();
  renderCart();
}

// ---------- Katalog ----------
$("#search").addEventListener("input", render);
$("#sort").addEventListener("change", render);

function render() {
  const q = $("#search").value.trim().toLowerCase();
  let list = products.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q)
  );
  const s = $("#sort").value;
  if (s === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
  if (s === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
  if (s === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "hr"));

  const grid = $("#grid");
  if (!list.length) {
    grid.replaceChildren(h("p", { class: "muted center" }, products.length ? "Nema rezultata." : "Trgovina je još prazna."));
    return;
  }
  grid.replaceChildren(...list.map(card));
}

function media(p, cls = "media") {
  const url = imageUrl(p.image_path);
  return h("div", { class: cls },
    url ? h("img", { src: url, alt: p.name, loading: "lazy" }) : placeholderFor(p.name));
}

function card(p) {
  return h("article", { class: "card" },
    h("button", { class: "card-open", onclick: () => openProduct(p), "aria-label": `Detalji: ${p.name}` },
      media(p),
      h("div", { class: "card-body" },
        h("h3", {}, p.name),
        h("p", { class: "muted small clamp" }, p.description || ""))),
    h("div", { class: "card-foot" },
      h("strong", {}, money(p.price)),
      h("button", { class: "btn small", onclick: () => addToCart(p.id) }, "Dodaj")));
}

function openProduct(p) {
  const dlg = $("#productDlg");
  let qty = 1;
  const qtyEl = h("span", { class: "qty-num" }, "1");
  $("#productBody").replaceChildren(
    h("div", { class: "sheet-head" },
      h("span"),
      h("button", { class: "icon-btn", onclick: () => dlg.close(), "aria-label": "Zatvori" }, "✕")),
    media(p, "media big"),
    h("h2", {}, p.name),
    h("p", { class: "price-lg" }, money(p.price)),
    h("p", { class: "pre muted" }, p.description || ""),
    h("div", { class: "detail-actions" },
      h("div", { class: "qty" },
        h("button", { onclick: () => { qty = Math.max(1, qty - 1); qtyEl.textContent = qty; }, "aria-label": "Manje" }, "−"),
        qtyEl,
        h("button", { onclick: () => { qty = Math.min(99, qty + 1); qtyEl.textContent = qty; }, "aria-label": "Više" }, "+")),
      h("button", { class: "btn primary grow", onclick: () => { addToCart(p.id, qty); dlg.close(); } }, "Dodaj u košaricu")));
  dlg.showModal();
}

// ---------- Košarica ----------
function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch { return {}; }
}
function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
}
function syncCartWithProducts() {
  const ids = new Set(products.map((p) => p.id));
  let removed = false;
  for (const id of Object.keys(cart)) if (!ids.has(id)) { delete cart[id]; removed = true; }
  if (removed) { saveCart(); toast("Neki proizvodi više nisu dostupni pa su maknuti iz košarice."); }
}
const byId = (id) => products.find((p) => p.id === id);

function addToCart(id, n = 1) {
  cart[id] = Math.min(99, (cart[id] || 0) + n);
  saveCart();
  renderCart();
  toast("Dodano u košaricu");
  bump();
}
function setQty(id, q) {
  if (q <= 0) delete cart[id]; else cart[id] = Math.min(99, q);
  saveCart();
  renderCart();
}
function totals() {
  const subtotal = Object.entries(cart).reduce((s, [id, q]) => s + (byId(id)?.price || 0) * q, 0);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const shipping = count ? Number(cfg.shippingFlat || 0) : 0;
  return { subtotal, shipping, total: subtotal + shipping, count };
}
function bump() {
  const b = $("#cartBtn");
  b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
}

function renderCart() {
  const { subtotal, shipping, total, count } = totals();
  const badge = $("#cartCount");
  badge.textContent = count; badge.hidden = !count;

  const items = Object.entries(cart).map(([id, q]) => {
    const p = byId(id);
    if (!p) return null;
    return h("div", { class: "cart-row" },
      media(p, "thumb"),
      h("div", { class: "grow" },
        h("div", { class: "cart-name" }, p.name),
        h("div", { class: "muted small" }, money(p.price)),
        h("div", { class: "qty sm" },
          h("button", { onclick: () => setQty(id, q - 1), "aria-label": "Manje" }, "−"),
          h("span", { class: "qty-num" }, q),
          h("button", { onclick: () => setQty(id, q + 1), "aria-label": "Više" }, "+"))),
      h("div", { class: "right" },
        h("strong", {}, money(p.price * q)),
        h("button", { class: "link danger small", onclick: () => setQty(id, 0) }, "Ukloni")));
  }).filter(Boolean);

  $("#cartItems").replaceChildren(...(items.length ? items : [h("p", { class: "muted center pad" }, "Košarica je prazna.")]));
  $("#subtotal").textContent = money(subtotal);
  $("#shipping").textContent = shipping ? money(shipping) : "Besplatno";
  $("#total").textContent = money(total);
  $("#checkoutBtn").disabled = !count;
}

function openDrawer(open) {
  $("#drawer").classList.toggle("open", open);
  $("#drawer").setAttribute("aria-hidden", String(!open));
  $("#drawerBg").hidden = !open;
  document.body.classList.toggle("noscroll", open);
}
$("#cartBtn").addEventListener("click", () => openDrawer(true));
$("#closeCart").addEventListener("click", () => openDrawer(false));
$("#drawerBg").addEventListener("click", () => openDrawer(false));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") openDrawer(false); });

// ---------- Blagajna (demo) ----------
$("#checkoutBtn").addEventListener("click", () => {
  openDrawer(false);
  const { shipping, total } = totals();
  $("#checkoutSummary").replaceChildren(
    ...Object.entries(cart).map(([id, q]) => {
      const p = byId(id);
      return h("div", { class: "row small" }, h("span", {}, `${q} × ${p.name}`), h("span", {}, money(p.price * q)));
    }),
    h("div", { class: "row small muted" }, h("span", {}, "Dostava"), h("span", {}, shipping ? money(shipping) : "Besplatno")),
    h("div", { class: "row total" }, h("span", {}, "Ukupno"), h("strong", {}, money(total))));
  $("#checkoutDlg").showModal();
});

$("#checkoutForm").addEventListener("change", (e) => {
  if (e.target.name === "pay") $("#cardMock").hidden = e.target.value !== "card";
});

$("#checkoutForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const bad = [...form.querySelectorAll("input[required]")].find((i) => !i.checkValidity());
  form.querySelectorAll("input").forEach((i) => i.classList.toggle("invalid", i.required && !i.checkValidity()));
  if (bad) { bad.focus(); toast("Ispuni označena polja.", "warn"); return; }

  const fd = new FormData(form);
  const { total } = totals();
  const orderNo = "N" + Date.now().toString(36).toUpperCase().slice(-6);
  $("#doneText").textContent =
    `Broj narudžbe: ${orderNo}. Iznos: ${money(total)}. Potvrda bi stigla na ${fd.get("email")}. (Demo — ništa nije naplaćeno.)`;
  cart = {}; saveCart(); renderCart();
  form.reset(); $("#cardMock").hidden = false;
  $("#checkoutDlg").close();
  $("#doneDlg").showModal();
});

// Zatvaranje dijaloga
document.querySelectorAll("dialog").forEach((d) => {
  d.addEventListener("click", (e) => {
    if (e.target === d || e.target.closest("[data-close]")) d.close();
  });
});
