# Lokální rozhraní pro správu délky banu

Volitelný doplněk pracuje přímo s databází běžícího txAdminu. V nových instalacích se aktivuje až po založení konfigurace pro konkrétní server. Ke stávající instalaci lze nasadit nový `monitor` bez přeinstalace FXServeru a bez výměny dat profilu.

V `txData/<profil>/pm-moderation` vytvoř `config.json` s vlastní hodnotou `serverId` a seznamem `operators`. `operators` obsahuje Discord ID moderátorů jako řetězce. Pro pouze čtecí režim použij prázdné pole. Ve stejné složce vytvoř `read` a `write`. Obě složky musí vlastnit účet txAdminu a mají mít režim `0700`. Po startu txAdmin v nich založí `api.sock` s režimem `0600`.

Botovi připoj pouze potřebné adresáře socketů, ideálně jako read-only bind mount. Zápis povol jen důvěryhodnému botovi, který si ověří komunitu, roli a skutečného autora Discord interakce. Adresáře socketů při dalších nasazeních ponechej na místě, aby mounty dál ukazovaly na správnou složku.

| Operace | Socket | Cesta |
| --- | --- | --- |
| Aktuální bany | `read/api.sock` | `GET /v1/moderation/bans` |
| Původní autor, odvolání a historie všech změn | `read/api.sock` | `GET /v1/moderation/bans/<banId>/audit` |
| Zkrácení nebo prodloužení aktivního dočasného banu | `write/api.sock` | `PATCH /v1/moderation/bans/<banId>` |

Při změně pošli `serverId`, stabilní `requestId`, `actorDiscordId`, `expectedRevision`, `expectedExpiresAt`, nový `expiresAt` a `reason`. Časy jsou Unix sekundy. Záznam zůstane pod původním `banId`. Původní autor a autor odvolání používají jméno účtu txAdminu. Každá změna délky obsahuje Discord ID autora, typ změny, čas, původní a nový konec a důvod. Historie je vidět i v detailu banu ve webovém panelu.

Po ztrátě odpovědi opakuj stejný požadavek se stejným ID. Při konfliktu revize si načti nový stav a nech moderátora potvrdit novou změnu. Při výpadku odlož změny Discord rolí, dokud nedostaneš aktuální snapshot. Po obnově použij `/audit` k doplnění revizí, které bot neviděl.
