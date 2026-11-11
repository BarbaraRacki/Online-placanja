import { cfg, isConfigured, supabase, money, imageUrl, h, toast, placeholderFor } from "./common.js";
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from "./demo-data.js";

const $ = (s) => document.querySelector(s);
const CART_KEY = "shop_cart_v1";

let products = [];
let cats = [];
let catById = new Map();
let childrenOf = new Map();
let selected = "";          // "" = svi, "sale" = akcije, inače id kategorije
let cart = loadCart();

// ---------- Statični sadržaj iz config.js ----------
const name = cfg.shopName || "Trgovina";
document.title = `${name} — web trgovina`;
$("#shopName").textContent = name;
$("#heroTitle").textContent = cfg.heroTitle || name;
$("#heroText").textContent = cfg.heroText || "";
$("#footName").textContent = `© ${new Date().getFullYear()} ${name}`;
if (cfg.email) { $("#footMail").textContent = cfg.email; $("#footMail").href = `mailto:${cfg.email}`; } else $("#footMail").remove();
if (cfg.facebook) $("#footFb").href = cfg.facebook; else $("#footFb").remove();

const tel = (p) => "tel:+385" + p.replace(/\D/g, "").replace(/^0/, "");
$("#topstrip").replaceChildren(
  ...(cfg.locations || []).map((l) =>
    h("a", { href: tel(l.phone) }, h("span", { class: "muted-light" }, l.title.split(" ")[0] + " "), l.phone)),
  cfg.email ? h("a", { href: `mailto:${cfg.email}`, class: "hide-sm" }, cfg.email) : null
);
$("#locations").replaceChildren(
  ...(cfg.locations || []).map((l) =>
    h("article", { class: "loc" },
      h("h3", {}, l.title),
      h("p", { class: "muted small" }, l.company),
      h("p", {}, l.address),
      h("p", {}, h("a", { href: tel(l.phone) }, "☎ " + l.phone)),
      h("ul", { class: "hours" }, ...(l.hours || []).map((x) => h("li", {}, x))),
      h("a", { class: "btn small", target: "_blank", rel: "noopener",
        href: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(l.company + ", " + l.address) }, "Otvori kartu")))
);

async function init() {
  if (!isConfigured) {
    $("#demoBanner").hidden = false;
    cats = DEMO_CATEGORIES;
    products = DEMO_PRODUCTS;
  } else {
    const [c, p] = await Promise.all([
      supabase.from("categories").select("id,parent_id,name,slug,sort_order").order("sort_order"),
      supabase.from("products")
        .select("id,name,brand,description,price,old_price,image_path,category_id,sort_order,created_at")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
    ]);
    if (c.error || p.error) {
      console.error(c.error || p.error);
      $("#grid").replaceChildren(h("p", { class: "muted center" }, "Proizvode trenutno nije moguće učitati. Pokušajte ponovno kasnije."));
      return;
    }
    cats = c.data || [];
    products = p.data || [];
  }
  indexCats();
  $("#navSale").hidden = !products.some(onSale);
  syncCartWithProducts();
  fromHash(true);
  renderCart();
}

// ---------- Kategorije ----------
function indexCats() {
  catById = new Map(cats.map((c) => [c.id, c]));
  childrenOf = new Map();
  for (const c of cats) {
    const k = c.parent_id || "";
    if (!childrenOf.has(k)) childrenOf.set(k, []);
    childrenOf.get(k).push(c);
  }
  for (const list of childrenOf.values()) list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "hr"));
}
const kids = (id) => childrenOf.get(id || "") || [];
function subtree(id) {
  const out = new Set([id]);
  for (const k of kids(id)) for (const x of subtree(k.id)) out.add(x);
  return out;
}
const onSale = (p) => p.old_price != null && Number(p.old_price) > Number(p.price);
function countIn(id) {
  const ids = subtree(id);
  return products.filter((p) => ids.has(p.category_id)).length;
}
// Na pravoj stranici skrivamo prazne kategorije; u demo načinu prikazujemo sve.
const visibleCat = (c) => !isConfigured || countIn(c.id) > 0;

function renderCatNav() {
  const link = (id, label, count, extra = "") =>
    h("a", { href: id === "" ? "#katalog" : id === "sale" ? "#akcije" : `#k/${catById.get(id).slug}`,
      class: "cat-link " + extra + (selected === id ? " active" : "") },
      h("span", {}, label), count != null ? h("span", { class: "count" }, count) : null);

  const items = [link("", "Svi proizvodi", products.length)];
  if (products.some(onSale)) items.push(link("sale", "Akcije", products.filter(onSale).length, "sale"));

  for (const g of kids("")) {
    if (!visibleCat(g)) continue;
    const sub = kids(g.id).filter(visibleCat);
    if (!sub.length) { items.push(link(g.id, g.name, countIn(g.id))); continue; }
    const open = Boolean(selected && selected !== "sale" && subtree(g.id).has(selected));
    items.push(h("details", { class: "cat-group", open },
      h("summary", {}, h("span", {}, g.name), h("span", { class: "count" }, countIn(g.id))),
      link(g.id, "Sve iz grupe", null, "sub all"),
      ...sub.map((s) => link(s.id, s.name, countIn(s.id), "sub"))));
  }
  $("#catNav").replaceChildren(...items);
}

// ---------- Navigacija (hash) ----------
function fromHash(first = false) {
  const hsh = decodeURIComponent(location.hash.slice(1));
  if (hsh.startsWith("k/")) {
    const c = cats.find((x) => x.slug === hsh.slice(2));
    selected = c ? c.id : "";
  } else if (hsh === "akcije") selected = "sale";
  else if (hsh === "katalog" || hsh === "") selected = "";
  else if (!first) return; // npr. #kontakt — ostavi odabir kakav jest
  renderCatNav();
  render();
  openCats(false);
}
window.addEventListener("hashchange", () => {
  fromHash();
  const hsh = location.hash.slice(1);
  if (hsh.startsWith("k/") || hsh === "akcije") $("#katalog").scrollIntoView({ behavior: "smooth", block: "start" });
});

// ---------- Popis proizvoda ----------
$("#search").addEventListener("input", () => {
  if ($("#search").value && window.scrollY < $("#katalog").offsetTop - 200)
    $("#katalog").scrollIntoView({ behavior: "smooth" });
  render();
});
$("#sort").addEventListener("change", render);

function render() {
  const q = $("#search").value.trim().toLowerCase();
  let list = products;
  let title = "Svi proizvodi";
  const crumbs = [];

  if (selected === "sale") { list = list.filter(onSale); title = "Akcije"; }
  else if (selected) {
    const ids = subtree(selected);
    list = list.filter((p) => ids.has(p.category_id));
    const c = catById.get(selected);
    title = c.name;
    let x = c; while (x.parent_id) { x = catById.get(x.parent_id); crumbs.unshift(x); }
  }
  if (q) {
    list = list.filter((p) => [p.name, p.brand, p.description].join(" ").toLowerCase().includes(q));
    title = `Rezultati za „${$("#search").value.trim()}”`;
  }

  const s = $("#sort").value;
  if (s === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
  if (s === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
  if (s === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "hr"));

  $("#listTitle").textContent = title;
  $("#crumbs").replaceChildren(
    h("a", { href: "#katalog" }, "Katalog"),
    ...crumbs.flatMap((c) => [" / ", h("a", { href: `#k/${c.slug}` }, c.name)]));

  const sub = selected && selected !== "sale" ? kids(selected).filter(visibleCat) : [];
  $("#subcats").replaceChildren(...sub.map((c) => h("a", { class: "chip", href: `#k/${c.slug}` }, c.name)));

  const grid = $("#grid");
  if (!list.length) {
    grid.replaceChildren(h("div", { class: "empty" },
      h("p", {}, q ? "Nema proizvoda za ovu pretragu." : "U ovoj kategoriji još nema proizvoda."),
      h("p", { class: "muted small" }, "Za upit nas slobodno kontaktirajte."),
      h("a", { class: "btn small", href: "#kontakt" }, "Kontakt")));
    return;
  }
  grid.replaceChildren(...list.map(card));
}

function media(p, cls = "media") {
  const url = imageUrl(p.image_path);
  return h("div", { class: cls },
    url ? h("img", { src: url, alt: p.name, loading: "lazy" }) : placeholderFor(p.name),
    onSale(p) && cls === "media" ? h("span", { class: "sale-badge" }, "Akcija") : null);
}
function priceEl(p, big = false) {
  return h("div", { class: "price" + (big ? " lg" : "") },
    h("strong", {}, money(p.price)),
    onSale(p) ? h("s", { class: "muted" }, money(p.old_price)) : null);
}

function card(p) {
  return h("article", { class: "card" },
    h("button", { class: "card-open", onclick: () => openProduct(p), "aria-label": `Detalji: ${p.name}` },
      media(p),
      h("div", { class: "card-body" },
        p.brand ? h("div", { class: "brand-label" }, p.brand) : null,
        h("h3", {}, p.name))),
    h("div", { class: "card-foot" },
      priceEl(p),
      h("button", { class: "btn small primary", onclick: () => addToCart(p.id), "aria-label": `Dodaj ${p.name} u košaricu` }, "Dodaj")));
}

function openProduct(p) {
  const dlg = $("#productDlg");
  let qty = 1;
  const qtyEl = h("span", { class: "qty-num" }, "1");
  const c = catById.get(p.category_id);
  $("#productBody").replaceChildren(
    h("div", { class: "sheet-head" },
      h("span", { class: "muted small" }, c ? c.name : ""),
      h("button", { class: "icon-btn", onclick: () => dlg.close(), "aria-label": "Zatvori" }, "✕")),
    h("div", { class: "detail" },
      media(p, "media big"),
      h("div", { class: "detail-info" },
        p.brand ? h("div", { class: "brand-label" }, p.brand) : null,
        h("h2", {}, p.name),
        priceEl(p, true),
        h("p", { class: "muted small" }, "Cijena s PDV-om."),
        h("p", { class: "pre" }, p.description || ""),
        h("div", { class: "detail-actions" },
          h("div", { class: "qty" },
            h("button", { onclick: () => { qty = Math.max(1, qty - 1); qtyEl.textContent = qty; }, "aria-label": "Manje" }, "−"),
            qtyEl,
            h("button", { onclick: () => { qty = Math.min(99, qty + 1); qtyEl.textContent = qty; }, "aria-label": "Više" }, "+")),
          h("button", { class: "btn primary grow", onclick: () => { addToCart(p.id, qty); dlg.close(); } }, "Dodaj u košaricu"))))
  );
  dlg.showModal();
}

// ---------- Kategorije na mobitelu ----------
function openCats(open) {
  $("#sidebar").classList.toggle("open", open);
  $("#sidebarBg").hidden = !open;
  document.body.classList.toggle("noscroll", open);
}
$("#openCats").addEventListener("click", () => openCats(true));
$("#closeCats").addEventListener("click", () => openCats(false));
$("#sidebarBg").addEventListener("click", () => openCats(false));

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
  saveCart(); renderCart();
  toast("Dodano u košaricu");
  const b = $("#cartBtn"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
}
function setQty(id, q) {
  if (q <= 0) delete cart[id]; else cart[id] = Math.min(99, q);
  saveCart(); renderCart();
}
function totals() {
  const subtotal = Object.entries(cart).reduce((s, [id, q]) => s + (byId(id)?.price || 0) * q, 0);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const shipping = count ? Number(cfg.shippingFlat || 0) : 0;
  return { subtotal, shipping, total: subtotal + shipping, count };
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
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { openDrawer(false); openCats(false); } });

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
  const fields = [...form.querySelectorAll("input[required]")];
  fields.forEach((i) => i.classList.toggle("invalid", !i.checkValidity()));
  const bad = fields.find((i) => !i.checkValidity());
  if (bad) { bad.focus(); toast("Ispunite označena polja.", "warn"); return; }

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

document.querySelectorAll("dialog").forEach((d) => {
  d.addEventListener("click", (e) => {
    if (e.target === d || e.target.closest("[data-close]")) d.close();
  });
});

init();
