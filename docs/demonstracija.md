# Demonstracija AIShop aplikacije

## Priprema
- SQL Server AIShop mora raditi, s DB_USERNAME, DB_PASSWORD i JWT_SECRET postavljenim za backend. JDK 25 ili noviji, Node i instalirane frontend zavisnosti.
- Stripe testni ključ, nikad pravi ključ, i potpisna tajna lokalnog listenera. Privatna konfiguracija može biti u ignoriranoj .local/runtime.json. Ne kopirati konfiguraciju, tokene ili lozinke u Git, izvještaje ili screenshotove.
- Izgraditi backend i pokrenuti aplikaciju:
```powershell
.\bekend\mvnw.cmd -f bekend/pom.xml -DskipTests package
.\scripts\Start-LocalDemo.ps1
```
JAVA_HOME treba pokazivati na odgovarajući JDK. Helper ne zaustavlja postojeće procese; nakon izmjene backenda treba ručno zaustaviti samo vlastiti stari backend i ponovo pokrenuti helper.
- Zasebno pokrenuti Stripe listener prema docs/placanje.md. Na ovoj lokalnoj instalaciji CLI je u .local/stripe-cli/stripe.exe. Helper ne uključuje listener automatski.
- Prodavnica: http://localhost:5173/ ; admin: http://localhost:5173/admin . Port 5175 je odvojeni mock pregled i ne demonstrira pravu bazu/Stripe.
- Potrebni su obični kupčev račun i zaseban ADMIN račun u stvarnoj lokalnoj bazi. Mock računi nisu API računi. Kreiranje i dodjela ADMIN uloge opisani su u LOCAL_SETUP.md.

## Predloženi scenarij (8–10 minuta)
1. Katalog: pokaži pet kategorija, pretragu, filter cijene i dostupnost. Cijene su u KM. Fotografije su ilustrativne; ako vanjska slika ne radi, lokalna ilustracija kategorije čuva upotrebljiv prikaz. To nisu potvrđene fotografije navedenog modela.
2. AI: prijavi kupca, pitaj „Koji laptopi su na stanju do 2000 KM?“. Odgovor mora odgovarati stvarnom katalogu. Otvori ponovo razgovor i pokaži historiju.
3. Napiši „Dodaj taj laptop u korpu, jedan komad.“. Pokaži da korpa ostaje ista do Potvrdi. Potvrdi jednom i provjeri količinu.
4. Checkout: unesi izmišljene testne podatke dostave. Kreiraj narudžbu i pokaži spremljenu adresu. Otvori Stripe Sandbox i provjeri identičnu cijenu/valutu.
5. Testna kartica: 4242 4242 4242 4242, budući datum npr. 12/34 i CVC 123. Ne koristiti stvarnu karticu. Nakon povratka može biti potrebna ponovna prijava. Pokaži serverski potvrđeno plaćanje.
6. U adminu otvori istu narudžbu, adresu, status naplate i status obrade. Prije slanja klikni Vrati puni iznos i potvrdi dijalog. Pokaži stvarni status povrata; pending nije uspjeh. Uspješan povrat otkazuje narudžbu i vraća zalihu jednom.
7. Napravi zasebnu neplaćenu narudžbu, otvori Stripe i vrati se bez plaćanja. U njenim detaljima pokaži nastavak plaćanja ili izričito otkazivanje. Otkazivanje zatvara sesiju i vraća rezerviranu zalihu. Ponovljena radnja ne smije povećati zalihu drugi put.
8. Isključivo u testnom okruženju, istek sesije može se provjeriti kroz Stripe alate ili automatizirane testove. Ponovni Nastavi na plaćanje otvara novu sesiju iste narudžbe.

## Ponovljiva provjera AI toka
Iz korijena projekta, u proces postaviti AISHOP_TEST_EMAIL i AISHOP_TEST_PASSWORD za kupca te AISHOP_OTHER_EMAIL/AISHOP_OTHER_PASSWORD za zaseban račun. Lozinke unijeti lokalno, ne spremati u skriptu. Zatim:
```powershell
.\scripts\Test-Assistant.ps1
```
Skripta provjerava stvarni katalog i cijenu, SQL historiju, deduplikaciju zahtjeva, prirodni zahtjev za dodavanje uz potvrdu, jednokratno izvršenje i 404 pri pristupu drugog korisnika. Nakon testa vraća početno stanje testirane stavke korpe. Ostavlja demonstracijski razgovor i lokalni izvještaj u .local/assistant-verification.json. Potreban je laptop na stanju do 2000 KM; skripta ne izmišlja katalog ako ga nema.

Ovi kataloški/MCP i cart tokovi provjereni su na stvarnoj bazi. Slobodni LLM razgovor zahtijeva aktivnu Ollamu i konfiguriran model; bez toga ne tvrditi da je svaki tip AI odgovora provjeren. Oporavak mrežnih grešaka i izgubljenih pending akcija nakon restarta pokriven je postojećim testovima i docs/ai-conversations.md.

## Granice demonstracije
Nema prave naplate, e-mail obavijesti, stvarne dostavne službe, obračuna poštarine, djelomičnih povrata ili automatiziranog povrata već poslane robe. Kod promjene osobe/uloge odjaviti se i prijaviti drugim računom. Uspjeh ne pokazivati samo po tekstu odgovora: provjeriti korpu, narudžbu i stvarno Stripe stanje.
