# Online trgovina

Jednostavan webshop: katalog proizvoda, košarica i blagajna (plaćanje je za sada samo izgled — ništa se ne naplaćuje).
Proizvodi, cijene i slike spremaju se u online bazu **Supabase**. Kupci ih vide u trgovini, a **dodavati, mijenjati i brisati ih možeš samo ti** (stranica `admin.html`).

- `index.html` — trgovina za kupce
- `admin.html` — tvoja administracija (prijava emailom i lozinkom)
- `config.js` — postavke (naziv trgovine, veza na bazu)
- `supabase/schema.sql` — tablice i sigurnosna pravila baze

Dok baza nije povezana, trgovina radi u **demo načinu** s primjerima proizvoda.

## Kako je zaštićeno

- Sigurnost provodi **sama baza** (Row Level Security), ne stranica — pa se ne može zaobići.
- Kupci (bez prijave) mogu samo **čitati aktivne** proizvode.
- Upis, izmjena, brisanje i upload slika dozvoljeni su samo korisniku koji je upisan u tablicu `admins` — a u nju se može upisati samo iz Supabase SQL Editora.
- Proizvode možeš **sakriti** (kvačica „Vidljiv u trgovini“) — skrivene vidiš samo ti.
- `anon` ključ u `config.js` je javni po dizajnu. **Nikad** ne stavljaj `service_role` ključ u repozitorij.

## Postavljanje (jednom, ~10 minuta)

1. **Napravi Supabase projekt** — na [supabase.com](https://supabase.com) → *New project* (besplatni plan je dovoljan). Za regiju odaberi npr. *Central EU (Frankfurt)*.
2. **Postavi bazu** — *SQL Editor* → *New query* → zalijepi cijeli sadržaj `supabase/schema.sql` → *Run*.
3. **Isključi registraciju** — *Authentication* → *Sign In / Providers* → isključi **Allow new users to sign up**. Tako nitko drugi ne može napraviti račun.
4. **Napravi svoj račun** — *Authentication* → *Users* → *Add user* → *Create new user* → upiši svoj email i jaku lozinku, uključi *Auto Confirm User*.
5. **Postani administrator** — u *SQL Editoru* pokreni (sa svojim emailom):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'tvoj@email.com'
   on conflict do nothing;
   ```
6. **Poveži stranicu s bazom** — *Project Settings* → *API*: kopiraj **Project URL** i **anon public** ključ u `config.js` (`supabaseUrl`, `supabaseAnonKey`). Tu promijeni i naziv trgovine.
7. **Objavi** — na GitHubu: *Settings* → *Pages* → *Deploy from a branch* → `main` / `(root)`.
8. Otvori `…/admin.html`, prijavi se i dodaj prve proizvode sa slikama.

## Sljedeći korak: pravo plaćanje

Kad bude vrijeme, može se dodati plaćanje karticom (npr. Stripe) i spremanje narudžbi u bazu.
