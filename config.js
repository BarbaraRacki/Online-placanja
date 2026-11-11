// Postavke web trgovine.
// supabaseUrl i supabaseAnonKey nađeš u Supabase → Project Settings → API.
// "anon" ključ je javni po dizajnu — sigurnost osiguravaju pravila u bazi (supabase/schema.sql).
// NIKAD ovdje ne stavljaj "service_role" ključ!
window.SHOP_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",

  shopName: "Žaga d.o.o.",
  heroTitle: "Motorne pile, kose, kosilice i oprema",
  heroText: "STIHL uređaji, pribor i zaštitna oprema — trgovina u Krku i servis u Ogulinu od 1995.",
  email: "info@zaga-racki.hr",
  facebook: "https://www.facebook.com/zagakrk",
  currency: "EUR",
  locale: "hr-HR",
  shippingFlat: 0, // fiksna dostava u EUR (0 = besplatno)

  locations: [
    {
      title: "Krk — trgovina",
      company: "Žaga d.o.o.",
      address: "Zagrebačka 18, 51500 Krk",
      phone: "051 220 330",
      hours: ["Pon–Pet 8:00–16:00", "Sub 8:00–13:00"]
    },
    {
      title: "Ogulin — trgovina i servis",
      company: "Obrt za popravak mot. pila, vl. Matija Rački",
      address: "Krlenac 16, 47300 Ogulin",
      phone: "047 531 878",
      hours: ["Pon–Pet 8:00–16:00", "Sub 8:00–13:00 (ljeti)"]
    }
  ]
};
