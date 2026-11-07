AI katalog: dijagnostika i minimalna ispravka

Uzrok prije izmjene

- `CatalogMcpAnswerService.isCatalogQuestion` prepoznavao je `misev`, ali ne singular `mis`/`misa`. Reprodukcijski test za „Koji najjeftiniji miš imate?“ vratio je null umjesto poziva alata. Debugger je potvrdio izlazak na tadašnjoj liniji 46; `normalized` je bio `koji najjeftiniji mis imate?`, stack `tryAnswer → singularMouseUsesCatalogTool`.
- Isti servis nije obrađivao superlative, minimalnu cijenu ni budžet „za 300 KM“/„Imam 300 KM“. Čak i prepoznati upit za najskuplji laptop vraćao je običnu listu.
- `ProductMcpTools.searchProducts` već je preko `ProductSpecification` i `ProductRepository` filtrirao kategoriju, min/max cijenu i stock > 0, ali je uvijek birao prvih 20 rezultata po cijeni ASC. Najskuplji proizvod mogao je biti izvan te stranice. Sortiranje takve stranice u modelu ne može riješiti problem.
- `AiToolPolicy` je za CATALOG modelu dopuštao samo `searchProducts` i `getProductDetails`, bez `getCategories`. Direktni katalog je ipak koristio nefiltrirani spisak svih callbackova. To su bila dva neusklađena načina pristupa kategorijama.
- `AiChatService` koristi stvarne MCP callbackove iz `SyncMcpToolCallbackProvider`, filtrira ih politikom i šalje ih Spring AI ChatClientu kroz `.tools(allowedTools)`. MCP server koristi SYNC/STREAMABLE i annotation scanner; `spring.ai.mcp.client.enabled=false` isključuje automatski klijent, ali ne ručni klijent iz `McpClientService`. Lokalni `AiCatalogTools` nije registrovan u ovom chat toku.
- Direktno prepoznati katalog već formatira rezultat MCP alata bez modela. Zato kod tih upita problem nije naknadno iskrivljavanje ispravnog rezultata od strane LLM-a. Kod neprepoznatih upita ide se modelu s konverzacijom i callbackovima; nije dokazano kako se živi Ollama model ponaša niti da se rezultati transportom gube. Reprodukcija dokazuje raniji kvar prepoznavanja i nedostajuću mogućnost DESC, prije tog koraka.
- `ProductService` je CRUD servis i nije u ovom MCP putu. Repository i specifikacija već imaju potrebne filtere; nisu uzrok i nisu mijenjani.

Izmjena

Postojeći `searchProducts` dobio je opcionalne `sortDirection` (ASC/DESC) i `limit` (1–20); baza filtrira i sortira prije ograničenja. Kod jednakih cijena ID daje stabilan redoslijed. Stari overloadi i podrazumijevani ASC/20 ostaju dostupni.

Direktni katalog prepoznaje oblike miš/miševi/miša i dodatne padeže, superlative, budžet, donju granicu i raspon „od X do Y“. Šalje categoryId iz stvarnog getCategories rezultata, availableOnly=true, cijene i traženi sort. Za superlativ traži jedan rezultat iz baze. Odgovor prikazuje stvarne cijene iz MCP rezultata. Politika dopušta getCategories za katalog i direktni put sada koristi isti filtrirani skup alata. Prompt objašnjava iste parametre za modelov fallback.

Provjera

`CatalogRoutingTests`: izvorna reprodukcija sada prolazi.
`CatalogSearchFlowTests`: AiChatService → politika → izbor callbacka → stvarni ProductMcpTools/CategoryMcpTools → stvarni JPA repository i H2 testna baza → MCP JSON → odgovor. Mockovani su MCP konekcija/otkrivanje alata i ChatModel; provjerava se da model nije pozvan za jasne katalog upite. Ovo nije HTTP/MCP transportni ni živi Ollama test.

Testni podaci uključuju više od 20 miševa, druge kategorije, nedostupni najjeftiniji/najskuplji proizvod, granicu 300 KM i naknadnu promjenu cijene u bazi. Provjeravaju se superlativi, budžeti, padeži, raspon, oba smjera, validacija parametara i stari defaults. H2 je samo testna zavisnost; produkcijska baza, Flyway i korpa nisu mijenjani.

Pokrenuto: 45 testova, 0 grešaka i 0 neuspjeha (`-Dtest=*Tests,!BackendApplicationTests`). Postojeći puni `BackendApplicationTests` nije pokrenut jer zahtijeva vanjsku konfiguraciju/servise. Postojeći testovi korpe i konverzacijskog konteksta prolaze.
