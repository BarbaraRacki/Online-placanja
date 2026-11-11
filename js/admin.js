import { isConfigured, supabase, money, imageUrl, h, toast, placeholderFor, BUCKET } from "./common.js";

const $ = (s) => document.querySelector(s);
const show = (id) => ["#setupView", "#loginView", "#manageView"].forEach((v) => ($(v).hidden = v !== id));

let products = [];
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

// ---------- Popis ----------
async function load() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) { toast("Greška pri učitavanju: " + error.message, "warn"); return; }
  products = data || [];
  render();
}

$("#search").addEventListener("input", render);

function render() {
  const q = $("#search").value.trim().toLowerCase();
  const list = products.filter((p) => !q || p.name.toLowerCase().includes(q));
  const hidden = products.filter((p) => !p.active).length;
  $("#stats").textContent = `${products.length} proizvoda` + (hidden ? ` · ${hidden} skrivenih` : "");
  $("#list").replaceChildren(
    ...(list.length
      ? list.map((p) =>
          h("button", { class: "admin-row" + (p.active ? "" : " off"), onclick: () => openEdit(p) },
            h("div", { class: "thumb" }, p.image_path ? h("img", { src: imageUrl(p.image_path), alt: "" }) : placeholderFor(p.name)),
            h("div", { class: "grow" },
              h("div", { class: "cart-name" }, p.name),
              h("div", { class: "muted small" }, p.active ? "Vidljiv" : "Skriven")),
            h("strong", {}, money(p.price))))
      : [h("p", { class: "muted center pad" }, products.length ? "Nema rezultata." : "Još nema proizvoda. Dodaj prvi!")])
  );
}

// ---------- Uređivanje ----------
$("#newBtn").addEventListener("click", () => openEdit(null));

function setPreview(src, name) {
  $("#imgPreview").replaceChildren(src ? h("img", { src, alt: "" }) : placeholderFor(name || "?"));
  $("#imgRemove").hidden = !src;
}

function openEdit(p) {
  editing = p; newImage = null; removeImage = false;
  const f = $("#editForm");
  f.reset();
  f.querySelectorAll(".invalid").forEach((i) => i.classList.remove("invalid"));
  $("#editTitle").textContent = p ? "Uredi proizvod" : "Novi proizvod";
  f.elements.name.value = p?.name || "";
  f.elements.price.value = p ? String(p.price).replace(".", ",") : "";
  f.elements.description.value = p?.description || "";
  f.elements.sort_order.value = p?.sort_order ?? 0;
  f.elements.active.checked = p ? p.active : true;
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

// Smanji sliku prije slanja (brže učitavanje, manje prostora).
async function resizeImage(file, max, quality) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, "image/webp", quality));
  if (blob && blob.type === "image/webp") return blob;
  return await new Promise((r) => c.toBlob(r, "image/jpeg", quality));
}

$("#editForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const name = f.elements.name.value.trim();
  const price = Number(f.elements.price.value.replace(/\s/g, "").replace(",", "."));
  f.elements.name.classList.toggle("invalid", !name);
  f.elements.price.classList.toggle("invalid", !(price >= 0) || f.elements.price.value.trim() === "");
  if (!name || !(price >= 0) || f.elements.price.value.trim() === "") { toast("Upiši naziv i ispravnu cijenu.", "warn"); return; }

  const btn = $("#saveBtn");
  btn.disabled = true; btn.textContent = "Spremam…";
  try {
    const oldPath = editing?.image_path || null;
    let image_path = oldPath;

    if (newImage) {
      const ext = newImage.type === "image/webp" ? "webp" : "jpg";
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
      price: Math.round(price * 100) / 100,
      description: f.elements.description.value.trim(),
      sort_order: parseInt(f.elements.sort_order.value, 10) || 0,
      active: f.elements.active.checked,
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
