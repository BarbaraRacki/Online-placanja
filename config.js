// Postavke trgovine.
// supabaseUrl i supabaseAnonKey nađeš u Supabase → Project Settings → API.
// "anon" ključ je javni po dizajnu — sigurnost osiguravaju pravila u bazi (supabase/schema.sql).
// NIKAD ovdje ne stavljaj "service_role" ključ!
window.SHOP_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  shopName: "Moja trgovina",
  tagline: "Ručno odabrani proizvodi",
  currency: "EUR",
  locale: "hr-HR",
  shippingFlat: 0 // fiksna dostava u EUR (0 = besplatno)
};
