# Pregled demo kataloga od 50 proizvoda

SQL skripta **nije izvršena**. Namijenjena je ručnom pregledu i odobrenju;
nije smještena među Flyway migracije. Izvor zahtjeva: `proizvodi_upute.txt`.

## Shema i kompatibilnost

Pregledane su migracije V1/V2/V7, `bekend/dev/seed-products.sql`, ProductRequest,
ProductResponse i frontend ugovori/komponenta Image. Proizvodi imaju
NVARCHAR(150) naziv, NVARCHAR(1000) opis, DECIMAL(12,2) cijenu, nenegativnu
zalihu, nullable NVARCHAR(500) image_url i FK na dbo.categories. Kategorije su
Laptopi, Telefoni, Miševi, Tastature i Slušalice. Skripta ih mapira po nazivu i
odbija nedostajuću ili dvosmislenu kategoriju. Nema promjene sheme ili API-ja.

Svih 50 novih stavki ima predloženu DEMO cijenu iz TXT-a i početnu DEMO zalihu
10. To nisu provjerene tržišne cijene ili stvarno skladišno stanje. Postojeće
cijene, zalihe, opisi i slike ostaju netaknuti. Nema UPDATE/DELETE/MERGE operacija.

## Slike

Za fotografije nisu potvrđena prava ponovne upotrebe. Svih 50 image_url je SQL
NULL, što prolazi postojeći nullish frontend ugovor i prikazuje lokalni
`frontend/public/product-fallback.svg`. Relativni URL nije upisan u bazu jer
frontend validacija prihvata HTTP(S), praznu ili null vrijednost. Oznaka iz TXT-a
nije unesena kao URL. Postojeće fotografije nisu mijenjane.

## Specifikacije i SKU

Službeni izvori ispod služe provjeri porodice/modela; dostupnost izvora nije
potvrda tačne dobavljačke konfiguracije ili prava korištenja fotografije.
**Nijedan dobavljački SKU nije izmišljen niti proglašen odabranim.**
Svaki opis sadrži demo napomenu o nedostajućoj varijanti; prije produkcijske
objave treba uskladiti stvarni SKU sa dobavljačem. Dva modela bez pouzdanog
primarnog izvora posebno su označena. Ovo je priprema DEMO seed-a, a ne
certifikacija svih specifikacija za prodaju.

Korekcije u odnosu na TXT:

- IdeaPad Slim 3 15 je preširok naziv za fiksnu AMD konfiguraciju; opis ostaje
  na nivou serije dok se ne odaberu podmodel i MTM.
- ASUS X1504 ima više podmodela/procesora; ne tvrdi se da svaka varijanta ima
  Intel Core procesor ili tačno određenu pohranu.
- Bose QuietComfort Ultra traži provjeru generacije.
- Baterijske autonomije u izvornim opisima su deklarisane vrijednosti, zavisne
  od uslova korištenja. RAM/SSD/boje, regionalni SKU, raspored tastature,
  prekidači i sadržaj pakovanja ostaju za provjeru prema napomenama u manifestu.

| Proizvod | Referenca proizvođača | Obavezna provjera prije objave |
|---|---|---|
| Lenovo IdeaPad Slim 3 15 | [Izvor](https://psref.lenovo.com/Product/IdeaPad/IdeaPad_Slim_3_15AMN8?MT=82XQ) | Tačan proizvođački SKU, CPU/GPU, RAM, SSD, ekran, OS i raspored tastature nisu odabrani. |
| Acer Aspire 5 A515 | [Izvor](https://www.acer.com/ca-en/laptops/aspire/aspire-5-intel/pdp/NX.KHJAA.004) | Tačan proizvođački SKU, CPU/GPU, RAM, SSD, ekran, OS i raspored tastature nisu odabrani. |
| ASUS Vivobook 15 X1504 | [Izvor](https://www.asus.com/ca-en/laptops/for-home/vivobook/asus-vivobook-15-x1504/techspec/) | Tačan proizvođački SKU, CPU/GPU, RAM, SSD, ekran, OS i raspored tastature nisu odabrani. |
| HP ProBook 450 G10 | [Izvor](https://h20195.www2.hp.com/v2/GetDocument.aspx?docname=c08533472) | Tačan proizvođački SKU, CPU/GPU, RAM, SSD, ekran, OS i raspored tastature nisu odabrani. |
| Lenovo ThinkPad E14 Gen 5 | [Izvor](https://psref.lenovo.com/syspool/Sys/PDF/ThinkPad/ThinkPad_E14_Gen_5_Intel/ThinkPad_E14_Gen_5_Intel_Spec.pdf) | Tačan proizvođački SKU, CPU/GPU, RAM, SSD, ekran, OS i raspored tastature nisu odabrani. |
| Dell Latitude 5440 | [Izvor](https://www.delltechnologies.com/asset/en-us/products/laptops-and-2-in-1s/technical-support/latitude-5x40-spec-sheet.pdf.external) | Tačan proizvođački SKU, CPU/GPU, RAM, SSD, ekran, OS i raspored tastature nisu odabrani. |
| ASUS TUF Gaming A15 FA507 | [Izvor](https://press.asus.com/news/press-releases/3329/) | Tačan proizvođački SKU, CPU/GPU, RAM, SSD, ekran, OS i raspored tastature nisu odabrani. |
| Lenovo Legion 5 16IRX9 | [Izvor](https://psref.lenovo.com/Product/Legion/Legion_5_16IRX9) | Tačan proizvođački SKU, CPU/GPU, RAM, SSD, ekran, OS i raspored tastature nisu odabrani. |
| Apple MacBook Air 13 M3 | [Izvor](https://www.apple.com/newsroom/2024/03/apple-unveils-the-new-13-and-15-inch-macbook-air-with-the-powerful-m3-chip/) | Tačan proizvođački SKU, CPU/GPU, RAM, SSD, ekran, OS i raspored tastature nisu odabrani. |
| Apple MacBook Pro 14 M4 Pro | [Izvor](https://support.apple.com/en-us/121553) | Tačan proizvođački SKU, CPU/GPU, RAM, SSD, ekran, OS i raspored tastature nisu odabrani. |
| Samsung Galaxy A15 4G 128 GB | **Primarni izvor nije potvrđen** | Potvrditi regionalni SKU, RAM, SIM/eSIM, boju i navedeni kapacitet pohrane. Ne zamijeniti 4G i 5G model; specifikacije iz TXT-a nisu nezavisno potvrđene. |
| Xiaomi Redmi Note 13 4G 128 GB | [Izvor](https://www.mi.com/my/product/redmi-note-13/specs/) | Potvrditi regionalni SKU, RAM, SIM/eSIM, boju i navedeni kapacitet pohrane. |
| Motorola Moto G84 5G 256 GB | [Izvor](https://en-apac.support.motorola.com/app/answers/detail/a_id/176157/~/moto-g84-5g---specifiche) | Potvrditi regionalni SKU, RAM, SIM/eSIM, boju i navedeni kapacitet pohrane. |
| Samsung Galaxy A35 5G 128 GB | [Izvor](https://news.samsung.com/us/samsung-galaxy-a35-5g-now-available-in-the-us-offering-awesome-mobile-experiences-to-everyone/) | Potvrditi regionalni SKU, RAM, SIM/eSIM, boju i navedeni kapacitet pohrane. |
| Nothing Phone (2a) 128 GB | [Izvor](https://checkout-eu.nothing.tech/pages/phone-2a) | Potvrditi regionalni SKU, RAM, SIM/eSIM, boju i navedeni kapacitet pohrane. |
| Google Pixel 8a 128 GB | [Izvor](https://blog.google/products-and-platforms/devices/pixel/pixel-8a-launch/) | Potvrditi regionalni SKU, RAM, SIM/eSIM, boju i navedeni kapacitet pohrane. |
| Samsung Galaxy S24 256 GB | [Izvor](https://images.samsung.com/is/content/samsung/assets/us/2401/business/mobile/phones/galaxy/Galaxy_S24_Series_B2B_Spec_Sheet.pdf) | Potvrditi regionalni SKU, RAM, SIM/eSIM, boju i navedeni kapacitet pohrane. |
| Apple iPhone 16 128 GB | [Izvor](https://support.apple.com/es-es/121029) | Potvrditi regionalni SKU, RAM, SIM/eSIM, boju i navedeni kapacitet pohrane. |
| Google Pixel 9 Pro 128 GB | [Izvor](https://support.google.com/pixelphone/answer/7158570?hl=en-AU) | Potvrditi regionalni SKU, RAM, SIM/eSIM, boju i navedeni kapacitet pohrane. |
| Samsung Galaxy S25 Ultra 256 GB | [Izvor](https://images.samsung.com/is/content/samsung/assets/us/business/mobile/phones/galaxy-s25/02052025/S25_Series_B2B_Spec_Sheet_HRc.pdf) | Potvrditi regionalni SKU, RAM, SIM/eSIM, boju i navedeni kapacitet pohrane. |
| Logitech M90 | **Primarni izvor nije potvrđen** | Potvrditi tačan SKU, reviziju, boju, veličinu i sadržaj pakovanja/prijemnik. Broj tipki/specifikacije iz TXT-a nisu potvrđeni primarnim izvorom. |
| Logitech M185 | [Izvor](https://support.logi.com/hc/en-my/articles/360023241934-M185-Technical-Specifications) | Potvrditi tačan SKU, reviziju, boju, veličinu i sadržaj pakovanja/prijemnik. |
| Microsoft Bluetooth Mouse | [Izvor](https://support.microsoft.com/en-us/surface/accessories/mouse-keyboard/use-microsoft-bluetooth-mouse) | Potvrditi tačan SKU, reviziju, boju, veličinu i sadržaj pakovanja/prijemnik. |
| Logitech M650 Signature | [Izvor](https://hub.sync.logitech.com/m650/post/specifications---signature-m650-dotbTrB1mkoalg3) | Potvrditi tačan SKU, reviziju, boju, veličinu i sadržaj pakovanja/prijemnik. |
| Razer DeathAdder Essential | [Izvor](https://www.razer.com/gaming-mice/razer-deathadder-essential) | Potvrditi tačan SKU, reviziju, boju, veličinu i sadržaj pakovanja/prijemnik. |
| SteelSeries Rival 3 | [Izvor](https://steelseries.com/en-ee/gaming-mice/rival-3?connectivityType=wired) | Potvrditi tačan SKU, reviziju, boju, veličinu i sadržaj pakovanja/prijemnik. |
| HyperX Pulsefire Haste 2 | [Izvor](https://hyperx.com/collections/gaming-mice/products/hyperx-pulsefire-haste-2-gaming-mouse?variant=43416224071837) | Potvrditi tačan SKU, reviziju, boju, veličinu i sadržaj pakovanja/prijemnik. |
| Logitech G502 HERO | [Izvor](https://www.logitechg.com/en-us/shop/p/g502-hero-gaming-mouse?bvstate=pg%3A5%2Fct%3Ar) | Potvrditi tačan SKU, reviziju, boju, veličinu i sadržaj pakovanja/prijemnik. |
| Logitech MX Master 3S | [Izvor](https://www.logitech.com/content/dam/logitech/en/business/pdf/mx-master-3s-business-wireless-mouse.pdf) | Potvrditi tačan SKU, reviziju, boju, veličinu i sadržaj pakovanja/prijemnik. |
| Razer Viper V3 Pro | [Izvor](https://www.razer.com/gaming-mice/razer-viper-v3-pro?page=tech-specs) | Potvrditi tačan SKU, reviziju, boju, veličinu i sadržaj pakovanja/prijemnik. |
| Logitech K120 | [Izvor](https://www.logi.com/es-es/shop/p/k120-usb-standard-computer) | Potvrditi SKU, jezički raspored, prekidače, osvjetljenje i reviziju. |
| Logitech K380 | [Izvor](https://www.logitech.com/en-us/product/multi-device-keyboard-k380) | Potvrditi SKU, jezički raspored, prekidače, osvjetljenje i reviziju. |
| Microsoft Designer Compact Keyboard | [Izvor](https://support.microsoft.com/en-us/surface/accessories/mouse-keyboard/use-microsoft-designer-compact-keyboard) | Potvrditi SKU, jezički raspored, prekidače, osvjetljenje i reviziju. |
| Redragon K552 Kumara | [Izvor](https://www.redragonzone.com/detail.html?id=84) | Potvrditi SKU, jezički raspored, prekidače, osvjetljenje i reviziju. |
| HyperX Alloy Origins Core | [Izvor](https://hyperx.com/collections/mechanical-keyboards/products/hyperx-alloy-origins-core-mechanical-gaming-keyboard) | Potvrditi SKU, jezički raspored, prekidače, osvjetljenje i reviziju. |
| Keychron K2 V2 | [Izvor](https://www.keychron.com/collections/portable-keyboard-and-mouse/products/keychron-k2-wireless-mechanical-keyboard?page=2) | Potvrditi SKU, jezički raspored, prekidače, osvjetljenje i reviziju. |
| Logitech G413 SE | [Izvor](https://www.logitechg.com/en-us/shop/p/g413-se-gaming-keyboard) | Potvrditi SKU, jezički raspored, prekidače, osvjetljenje i reviziju. |
| Razer BlackWidow V4 X | [Izvor](https://www.razer.com/gaming-keyboards/razer-blackwidow-v4-x) | Potvrditi SKU, jezički raspored, prekidače, osvjetljenje i reviziju. |
| Logitech MX Mechanical | [Izvor](https://www.logitech.com/es-mx/shop/p/mx-mechanical.920-010845) | Potvrditi SKU, jezički raspored, prekidače, osvjetljenje i reviziju. |
| Corsair K100 RGB | [Izvor](https://help.corsair.com/hc/en-us/articles/360050111132-Product-information-K100-RGB-Gaming-Keyboard) | Potvrditi SKU, jezički raspored, prekidače, osvjetljenje i reviziju. |
| JBL Tune 500 | [Izvor](https://support.jbl.com/on/demandware.static/-/Sites-masterCatalog_Harman/default/dwf216a637/pdfs/JBL_Tune500_Spec_Sheet_English.pdf) | Potvrditi SKU, generaciju, boju i sadržaj pakovanja. |
| Sony MDR-ZX110 | [Izvor](https://www.sony.com/electronics/support/wired-headphones-headband/mdr-zx110/specifications) | Potvrditi SKU, generaciju, boju i sadržaj pakovanja. |
| JBL Tune 510BT | [Izvor](https://be.jbl.com/on/demandware.static/-/Sites-masterCatalog_Harman/default/dwf611a252/pdfs/JBL_TUNE%20510BT_QSG_Multilingual.pdf) | Potvrditi SKU, generaciju, boju i sadržaj pakovanja. |
| Anker Soundcore Life Q20 | [Izvor](https://us.soundcore.com/products/a3025) | Potvrditi SKU, generaciju, boju i sadržaj pakovanja. |
| HyperX Cloud II | [Izvor](https://media.kingston.com/support/downloads/HX_Cloud2_Headset_Manual.pdf) | Potvrditi SKU, generaciju, boju i sadržaj pakovanja. |
| Samsung Galaxy Buds FE | [Izvor](https://image-us.samsung.com/SamsungUS/home/my-assets/010924/B2B_BudsFE_SpecSheet.pdf) | Potvrditi SKU, generaciju, boju i sadržaj pakovanja. |
| Sony WH-CH720N | [Izvor](https://www.sony.com.sg/electronics/support/wireless-headphones-bluetooth-headphones/wh-ch720n/specifications) | Potvrditi SKU, generaciju, boju i sadržaj pakovanja. |
| Apple AirPods 4 ANC | [Izvor](https://support.apple.com/en-ie/121204) | Potvrditi SKU, generaciju, boju i sadržaj pakovanja. |
| Bose QuietComfort Ultra Headphones | [Izvor](https://assets.bose.com/content/dam/Bose_DAM/Web/consumer_electronics/global/products/headphones/QCUH-HEADPHONEARN/pdf/884885_OG_QCUH-HEADPHONEARN_en.pdf) | Potvrditi SKU, generaciju, boju i sadržaj pakovanja. |
| Sony WH-1000XM5 | [Izvor](https://www.sony.com.my/electronics/headband-headphones/wh-1000xm5/specifications) | Potvrditi SKU, generaciju, boju i sadržaj pakovanja. |

## Duplikati i postojeći seed

Poređenje naziva ignoriše veličinu slova, dijakritiku, razmake, crtice i zagrade.
Skripta dodatno prepoznaje eksplicitne legacy nazive za ThinkPad E14, Keychron
K2 Wireless, Signature M650 i AirPods 4 ANC. Za ThinkPad se konzervativno
preskače cijela postojeća porodica E14: ne pretpostavlja se da stari zapis
`Lenovo ThinkPad E14 16/512 GB` dokazuje Gen 5. Isto važi za K2 Wireless bez
navedene revizije. Ovi slučajevi prikazuju se kao SKIP_EXISTING_OR_REVIEW_SKU;
preskakanje nije automatsko spajanje niti potvrda identičnog SKU-a.

Ako baza sadrži tačno pet proizvoda iz starog seed-a, plan je **45 novih i 5
preskočenih**: tri tačna modela (S24, WH-1000XM5, MX Master 3S) i dva legacy
slučaja. Ako nema proizvoda, plan je 50 novih. Stvarno stanje baze nije čitano;
pregled će pokazati stvaran broj. Proizvoljne alternativne nazive nije moguće
pouzdano razriješiti bez SKU kolone; provjeriti plan prije odobravanja.

## Izvršavanje tek nakon odobrenja

1. U SQL Server klijentu odabrati odgovarajuću AIShop bazu i provjeriti backup.
2. Nakon korisničkog odobrenja pokretanja otvoriti `seed-products-50.sql` s
   početnim `@Apply = 0` za pregled bez trajnih izmjena.
3. Pregledati svaki WOULD_INSERT i SKIP_EXISTING_OR_REVIEW_SKU, kategorije i
   prijavljene duplikate. Ne mijenjati postojeće podatke automatski.
4. Tek uz odobrenje upisa postaviti `@Apply = 1` i pokrenuti isti fajl.
   Transakcija kratko zaključava tabelu proizvoda da paralelna pokretanja ne
   umetnu iste stavke. Greška vraća transakciju. Pokrenuti van tuđe transakcije.
5. Skripta ispisuje umetnute ID-jeve, broj proizvoda po kategoriji, normalizovane
   duplikate i dvosmislene legacy grupe. Ponovljeni odobreni run treba umetnuti 0.

Ni ovaj pregled ni priprema skripte ne predstavljaju izvršavanje nad SQL
Serverom. Stare migracije i originalni seed nisu izmijenjeni.


## Rezultati provjera pri pripremi

- Statička provjera: 50 jedinstvenih naziva, 10 stavki u svakoj od pet kategorija,
  zaliha 10, sve slike NULL, dozvoljene dužine naziva/opisa, početni @Apply=0 i
  odsustvo UPDATE/DELETE/MERGE operacija nad trajnim tabelama.
- Simulacija poređenja naziva u Pythonu: starih pet seed stavki daje 45 novih i
  pet preskočenih; ponavljanje daje nula novih. Ovo nije SQL Server test.
- Maven: AiConversationServiceTests, AiToolPolicyTests, CartModifyMcpServiceTests,
  PendingCartActionServiceTests, CartContextTests, CartClarificationTests i
  UserApiSecurityTests — 36 testova, bez grešaka.
- Frontend `npm test`: svih šest testnih datoteka prolazi.
- Frontend `npm run build`: uspješan; Vite upozorava na glavni bundle >500 kB.
- SQL skripta nije izvršena, čak ni u preview načinu. Stvarni podaci baze,
  SQL Server izvršavanje/idempotentnost i Ollama integracija nisu provjereni.
  BackendApplicationTests koji podiže infrastrukturu nije pokrenut.
