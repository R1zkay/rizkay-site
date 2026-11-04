# RIZKAY — Mixing & Mastering weboldal

Kész, mobilbarát, **angol–német–magyar**, egyoldalas portfólióoldal GitHub Pages-hez.

A nyilvános oldal működik statikusan is. A **valódi, tartós feltöltéshez** és a **GitHub módosítása nélküli árkezeléshez** egy saját, ingyenesen is kipróbálható Supabase-projektet kell összekapcsolnod. Ezt a projektet **még senki nem állította be helyetted**.

## Amit tud

- **RIZKAY** név, Mixing & Mastering Engineer / Based in Switzerland / Worldwide
- Egyoldalas elrendezés ugrólinkes menüvel, mobilos megjelenéssel
- Valódi **szinkron A/B lejátszó**: két azonos kezdőpontú hangfájl ugyanott szól; RAW és MASTER között megszakítás nélkül lehet váltani
- Hullámforma, lejátszás/szünet, tekerés, hangerő, referenciakatalógus
- Admin által közzétehető/elrejthető/törölhető nyers és masterelt referenciák
- **Öt induló szolgáltatás:** Mixing, Mastering, Mixing + Mastering, Stem Mixing, Stem Mastering
- Az adminban módosítható **CHF kezdőárak, benne foglalt revíziók száma, háromnyelvű leírások, csomagok láthatósága**; új csomagok hozzáadhatók, meglévők törölhetők
- Ajánlatkérő űrlap, amely az általad beállított e-mail címre egy **megírt levéltervezetet nyit az ügyfél saját e-mail programjában**
- EN / DE / HU nyelvváltó, a választást a böngészőben megjegyzi
- Demóban saját generált, jogtiszta próbahang, **nem valós ügyfélmunka**

## 1. Azonnali kipróbálás

Nyisd meg a `BEMUTATO.html` fájlt a böngésződben. Ez az **önálló, internetkapcsolat nélkül is működő demó**. A demóban a fájlok és az árak **nem** tárolódnak tartósan. Az online funkciók kipróbálásához a következő lépések szükségesek.

Ha a teljes fejlesztői mappát helyben teszteled, indíts a mappában egy webkiszolgálót:

```bash
python -m http.server 8000
```

Majd látogasd meg a `http://localhost:8000` címet. Az `index.html` a GitHub Pages-en is fut. Ha a forrásfájlokat egyszerű `file://` címen nyitod meg, a JS-modulokat a böngésző letilthatja. Erre való a külön `BEMUTATO.html`.

## 2. Saját neved és kapcsolati adataid

Nyisd meg a `config.js` fájlt szövegszerkesztőben. Állítsd be legalább ezt:

```js
studioName: 'RIZKAY',
email: 'ide-a-valodi-email-cimedet@pelda.com',
```

Az e-mail cím **most üres**, mert nem kaptam meg tőled. Addig az ajánlatkérés nem fog levelet küldeni vagy tervezetet nyitni, hanem jelzi, hogy beállítás kell. Ezt nem lehet kihagyni. Az Instagram és WhatsApp opcionális.

A név `RIZKAY`; ha a végleges írásmódot másképp szeretnéd, a `config.js` fájlban és a publikus HTML szövegeiben átírható.

**Adatkezelés:** az érdeklődők a portfólión keresztül **nem töltenek fel fájlokat a szerveredre**. Az űrlap egy e-mail-tervezetet nyit, benne a megadott adatokkal és az esetleges privát fájllinkkel. Ha később automatikus e-mail küldést vagy fájlfeltöltést szeretnél, azt külön integrációként lehet hozzáadni. Az űrlap nem helyettesíti a későbbi GDPR/adatvédelmi tájékoztatót.

## 3. Supabase – adatbázis, online zenetárhely, jelszavas admin

A GitHub Pages statikus szolgáltatás; közvetlenül **nem tud a weboldalról fájlokat fogadni vagy adatbázist módosítani**. Ehhez kell a Supabase.

1. Nyisd meg: https://supabase.com. Hozz létre egy új projektet.
2. Nyisd meg a projekt **SQL Editor** részét. Másold be a teljes `supabase-setup.sql` fájlt, majd **Run**.
3. Az **Authentication → Users → Add user** menüben hozd létre a saját e-mail/jelszó fiókodat. Gondoskodj róla, hogy az e-mail meg legyen erősítve.
4. A projekt **SQL Editor** részén futtasd le a következő parancsot a **saját, pontos e-mail címeddel**. Ez adja meg az adminjogosultságot (minden más regisztrált felhasználó csak nyilvános adatot olvashat).

```sql
insert into public.studio_admins (user_id)
select id from auth.users where email = 'AZ-EN-EMAIL-CIMEM@PELDA.COM'
on conflict (user_id) do nothing;
```

5. A Supabase **Project Settings → API Keys / Connect** részében keresd meg a Project URL-t és a **publishable** (`sb_publishable_...`) kulcsot. A `config.js` mezőibe írd őket:

```js
supabaseUrl: 'https://SAJAT-PROJEKT.supabase.co',
supabasePublishableKey: 'sb_publishable_...',
```

Ha a projekt legacy `anon` kulcsot kínál, az is használható. **SOHA NE tedd fel a GitHubra a `service_role`, `secret` vagy `sb_secret_...` kulcsot!** A `publishable` kulcs nyilvános használatra készült; az írási műveleteket az adatbázis RLS-szabályai védik.

### Admin használat

Az oldal legalján kattints az **ADMIN BELÉPÉS** gombra. Belépés után két fül jelenik meg:

**Zenei portfólió:** adj meg címet, előadót, műfajt, BPM-et; tölts fel egy RAW és egy MASTER fájlt; jelöld, hogy publikus legyen-e; mentsd el. Feltöltött zenéidet később elrejtheted vagy törölheted.

**Árak és csomagok:** nyisd meg az egyik csomagot, add meg a CHF árat és a benne foglalt revíziókat (például 3 helyett 5); írd át az EN/DE/HU megnevezést vagy leírást, kapcsold be/ki a megjelenést, majd **Változások mentése**. Új szolgáltatást is hozzáadhatsz. Az oldalon újratöltés után a Supabase adatai látszanak, **nem kell a GitHubon semmit módosítanod**.

**Az induló csomagoknak NINCSENEK kitalált árai:** az ár helyén **„Quote on request / Preis auf Anfrage / Egyedi ajánlat”** olvasható, a revíziók egyeztetés szerintiek. Ezeket a saját üzleti döntésed után állítsd be.

### Hanganyagok

- Nyilvános referenciához engedéllyel rendelkező hangot használj. A public bucketben lévő fájlok **bárki számára hozzáférhetők**, ezért bizalmas, kiadatlan ügyfélanyagot ne tegyél oda.
- 320 kbps MP3 ajánlott. A kód **45 MB/fájl** feltöltési plafont állít be; a telepítő SQL-ben 50 MiB a bucket plafonja.
- A RAW és MASTER ugyanabból az időpontból induljon; lehetőleg azonos hosszúságúak legyenek, különben a rövidebb hanganyag végénél megszakad a lejátszás.
- Nagy WAV fájlok, privát ügyfél-portál, automatikus fájlátadás vagy online fizetés külön fejlesztést igényelnek.
- A nyers/master hangerejét célszerű összehasonlítható szintre hozni, különben a hangosabbnak könnyű automatikusan jobbnak tűnnie.

## 4. GitHub Pages publikálás

1. Regisztrálj vagy lépj be a https://github.com oldalon.
2. Hozz létre egy **nyilvános repository-t**, például `rizkay-website` néven. A GitHub profilneved lehet a polgári vagy művészneved is; **a weboldalon RIZKAY jelenik meg, függetlenül ettől**.
3. Töltsd fel **a ZIP-ben lévő `rizkay-site/` mappa fájljait**, úgy, hogy a repository gyökerében közvetlenül az `index.html` legyen, mellette az `app.js`, `pricing.js`, `i18n.js`, `config.js`, `styles.css`, `rizkay.css` és az `assets/` mappa. Ne magát a ZIP fájlt töltsd fel egyetlen fájlként.
4. GitHubon válaszd: **Settings → Pages → Build and deployment → Deploy from a branch → `main` → `/(root)` → Save**.
5. Néhány perc múlva az oldal várható címe: `https://FELHASZNALONEV.github.io/rizkay-website/`. (A GitHub a saját fiókod és repository-d szerint adja a tényleges címet.)
6. Később saját domaint is hozzákapcsolhatsz; pl. egy általad megvásárolt `rizkay...` domain esetén a Pages és a DNS beállítása szükséges.

### Mi változik a GitHubon, és mi nem?

- **GitHub:** dizájn, szövegek, személyes elérhetőség, Supabase projektkapcsolat.
- **Supabase admin:** új trackek, eltávolított referenciák, CHF árak, ingyenes revíziók száma, háromnyelvű csomagleírások, aktív szolgáltatások.

## 5. Közzététel előtti ellenőrzőlista

- [ ] `config.js`: valódi kapcsolati e-mail, opcionális közösségi linkek
- [ ] Supabase projekt + SQL telepítő futtatva
- [ ] Auth adminfiók létrehozva és `studio_admins` táblában engedélyezve
- [ ] `config.js`: Supabase publikus projekt URL és publishable key megadva
- [ ] Saját nyers / master hangok feltöltve, a generált próbahang eltűnt
- [ ] Saját CHF árak és revíziók megadva, ha szeretnéd nyilvánosan megmutatni őket
- [ ] Az ajánlatkérés e-mailt nyit a megfelelő címre
- [ ] Saját bio, nyelvezetek, impresszum és adatvédelmi tájékoztató ellenőrizve
- [ ] Mobilon és asztali böngészőben ellenőrizve

## Fájlok

| Fájl | Mire való? |
|---|---|
| `index.html` | GitHubra feltöltendő főoldal |
| `styles.css`, `rizkay.css` | Megjelenés |
| `app.js` | Szinkron A/B lejátszó, track admin, űrlap |
| `pricing.js` | Szolgáltatáslista és admin árkezelés |
| `i18n.js` | Angol, német és magyar fordítások |
| `config.js` | Neved, e-mailed, Supabase kulcsok (csak publishable) |
| `supabase-setup.sql` | Adatbázis és jogosultságok |
| `assets/` | Demo hanganyagok, ikon |
| `BEMUTATO.html` | Különálló, offline megnyitható demó |
| `make_preview.py` | A demó újragenerálása forrásmódosítás után (opcionális) |

## Hivatalos dokumentáció

- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- Supabase Authentication: https://supabase.com/docs/guides/auth
- Supabase Storage: https://supabase.com/docs/guides/storage
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security

**Összefoglalva:** ez egy felépített, tesztelt induló weboldal. Még nem publikus éles weboldal, és a Supabase-, GitHub- és e-mail-fiókjaid nélkül nem tudja helyetted létrehozni az élő tárhelykapcsolatot.
