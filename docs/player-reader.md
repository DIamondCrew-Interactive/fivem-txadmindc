# Živá čtecí služba pro admin menu

Součást DiamondCrew txAdminu od v1.0.14. Čte přímo aktuální objekt databáze
txAdminu v paměti. Nezapisuje do playersDB, nevytváří druhou databázi a nečeká
na pravidelné uložení JSONu. Vidí změny, které už zpracoval txAdmin; nezaručuje
okamžitý údaj o čase hry, který txAdmin sám aktualizuje periodicky.

## Serverové Lua exporty

```lua
-- Před každým voláním a po čekání ověř oprávnění a stejnou relaci hráče!
local result, err = exports.monitor:SearchPlayers('fivem:904336', 25, 0)
local history, err = exports.monitor:GetPlayerHistory('license:' .. hash, 50, 0)
```

Exporty jsou pouze serverové a čekají nejvýše 4 s. Od v1.0.15 vracejí při
každé chybě `false, kod_chyby`; úspěch dál vrací původní tabulku bez změny
schématu. Předchozí v1.0.14 vracela při chybě `nil`, takže FiveM mohlo při
přenosu mezi resources zahodit i druhou návratovou hodnotu. Povolena je resource
`pm_adminmenu`. Jinému důvěryhodnému admin menu přiděl v server.cfg:

```cfg
add_ace resource.nazev_menu dci.txadmin.read allow
```

Toto ACE povoluje pouze volání resource, nikoli přístup hráče. Volající menu
musí samo ověřit své administrátorské oprávnění a výsledek neposílat běžným
hráčům. Exporty nemají žádné RegisterNetEvent ani klientské rozhraní.

Chybové kódy: `invalid_query`, `invalid_identifier`, `invalid_pagination`,
`invalid_request` (fallback pro HTTP 400 bez čitelného těla),
`rate_limited`, `forbidden_resource`, `reader_unavailable`, `reader_timeout`;
služba předává také své kódy jako `database_unavailable`, `service_unavailable`
nebo `unauthorized`. Volající rozlišuje transportní chybu exportu (`pcall`)
od běžné odpovědi `false, kod_chyby`. Adaptér čte také čtvrtý argument
HTTP callbacku FiveM (`errorData`), kam runtime při HTTP chybě předává
diagnostiku s JSON odpovědí. Diagnostický text samotný se nevrací.

## HTTP kontrakt

- Pouze `127.0.0.1:33299` uvnitř konkrétního herního kontejneru. Bez alokace,
  Docker publikovaného portu, HTTP proxy nebo veřejné DNS adresy.
- `GET /v1/players?q=...&limit=25&offset=0`: seznam hráčů, celkový počet,
  stránkování. Prázdné q vrací seznam. Prefixované identifikátory a holá
  číselná ID se hledají přesně, jména částečně bez diakritiky. License lze
  zadat i jako celý holý hash. Limit nejvýše 100.
- `GET /v1/history?identifier=license:...&limit=50&offset=0`: hráč a historie
  ban/warn napříč jeho identifikátory, včetně HWID vazby podle konfigurace
  txAdminu. HWID ani IP odpověď neobsahuje. Pro kanonický profil používej
  license; přímý dotaz na jiný identifikátor vrací tresty pro tento identifikátor.
- `GET /v1/status`: dostupnost připravené databáze.
- `Authorization: Bearer <unikátní klíč instance>`. Klíč vzniká náhodně při
  startu txAdminu, soubor `.runtime/player-reader.json` má 0600 a není mezi
  client files. Lua export si ho načítá uvnitř resource monitor, klíč
  neposílá do NUI ani ho nepředává volajícímu. Nezveřejňuj ho v dokumentaci.
- Odpovědi: `schemaVersion: 1`, `source: txadmin-memory`, `observedAt` v Unix
  sekundách; player obsahuje name, license, identifiers, playTime (minuty),
  joinedAt, lastConnectionAt, whitelistedAt. Historie má stavy active, expired,
  revoked, pending nebo acknowledged. `revocation.timestamp=null` není zrušení.
- 401 špatný klíč, 403 ne-lokální požadavek, 405 zápis, 429 limit 20/s,
  503 nepřipravená databáze. Odpovědi se necachují. Chyba služby neznamená
  prázdnou historii. Při stránkování živá data mohou mezitím přibýt.

Ban/warn a jejich rušení nadále provádí pouze stávající txAdmin mechanismus.
Čtecí rozhraní žádnou takovou operaci nenabízí. Historie obsahuje pouze záznamy,
které txAdmin dosud uchovává; jeho nastavení čištění může staré hráče odstranit.

## Instalace a aktualizace

Monitor a Lua export jsou v jednom ověřeném monitor.zip. Panelový egg musí
používat v1.0.14 nebo novější a odpovídající SHA256. Pouhá úprava výchozího eggu
nezmění ručně přepsané proměnné existujících serverů. Při aktualizaci ponech
txData, profily i herní data. Spusť novou verzi txAdminu a ověř loopback API,
serverové exporty, nezveřejnění klíče a původní resources. Samotný restart
herního procesu bez restartu rodičovského txAdminu neaktivuje nový reader.
