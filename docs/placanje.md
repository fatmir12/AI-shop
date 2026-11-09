# Plaćanje narudžbi

Cijene kataloga i narudžbi su u BAM (KM). Stripe Checkout prima ukupni iznos narudžbe u feningima, bez promjene valute ili pretvaranja KM u EUR. Ukupni iznos je jedan Stripe redak za narudžbu; detalji proizvoda ostaju u aplikaciji.

## Konfiguracija

Backend zahtijeva STRIPE_API_KEY. Za test koristiti samo testni ključ. APP_FRONTEND_URL je javna adresa frontenda (lokalno http://localhost:5173). STRIPE_WEBHOOK_SECRET je potpisna tajna konkretnog webhook endpointa. Tajne nisu frontend varijable i ne smiju ući u Git.

Lokalno, službenim Stripe CLI-jem prijavljenim na isto Sandbox okruženje:

```sh
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded --forward-to http://localhost:8081/api/checkout/webhook
```

Vraćenu potpisnu tajnu postaviti kao STRIPE_WEBHOOK_SECRET prije pokretanja backenda. Za produkciju registrirati odgovarajući HTTPS webhook i koristiti njegovu zasebnu tajnu; lokalni CLI mora raditi za lokalnu dostavu događaja.

Flyway V9 dodaje payment_status (UNPAID/PAID), Stripe session ID, očekivani iznos/valutu i vrijeme potvrde. Status naplate odvojen je od statusa obrade i dostave narudžbe.

## Tok i zaštite

- POST /api/checkout/create-session?orderId=... zahtijeva prijavu i vlasništvo nad narudžbom. Zaključavanje narudžbe i Stripe idempotency ključ štite od paralelnih duplih sesija. Postojeća otvorena sesija ponovo se koristi.
- POST /api/checkout/webhook ne koristi bearer prijavu. Mora imati valjan Stripe-Signature, vremensku provjeru i neizmijenjeno tijelo zahtjeva. Bez konfigurirane tajne vraća 503, bez valjanog potpisa 400.
- Nakon potpisanog događaja backend dohvaća sesiju direktno od Stripea. ID sesije, orderId metadata, valuta i ukupni iznos moraju odgovarati spremljenoj narudžbi. Samo Stripe payment_status=paid evidentira PAID. Duplikati ne mijenjaju vrijeme potvrde i ne pokreću ponovno skidanje zaliha.
- Autentificirani GET /api/checkout/session-status?sessionId=... provjerava vlasništvo i Stripe status na serveru; koristi istu provjeru za siguran povratak kupca čak i ako webhook kasni.
- Success URL sam po sebi nije potvrda uplate. Nakon povratka korisnik se po potrebi ponovo prijavljuje jer se tokeni čuvaju u memoriji. Aplikacija zatim prikazuje rezultat serverske provjere.
- Odustajanje od Stripea ne otkazuje narudžbu. Nastavak je dostupan kroz detalje neplaćene narudžbe. Istekla sesija vraća konflikt i ne kreira automatski novu naplatu.
- Narudžba s pokrenutim Stripe plaćanjem ne može se automatski otkazati kroz običnu promjenu statusa: prvo treba zatvoriti sesiju ili obraditi povrat. Povrati novca i automatsko oslobađanje zaliha nakon isteka nisu implementirani.
- Migracija ne uvozi stare Stripe sesije ili prethodne uplate. Starije naplate prije V9 potrebno je uskladiti sa Stripe evidencijom prije ponovnog plaćanja.

## Provjera

Backend testovi pokrivaju BAM iznos, vlasništvo, ponovnu upotrebu sesije, plaćenu/otkazanu narudžbu, nepodudarne podatke, duple događaje, prijavu i potpis webhooka. Na lokalnom Sandboxu potvrđena je testna uplata 1.599,00 BAM, webhook odgovor 204 i PAID u bazi. Stvarni novac nije naplaćen.

Referentna dokumentacija: https://docs.stripe.com/webhooks/signature , https://docs.stripe.com/payments/checkout/fulfill-orders , https://docs.stripe.com/currencies .
## Podaci za dostavu

POST /api/orders sada zahtijeva podatke za dostavu u JSON tijelu:

```json
{
  "firstName": "Test",
  "lastName": "Kupac",
  "email": "test@example.test",
  "address": "Testna ulica 12",
  "city": "Sarajevo",
  "postalCode": "71000",
  "phone": "+38761123456"
}
```

Identitet vlasnika dolazi iz JWT-a, a iznos i stavke iz njegove korpe, ne iz tijela zahtjeva. Server provjerava obavezna polja, dužine, e-mail, petocifreni poštanski broj i telefon. Podaci se normaliziraju uklanjanjem rubnih razmaka te spremaju kao neovisni snapshot uz narudžbu. Naknadne izmjene profila ne mijenjaju raniju adresu. Flyway V10 dodaje nullable shipping_* kolone; stare narudžbe ostaju čitljive sa shipping=null.

Kupac vidi adresu u svojim detaljima narudžbe, a administrator u admin detaljima. POST bez podataka više nije podržan; ažurirati vanjske testne klijente. Forma je trenutno namijenjena dostavi unutar Bosne i Hercegovine. Spremanje adrese ne uvodi obračun poštarine, praćenje pošiljke ili slanje e-maila. Trošak dostave nije uključen u Stripe naplatu.
