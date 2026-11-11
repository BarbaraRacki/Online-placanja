import { isConfigured, supabase, money, imageUrl, h, toast, placeholderFor, BUCKET } from "./common.js";

const $ = (s) => document.querySelector(s);
const show = (id) => ["#setupView", "#loginView", "#manageView"].forEach((v) => ($(v).hidden = v !== id));

let products = [];
let cats = [];
let editing = null;      // proizvod koji se uređuje (ili null za novi)
let newImage = null;     // Blob nove slike
let removeImage = false;

if (!isConfigured) {
  show("#setupView");
} else {
  supabase.auth.onAuthStateChange((_e, session) => route(session));
  supabase.auth.getSession().then(({ data }) => route(data.session));
}

let routed = null;
async function route(session) {
  const key = session?.user?.id || "none";
  if (routed === key) return;
  routed = key;

  if (!session) {
    $("#who").textContent = "";
    $("#logoutBtn").hidden = true;
    show("#loginView");
    return;
  }
  const { data: ok, error } = await supabase.rpc("is_admin");
  if (error || !ok) {
    await supabase.auth.signOut();
    toast("Ovaj račun nema administratorski pristup.", "warn");
    return;
  }
  $("#who").textContent = session.user.email;
  $("#logoutBtn").hidden = false;
  show("#manageView");
  await loadCats();
  load();
}

// ---------- Prijava / odjava ----------
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const btn = e.currentTarget.querySelector("button");
  btn.disabled = true;
  const { error } = await supabase.auth.signInWithPassword({
    email: String(fd.get("email")).trim(),
    password: String(fd.get("password"))
  });
  btn.disabled = false;
  if (error) toast("Prijava nije uspjela. Provjeri email i lozinku.", "warn");
});
$("#logoutBtn").addEventListener("click", () => supabase.auth.signOut());

// ---------- Kartice ----------
document.querySelectorAll(".tabs button").forEach((b) =>
  b.addEventListener("click", () => {
    document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("active", x === b));
    ["productsTab", "catsTab"].forEach((id) => ($("#" + id).hidden = id !== b.dataset.tab));
  }));

// ---------- Kategorije ----------
const groups = () => cats.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
const subsOf = (id) => cats.filter((c) => c.parent_id === id).sort((a, b) => a.sort_order - b.sort_order);
const catName = (id) => {
  const c = cats.find((x) => x.id === id);
  if (!c) return "Bez kategorije";
  const p = c.parent_id && cats.find((x) => x.id === c.parent_id);
  return p ? `${p.name} › ${c.name}` : c.name;
};

async function loadCats() {
  const { data, error } = await supabase.from("categories").select("*").order("sort_order");
  if (error) { toast("Greška pri učitavanju kategorija: " + error.message, "warn"); return; }
  cats = data || [];
  fillCatSelects();
  renderCats();
}

function catOptions(includeAll) {
  const out = [];
  if (includeAll) out.push(h("option", { value: "" }, "Sve kategorije"), h("option", { value: "none" }, "Bez kategorije"));
  else out.push(h("option", { value: "" }, "— bez kategorije —"));
  for (const g of groups()) {
    const subs = subsOf(g.id);
    if (!subs.length) { out.push(h("option", { value: g.id }, g.name)); continue; }
    out.push(h("optgroup", { label: g.name },
      h("option", { value: g.id }, `${g.name} (općenito)`),
      ...subs.map((s) => h("option", { value: s.id }, s.name))));
  }
  return out;
}
function fillCatSelects() {
  const f = $("#catFilter").value;
  $("#catFilter").replaceChildren(...catOptions(true));
  $("#catFilter").value = f;
  $("#editCat").replaceChildren(...catOptions(false));
  $("#catParent").replaceChildren(
    h("option", { value: "" }, "Nova glavna grupa"),
    ...groups().map((g) => h("option", { value: g.id }, "Unutar: " + g.name)));
}

function slugify(s) {
  return s.toLowerCase()
    .replace(/[čć]/g, "c").replace(/đ/g, "d").replace(/š/g, "s").replace(/ž/g, "z")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "kategorija";
}

function renderCats() {
  const count = (id) => products.filter((p) => p.category_id === id).length;
  const row = (c, sub) =>
    h("div", { class: "cat-admin-row" + (sub ? " sub" : "") },
      h("span", { class: "grow" }, sub ? c.name : h("strong", {}, c.name)),
      h("span", { class: "muted small" }, String(count(c.id))),
      h("button", { class: "link small", onclick: () => renameCat(c) }, "Preimenuj"),
      h("button", { class: "link danger small", onclick: () => deleteCat(c) }, "Obriši"));
  $("#catList").replaceChildren(...groups().map((g) =>
    h("div", { class: "cat-admin-group" }, row(g, false), ...subsOf(g.id).map((s) => row(s, true)))));
}

$("#catForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const name = f.elements.name.value.trim();
  if (!name) return;
  const parent_id = f.elements.parent_id.value || null;
  const siblings = cats.filter((c) => (c.parent_id || null) === parent_id);
  let slug = slugify(name), n = 2;
  while (cats.some((c) => c.slug === slug)) slug = `${slugify(name)}-${n++}`;
  const sort_order = Math.max(0, ...siblings.map((c) => c.sort_order)) + 10;
  const { error } = await supabase.from("categories").insert({ name, slug, parent_id, sort_order });
  if (error) { toast("Dodavanje nije uspjelo: " + error.message, "warn"); return; }
  f.reset();
  toast("Kategorija dodana ✓");
  loadCats();
});

async function renameCat(c) {
  const name = prompt("Novi naziv kategorije:", c.name);
  if (!name || !name.trim() || name.trim() === c.name) return;
  const { error } = await supabase.from("categories").update({ name: name.trim() }).eq("id", c.id);
  if (error) { toast("Greška: " + error.message, "warn"); return; }
  loadCats();
}
async function deleteCat(c) {
  const subs = subsOf(c.id).length;
  if (!confirm(`Obrisati kategoriju „${c.name}”${subs ? ` i njenih ${subs} podkategorija` : ""}? Proizvodi ostaju, ali bez kategorije.`)) return;
  const { error } = await supabase.from("categories").delete().eq("id", c.id);
  if (error) { toast("Greška: " + error.message, "warn"); return; }
  await loadCats();
  load();
}

// ---------- Proizvodi ----------
async function load() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) { toast("Greška pri učitavanju: " + error.message, "warn"); return; }
  products = data || [];
  $("#brandList").replaceChildren(...[...new Set(["STIHL", ...products.map((p) => p.brand).filter(Boolean)])].map((b) => h("option", { value: b })));
  render();
  renderCats();
}

$("#search").addEventListener("input", render);
$("#catFilter").addEventListener("change", render);

function render() {
  const q = $("#search").value.trim().toLowerCase();
  const cf = $("#catFilter").value;
  const inCat = (p) => {
    if (!cf) return true;
    if (cf === "none") return !p.category_id;
    return p.category_id === cf || subsOf(cf).some((s) => s.id === p.category_id);
  };
  const list = products.filter((p) => inCat(p) && (!q || (p.name + " " + p.brand).toLowerCase().includes(q)));
  const hidden = products.filter((p) => !p.active).length;
  $("#stats").textContent = `${products.length} proizvoda` + (hidden ? ` · ${hidden} skrivenih` : "") + (list.length !== products.length ? ` · prikazano ${list.length}` : "");
  $("#list").replaceChildren(
    ...(list.length
      ? list.map((p) =>
          h("button", { class: "admin-row" + (p.active ? "" : " off"), onclick: () => openEdit(p) },
            h("div", { class: "thumb" }, p.image_path ? h("img", { src: imageUrl(p.image_path), alt: "" }) : placeholderFor(p.name)),
            h("div", { class: "grow" },
              h("div", { class: "cart-name" }, p.name),
              h("div", { class: "muted small" }, [catName(p.category_id), p.active ? null : "Skriven"].filter(Boolean).join(" · "))),
            h("div", { class: "right" },
              h("strong", {}, money(p.price)),
              p.old_price && Number(p.old_price) > Number(p.price) ? h("span", { class: "small", style: "color:var(--accent-dark)" }, "Akcija") : null)))
      : [h("p", { class: "muted center pad" }, products.length ? "Nema rezultata." : "Još nema proizvoda. Dodaj prvi!")])
  );
}

// ---------- Uređivanje ----------
$("#newBtn").addEventListener("click", () => openEdit(null));

function setPreview(src, name) {
  $("#imgPreview").replaceChildren(src ? h("img", { src, alt: "" }) : placeholderFor(name || "?"));
  $("#imgRemove").hidden = !src;
}
const fmtNum = (n) => (n == null ? "" : String(n).replace(".", ","));
const parseNum = (s) => Number(String(s).replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));

function openEdit(p) {
  editing = p; newImage = null; removeImage = false;
  const f = $("#editForm");
  const el = f.elements;
  f.reset();
  f.querySelectorAll(".invalid").forEach((i) => i.classList.remove("invalid"));
  $("#editTitle").textContent = p ? "Uredi proizvod" : "Novi proizvod";
  el.name.value = p?.name || "";
  el.brand.value = p?.brand || "";
  el.category_id.value = p?.category_id || ($("#catFilter").value !== "none" ? $("#catFilter").value : "") || "";
  el.price.value = fmtNum(p?.price);
  el.old_price.value = fmtNum(p?.old_price);
  el.description.value = p?.description || "";
  el.sort_order.value = p?.sort_order ?? 0;
  el.active.checked = p ? p.active : true;
  $("#deleteBtn").hidden = !p;
  setPreview(p?.image_path ? imageUrl(p.image_path) : null, p?.name);
  $("#editDlg").showModal();
}

$("#imgInput").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) { toast("Odaberi sliku.", "warn"); return; }
  try {
    newImage = await resizeImage(file, 1600, 0.85);
    removeImage = false;
    setPreview(URL.createObjectURL(newImage));
  } catch {
    toast("Sliku nije moguće obraditi.", "warn");
  }
});

$("#imgRemove").addEventListener("click", () => {
  newImage = null; removeImage = true;
  setPreview(null, $("#editForm").elements.name.value);
});

// Smanji sliku prije slanja (brže učitavanje, manje prostora). Prozirnost (PNG) se čuva.
async function resizeImage(file, max, quality) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, "image/webp", quality));
  if (blob && blob.type === "image/webp") return blob;
  return await new Promise((r) => c.toBlob(r, file.type === "image/png" ? "image/png" : "image/jpeg", quality));
}

$("#editForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const el = e.currentTarget.elements;
  const name = el.name.value.trim();
  const price = parseNum(el.price.value);
  const oldRaw = el.old_price.value.trim();
  const old_price = oldRaw ? parseNum(oldRaw) : null;
  const priceOk = el.price.value.trim() !== "" && price >= 0;
  const oldOk = old_price === null || old_price >= 0;
  el.name.classList.toggle("invalid", !name);
  el.price.classList.toggle("invalid", !priceOk);
  el.old_price.classList.toggle("invalid", !oldOk);
  if (!name || !priceOk || !oldOk) { toast("Upiši naziv i ispravnu cijenu.", "warn"); return; }

  const btn = $("#saveBtn");
  btn.disabled = true; btn.textContent = "Spremam…";
  try {
    const oldPath = editing?.image_path || null;
    let image_path = oldPath;

    if (newImage) {
      const ext = { "image/webp": "webp", "image/png": "png" }[newImage.type] || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, newImage, {
        contentType: newImage.type, cacheControl: "31536000", upsert: false
      });
      if (error) throw error;
      image_path = path;
    } else if (removeImage) {
      image_path = null;
    }

    const row = {
      name,
      brand: el.brand.value.trim(),
      category_id: el.category_id.value || null,
      price: Math.round(price * 100) / 100,
      old_price: old_price === null ? null : Math.round(old_price * 100) / 100,
      description: el.description.value.trim(),
      sort_order: parseInt(el.sort_order.value, 10) || 0,
      active: el.active.checked,
      image_path
    };

    const { error } = editing
      ? await supabase.from("products").update(row).eq("id", editing.id)
      : await supabase.from("products").insert(row);
    if (error) throw error;

    if (oldPath && oldPath !== image_path) await supabase.storage.from(BUCKET).remove([oldPath]);

    $("#editDlg").close();
    toast("Spremljeno ✓");
    load();
  } catch (err) {
    toast("Spremanje nije uspjelo: " + (err.message || err), "warn");
  } finally {
    btn.disabled = false; btn.textContent = "Spremi";
  }
});

$("#deleteBtn").addEventListener("click", async () => {
  if (!editing) return;
  if (!confirm(`Obrisati „${editing.name}”? Ovo se ne može poništiti.`)) return;
  const { error } = await supabase.from("products").delete().eq("id", editing.id);
  if (error) { toast("Brisanje nije uspjelo: " + error.message, "warn"); return; }
  if (editing.image_path) await supabase.storage.from(BUCKET).remove([editing.image_path]);
  $("#editDlg").close();
  toast("Obrisano");
  load();
});

document.querySelectorAll("dialog").forEach((d) => {
  d.addEventListener("click", (e) => {
    if (e.target === d || e.target.closest("[data-close]")) d.close();
  });
});
