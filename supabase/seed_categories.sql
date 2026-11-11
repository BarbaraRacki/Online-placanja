-- Kategorije prema katalogu zaga-racki.hr. Sigurno je pokrenuti više puta.
insert into public.categories (name, slug, sort_order, parent_id) values
  ('STIHL uređaji', 'stihl-uredaji', 0, null),
  ('STIHL uređaji za okoliš', 'stihl-uredaji-za-okolis', 10, null),
  ('Blue Bird Industries uređaji', 'blue-bird-industries', 20, null),
  ('Eurosystems uređaji', 'eurosystems-uredaji', 30, null),
  ('ROTAKT uređaji', 'rotakt-uredaji', 40, null),
  ('AIMA uređaji', 'aima-uredaji', 50, null),
  ('Oprema za maslinarstvo', 'oprema-za-maslinarstvo', 60, null),
  ('Annovi Reverberi', 'annovi-reverberi', 70, null),
  ('Vitlo za motornu pilu', 'vitlo-za-motornu-pilu', 80, null),
  ('Felco škare', 'felco-skare', 90, null),
  ('AGT proizvodi', 'agt-proizvodi', 100, null),
  ('GENMAC agregati za struju', 'genmac-agregati', 110, null),
  ('FOGO agregati', 'fogo-agregati', 120, null),
  ('TRACTORWATT agregati za struju', 'tractorwatt-agregati', 130, null),
  ('Uređaji za čišćenje snijega', 'uredaji-za-ciscenje-snijega', 140, null),
  ('Pumpe za vodu', 'pumpe-za-vodu', 150, null),
  ('NTC uređaji', 'ntc-uredaji', 160, null),
  ('Zaštitna oprema', 'zastitna-oprema', 170, null),
  ('HUNTER navodnjavanje', 'hunter-navodnjavanje', 180, null),
  ('Makita', 'makita', 190, null)
on conflict (slug) do nothing;

insert into public.categories (name, slug, sort_order, parent_id)
select v.name, v.slug, v.ord, p.id from public.categories p,
(values
  ('Motorne pile', 'motorne-pile', 0),
  ('Električne pile', 'elektricne-pile', 10),
  ('Akumulatorske pile', 'akumulatorske-pile', 20),
  ('Motorne kose', 'motorne-kose', 30),
  ('Električne kose', 'elektricne-kose', 40),
  ('Akumulatorske kose', 'akumulatorske-kose', 50),
  ('Motorne škare za živicu', 'motorne-skare-za-zivicu', 60),
  ('Električne škare za živicu', 'elektricne-skare-za-zivicu', 70),
  ('Akumulatorske škare za živicu', 'akumulatorske-skare-za-zivicu', 80),
  ('Motorni puhači', 'motorni-puhaci', 90),
  ('Električni puhači', 'elektricni-puhaci', 100),
  ('Akumulatorski puhači', 'akumulatorski-puhaci', 110),
  ('Visokotlačni perači', 'visokotlacni-peraci', 120),
  ('Motorne prskalice', 'motorne-prskalice', 130),
  ('Ručne prskalice', 'rucne-prskalice', 140),
  ('Motorne rezalice', 'motorne-rezalice', 150),
  ('Akumulatorske rezalice', 'akumulatorske-rezalice', 160),
  ('KombiSystem i MultiSystem', 'kombisystem-i-multisystem', 170),
  ('Kombinirani alati', 'kombinirani-alati', 180),
  ('Multi alat', 'multi-alat', 190),
  ('Uređaji za bušenje', 'uredaji-za-busenje', 200),
  ('Usisivač', 'usisivac', 210),
  ('Čistači okretnim četkama', 'cistaci-okretnim-cetkama', 220),
  ('Ručne škare i pile', 'rucne-skare-i-pile', 230),
  ('STIHL Aku program', 'stihl-aku-program', 240),
  ('Akumulatorske škare za grane', 'akumulatorske-skare-za-grane', 250),
  ('Tresači maslina te sitnog voća', 'tresaci-maslina-te-sitnog-voca', 260),
  ('Baterije za aku uređaje', 'baterije-za-aku-uredaje', 270),
  ('Punjači aku baterija', 'punjaci-aku-baterija', 280),
  ('Pribor i dodatna oprema', 'pribor-i-dodatna-oprema', 290),
  ('Pribor i maziva', 'pribor-i-maziva', 300)
) as v(name, slug, ord)
where p.slug = 'stihl-uredaji'
on conflict (slug) do nothing;

insert into public.categories (name, slug, sort_order, parent_id)
select v.name, v.slug, v.ord, p.id from public.categories p,
(values
  ('Robotska kosilica STIHL iMOW', 'robotska-kosilica-stihl-imow', 0),
  ('Motorne kosilice STIHL', 'motorne-kosilice-stihl', 10),
  ('Električne kosilice', 'elektricne-kosilice', 20),
  ('Akumulatorske kosilice', 'akumulatorske-kosilice', 30),
  ('Traktorske kosilice', 'traktorske-kosilice', 40),
  ('Prozračivač travnjaka', 'prozracivac-travnjaka', 50),
  ('Vrtne sječkalice', 'vrtne-sjeckalice', 60),
  ('Motorne kopačice', 'motorne-kopacice', 70)
) as v(name, slug, ord)
where p.slug = 'stihl-uredaji-za-okolis'
on conflict (slug) do nothing;

insert into public.categories (name, slug, sort_order, parent_id)
select v.name, v.slug, v.ord, p.id from public.categories p,
(values
  ('Baterijske škare', 'baterijske-skare', 0),
  ('Vezačica za vinograd', 'vezacica-za-vinograd', 10),
  ('Baterijske pile', 'baterijske-pile', 20),
  ('Teleskopska pila', 'teleskopska-pila', 30),
  ('Aku prskalica', 'aku-prskalica', 40),
  ('Traktorske kosilice', 'bb-traktorske-kosilice', 50),
  ('Zero turn kosilice', 'zero-turn-kosilice', 60),
  ('Motorni trimeri', 'motorni-trimeri', 70),
  ('Motorne pile Blue Bird Industries', 'motorne-pile-blue-bird-industries', 80),
  ('Motorne kosilice Blue Bird Industries', 'motorne-kosilice-blue-bird-industries', 90),
  ('Mini demper', 'mini-demper', 100),
  ('Kosilica na daljinsko upravljanje', 'kosilica-na-daljinsko-upravljanje', 110),
  ('Mini bageri', 'mini-bageri', 120),
  ('Dodaci baterijskim škarama', 'dodaci-baterijskim-skarama', 130),
  ('Baterije', 'baterije', 140),
  ('Rezervni dijelovi', 'rezervni-dijelovi', 150),
  ('Teleskop palice', 'teleskop-palice', 160),
  ('Combo setovi', 'combo-setovi', 170)
) as v(name, slug, ord)
where p.slug = 'blue-bird-industries'
on conflict (slug) do nothing;

insert into public.categories (name, slug, sort_order, parent_id)
select v.name, v.slug, v.ord, p.id from public.categories p,
(values
  ('Motorne kopačice', 'rotakt-motorne-kopacice', 0),
  ('Agregati inverter', 'agregati-inverter', 10)
) as v(name, slug, ord)
where p.slug = 'rotakt-uredaji'
on conflict (slug) do nothing;

insert into public.categories (name, slug, sort_order, parent_id)
select v.name, v.slug, v.ord, p.id from public.categories p,
(values
  ('Tresači maslina', 'tresaci-maslina', 0)
) as v(name, slug, ord)
where p.slug = 'aima-uredaji'
on conflict (slug) do nothing;

insert into public.categories (name, slug, sort_order, parent_id)
select v.name, v.slug, v.ord, p.id from public.categories p,
(values
  ('Mreže', 'mreze', 0),
  ('Grabljice', 'grabljice', 10),
  ('Inox bačve za ulje', 'inox-bacve-za-ulje', 20),
  ('Inox slavine', 'inox-slavine', 30),
  ('Vreće za masline', 'vrece-za-masline', 40),
  ('Limene kantice za ulje', 'limene-kantice-za-ulje', 50)
) as v(name, slug, ord)
where p.slug = 'oprema-za-maslinarstvo'
on conflict (slug) do nothing;

insert into public.categories (name, slug, sort_order, parent_id)
select v.name, v.slug, v.ord, p.id from public.categories p,
(values
  ('Agregati za struju', 'agregati-za-struju', 0),
  ('Motorne kopačice', 'agt-motorne-kopacice', 10),
  ('Motorne pumpe', 'motorne-pumpe', 20),
  ('Vibro ploče', 'vibro-ploce', 30)
) as v(name, slug, ord)
where p.slug = 'agt-proizvodi'
on conflict (slug) do nothing;

insert into public.categories (name, slug, sort_order, parent_id)
select v.name, v.slug, v.ord, p.id from public.categories p,
(values
  ('Prijenosni agregati 230V', 'prijenosni-agregati-230v', 0),
  ('Prijenosni agregati 400V', 'prijenosni-agregati-400v', 10),
  ('Diesel prijenosni agregati 230V', 'diesel-agregati-230v', 20),
  ('Diesel prijenosni agregati 400V', 'diesel-agregati-400v', 30)
) as v(name, slug, ord)
where p.slug = 'genmac-agregati'
on conflict (slug) do nothing;

insert into public.categories (name, slug, sort_order, parent_id)
select v.name, v.slug, v.ord, p.id from public.categories p,
(values
  ('Za rad do 8h', 'za-rad-do-8h', 0),
  ('Za rad 0-24h', 'za-rad-0-24h', 10)
) as v(name, slug, ord)
where p.slug = 'tractorwatt-agregati'
on conflict (slug) do nothing;

insert into public.categories (name, slug, sort_order, parent_id)
select v.name, v.slug, v.ord, p.id from public.categories p,
(values
  ('Motorna rezačica', 'motorna-rezacica', 0)
) as v(name, slug, ord)
where p.slug = 'ntc-uredaji'
on conflict (slug) do nothing;

insert into public.categories (name, slug, sort_order, parent_id)
select v.name, v.slug, v.ord, p.id from public.categories p,
(values
  ('Jakne', 'jakne', 0),
  ('Hlače', 'hlace', 10),
  ('Naramenice', 'naramenice', 20),
  ('Obuća', 'obuca', 30),
  ('Kacige', 'kacige', 40),
  ('Zaštita sluha', 'zastita-sluha', 50),
  ('Zaštitne rukavice', 'zastitne-rukavice', 60)
) as v(name, slug, ord)
where p.slug = 'zastitna-oprema'
on conflict (slug) do nothing;

insert into public.categories (name, slug, sort_order, parent_id)
select v.name, v.slug, v.ord, p.id from public.categories p,
(values
  ('Cijevi alkaten', 'cijevi-alkaten', 0),
  ('Spojevi za alkaten', 'spojevi-za-alkaten', 10),
  ('Mlaznice', 'mlaznice', 20)
) as v(name, slug, ord)
where p.slug = 'hunter-navodnjavanje'
on conflict (slug) do nothing;
