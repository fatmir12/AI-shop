# Plaćanje, otkazivanje i povrat novca

## Konfiguracija i valuta
Katalog, narudžbe i Stripe naplata koriste BAM (KM), u feningima bez pretvaranja u EUR. Stripe prikazuje ukupnu narudžbu kao jednu stavku; detalji proizvoda su u aplikaciji. Ključ STRIPE_API_KEY i potpisna tajna STRIPE_WEBHOOK_SECRET pripadaju samo backendu. APP_FRONTEND_URL je lokalno http://localhost:5173. Za produkciju treba zaseban HTTPS webhook i odgovarajuće ključeve. Ne objavljivati tajne.

Lokalni službeni Stripe CLI:
```sh
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,refund.created,refund.updated,refund.failed --forward-to http://localhost:8081/api/checkout/webhook
```
Potpisnu tajnu iz te CLI veze postaviti prije pokretanja backenda. Listener mora ostati pokrenut. Povratna stranica dodatno provjerava sesiju direktno na serveru; sam URL nikad ne dokazuje uplatu.

## Dostava
POST /api/orders traži JSON s firstName, lastName, email, address, city, postalCode (5 cifara) i phone. Server validira i normalizira podatke. Vlasnik dolazi iz JWT-a, cijene i količine iz korpe. Adresa je snapshot; naknadna izmjena profila je ne mijenja. Stare narudžbe mogu imati shipping=null. Forma je za BiH; poštarina, kurirsko praćenje i slanje e-maila nisu implementirani.

## Plaćanje i oporavak
- POST /api/checkout/create-session?orderId=...: prijavljeni vlasnik narudžbe. Otvorena sesija se ponovo koristi, a istekla se zamjenjuje novom s novim rednim brojem pokušaja. DB zaključavanje i stabilan idempotency ključ po pokušaju sprečavaju duple sesije.
- Plaćena, refundirana ili otkazana narudžba ne može dobiti novu naplatu. Ako povratak kupca kasni, GET /api/checkout/session-status?sessionId=... provjerava vlasništvo i stvarni Stripe status.
- POST /api/checkout/webhook prima sirovo tijelo i zahtijeva valjan potpis s vremenskom provjerom. Backend dohvaća autentičnu sesiju, provjerava ID, orderId, BAM i očekivani iznos. Samo payment_status=paid upisuje PAID.
- Ponovljeni događaji ne skidaju ponovo zalihe i ne mijenjaju već potvrđeni povrat u novu naplatu.
- Povratak dugmetom Back/Cancel na Stripeu ne otkazuje narudžbu. Rezervirana zaliha ostaje dok kupac ili admin izričito ne otkaže narudžbu; sam istek sesije ne vraća zalihu. Zato se istekla sesija može obnoviti bez ponovnog rezerviranja robe.

## Sigurno otkazivanje
POST /api/checkout/cancel?orderId=... dozvoljen je vlasniku ili ADMIN-u. Samo PENDING/CONFIRMED neplaćene narudžbe mogu se otkazati. Backend zaključava narudžbu, dohvaća Stripe stanje i zatvara otvorenu sesiju prije vraćanja zaliha. Ako je uplata pobijedila utrku, narudžba se označava plaćenom i ne vraća se zaliha. Ako Stripe još obrađuje naplatu ili zatvaranje ne uspije, nema otkazivanja. Ponovljeno otkazivanje je bez novih promjena zaliha.

## Puni povrat prije slanja robe
POST /api/checkout/refund?orderId=... zahtijeva ADMIN. UI prikazuje iznos i traži potvrdu. Podržan je puni povrat originalnog iznosa na izvorno sredstvo plaćanja prije slanja robe (PENDING/CONFIRMED). Poslana/dostavljena roba zahtijeva zaseban proces fizičkog povrata, koji nije implementiran.

Backend prvo provjeri naplatu, a zatim koristi stabilan idempotency ključ povrata. Refund ID i status spremaju se u bazu. PENDING ne znači vraćen novac i blokira daljnju obradu/slanje narudžbe. Tek Stripe succeeded mijenja paymentStatus u REFUNDED, refundStatus u SUCCEEDED, otkazuje narudžbu i vraća zalihu jednom. Pending/failed povrati mogu se provjeriti ponovnim admin pozivom, bez kreiranja dodatnog povrata. Neuspjeli povrat zahtijeva ručnu provjeru Stripe evidencije; automatsko ponovno izdavanje i djelomični povrati nisu podržani.

Potpisani refund.created/refund.updated/refund.failed događaji također osvježavaju status. Provjeravaju se refund ID, PaymentIntent, iznos i valuta. Administrator može ručno osvježiti stanje ako webhook kasni. Refund iz Stripe dashboarda koji nije pokrenut kroz ovaj endpoint nije automatski uvezen; potrebno ga je uskladiti prije sljedeće radnje.

## Migracije i provjere
V9 dodaje naplatu, V10 snapshot dostave, V11 redni broj pokušaja te refund ID/status. Ranije Stripe sesije i uplate prije V9 nisu automatski uvezene: prije ponovnog plaćanja treba ih uskladiti s evidencijom.

Testovi pokrivaju iznose, vlasništvo, ADMIN ograničenje, potpis, zamjenu istekle sesije, utrku plaćanja i otkazivanja, količinu vraćene zalihe, ponovljene radnje i pending/succeeded povrat. U lokalnom Sandboxu potvrđena je zamjena istekle sesije, sigurno otkazivanje s vraćanjem jednog komada i uspješan puni povrat testne uplate 1.599,00 KM. Stvarni novac nije korišten.

Referentne upute: https://docs.stripe.com/refunds , https://docs.stripe.com/api/checkout/sessions/expire , https://docs.stripe.com/webhooks/signature .
