# OMKON Project Tracker — Claude Project Memory

## Projekt
- **Working dir:** `PROJECTS/OMKON-Tracker/` (under CLAUDE CO WORK)
- **Tracker fil:** `index.html` — enkelt-fil HTML, ingen build-process
- **Deploy:** GitHub Pages via `git push` til `main`
- **Live URL:** https://mranderson1974.github.io/omkon-tracker/
- **Repo:** https://github.com/MrAnderson1974/omkon-tracker.git
- **Push:** `git add index.html && git commit -m "..." && git push` (token er embedded i remote URL)

---

## Live konfiguration (linje 563–568 i index.html)

```javascript
const SHEET_ID = '1ZwrdoIvV63lwGNqo-JiObDU1WnbMAlkPNh-HCmXwrdc';
const GAS_URL  = 'https://script.google.com/macros/s/AKfycbyVxID4TA4t5muFeeHxPx0MO_gxai3hUFaLosIw20Va3h27KmJ375GJcrBRZ2GfMtuP/exec';
```

- **Google Sheet URL:** https://docs.google.com/spreadsheets/d/1ZwrdoIvV63lwGNqo-JiObDU1WnbMAlkPNh-HCmXwrdc/edit
- Auto-refresh hvert 10 sekunder via CSV-export
- Write-back via Apps Script (mode: no-cors)

---

## Datamodel — PO som primær nøgle (v6, 2026-05-11)

**PO (Purchase Order)** er den unikke identifier for hver projektrække. Brugeren angiver PO ved oprettelse. Ingen client-side generering, ingen race conditions.

```javascript
const COLS = ['PO','Name','Responsible','Email','Phone','KS_Tags','Qty','Price','Total',
  'Pay1Paid','Pay2Paid','Pay3Paid','GoodsReceived','DeliveryApproved','DeliveryRemarks',
  'Deadline','Pickup','PickupConfirmed','KS_DocReceived','KS_DocApproved','KS_Remarks',
  'Pct','OmkonNotes','CPHNotes','Updated','UpdatedBy','Archived','Files',
  'Pay1Date','Pay2Date','Pay3Date','ShippingDate',
  'CBAM_CNCode','CBAM_Route','CBAM_EmDirect','CBAM_EmIndirect','CBAM_Registered',
  'ChangeNote','CBAM_Submitted','Notes',
  'ExtraDesc','ExtraAmount','ExtraPaid','Photos'];
```

⚠️ Apps Script skriver altid COLS som header-række 1 ved hver write — sikrer kolonne-alignment automatisk.
⚠️ Hvis kolonner tilføjes/flyttes i Sheet skal Apps Script redeployes med ny version.
⚠️ **Tidligere CPO-felt + separate PONumber-felt er fjernet** — én PO som primær nøgle.

---

## BOOL_FIELDS — boolean-konvertering fra CSV (MÅ IKKE MANGLE FELTER)

```javascript
const BOOL_FIELDS = ['Pay1Paid','Pay2Paid','Pay3Paid','GoodsReceived','DeliveryApproved',
  'PickupConfirmed','KS_DocReceived','KS_DocApproved','Archived','CBAM_Registered','CBAM_Submitted','ExtraPaid'];
```

⚠️ Alle boolean-felter SKAL stå her — ellers læses "TRUE"/"FALSE" som streng og vises altid som Yes.

---

## Notes / Chat-system — encoding (STABIL — RØR IKKE)

Beskeder gemmes i `Notes`-kolonnen i Sheet som `^^^`/`|||`-separeret streng:

```
{role}|||{author}|||{ISO-timestamp}|||{text}^^^{role}|||{author}|||...
```

- `NOTE_SEP = '^^^'` — adskiller beskeder
- `NOTE_FLD = '|||'` — adskiller felter inden i en besked
- `role` er: `cphsteel` | `omkon` | `system`
- System-beskeder (toggle-ændringer) har `role='system'`, ingen author, renderes som grå pill centreret

**Stabile funktioner:**
```javascript
parseNotes(s)      // streng → [{r, a, ts, t}]
encodeNotes(msgs)  // [{r, a, ts, t}] → streng
renderNotesBubbles(p)  // renderer chat inkl. system-events
openChat(cpo)      // lukker foto/fil-modaler → åbner chat
closeChat()        // lukker chat + foto/fil-modaler
postNoteModal()    // sender besked fra modal
renderChat()       // opdaterer chat-thread og scroller til bund
```

**Filter:** Tomme beskeder + `FALSE`/`TRUE`-strenge filtreres fra i både count og rendering.

---

## CBAM-system

To toggles pr. projekt — rollebaseret:
- **CBAM_Submitted** — kun Omkon kan sætte (CPH Steel ser read-only)
- **CBAM_Registered** — kun CPH Steel kan sætte (Omkon ser read-only)

Begge er i `BOOL_FIELDS`. Toggle-ændringer logges som system-beskeder i Notes.

`finalUnlocked` kræver alle 6 conditions:
```javascript
GoodsReceived && DeliveryApproved && KS_DocReceived && KS_DocApproved && CBAM_Submitted && CBAM_Registered
```

---

## Roller og adgangskontrol

| Handling | CPH Steel | Omkon |
|----------|-----------|-------|
| Opret projekt | ✅ | ❌ |
| Rediger pris/total/navn | ✅ | ❌ |
| Arkiver/reaktiver | ✅ | ❌ |
| KS-toggles (received/approved) | ✅ | ❌ (read-only) |
| Goods received / Delivery approved | ✅ | ❌ (read-only) |
| CBAM verified | ✅ | ❌ (read-only) |
| Progress-slider | ❌ (read-only) | ✅ |
| CBAM submitted | ❌ (read-only) | ✅ |
| Beskeder/chat | ✅ | ✅ |
| Fotos/dokumenter | ✅ | ✅ |
| Cash Flow | ✅ | ❌ (skjult) |

---

## Vigtige funktioner i index.html

| Funktion | Beskrivelse |
|----------|-------------|
| `fetchSheet()` | Henter CSV, parser, bevarer Notes og Photos lokalt |
| `postRow(proj)` | Sender ændring til Apps Script |
| `calcStats()` | Stats-bar: tons (afrundet), EUR, betalt, forfald, projekter |
| `health(pct, dl)` | RED/YELLOW/GREEN logik baseret på progress + deadline |
| `doToggle(cpo, field)` | Toggle boolean felt + log system-besked til Notes |
| `doArchive(cpo)` / `doUnarchive(cpo)` | Kun CPH Steel |
| `cardHTML(p, isArchived)` | Renderer projektkort |
| `renderAll()` | Genrenderer alt, bevarer chat-input værdier |
| `openCashFlow()` | Kun CPH Steel — viser betalingsoversigt |
| `exportXLSX()` | Eksporterer projekter + Cash Flow til .xlsx via SheetJS |

---

## Teknisk arkitektur

- Single-file HTML — ingen build, ingen dependencies udover:
  - Google Fonts CDN (League Spartan + Inter)
  - SheetJS CDN (xlsx-export)
- Fotos/filer: Base64, gemmes **kun lokalt i browser** — synkroniseres IKKE til Sheet
- Foto-separator: `|||` — fil-separator: `^^^` + `|||` (i Files-kolonnen)
- ChangeNote-strip: viser seneste hændelse på kortet — strippes for `^^^`/`|||` ved rendering

---

## Brand

- `--coal: #3B3C3D` | `--tan: #BAA290` | `--steel: #8E9193` | `--cream: #F4F0E8`
- `--red: #C8102E` | `--green: #2E7D32` | `--omk: #3B3580`
- Overskrifter: **League Spartan** (uppercase) — Body: **Inter**

---

## Rettelser og beslutninger

| Dato | Commit | Beskrivelse |
|------|--------|-------------|
| 2026-05-11 | `9195810` | **Fix: 3 issues fundet under live v6 end-to-end test.** (1) GAS_URL opdateret til nyt v6-deployment (ny URL efter "New deployment" i stedet for "New version"). (2) `Total` sendes nu som Number — string "5000.00" kolliderede med Sheets nummer-format-2-decimaler og blev "5000.00.00". (3) `fetchSheet` filter bruger nu PO-kolonne-index i stedet for kolonne A — v6 lader CPO-kolonnen (A) være tom, hvilket fik `r=>r[0]` til at ekskludere valide rækker og tvang frontend til at stole på stale `omkon_new_*` snapshots. End-to-end verificeret begge roller (CPH Steel + Omkon). |
| 2026-05-11 | `dcef311` | **Fix: `createTextContent` → `createTextOutput` i Apps Script v6.** `ContentService.createTextContent` findes ikke i Google Apps Script. Bug eksisterede silent i v5 (frontend bruger no-cors og ignorerer responsen), men TypeError'en stoppede v6's `COLS.forEach` fra at tilføje ny PO-kolonne til sheet-headeren. |
| 2026-05-11 | `3950568` | **Refactor: PO som primær nøgle — CPO-koncept fjernet helt.** Client-side CPO-generering forårsagede race conditions mellem create og toggle writes, og krævede `omkon_new_*` localStorage-workarounds for at overleve refresh før GAS landede. PO findes allerede som ERP-reference og er nu den ene unikke identifier. Apps Script v6 deployes. ~100 referencer i index.html ombygget (p.CPO→p.PO, data-cpo→data-po, payload {CPO:..}→{PO:..}). submitCreate validerer PO ikke-tom + unikhed i stedet for at generere. PONumber-redundant felt fjernet fra cash flow + exports. DEMO data omdøbt til 25001-25007. |
| 2026-05-11 | `*` | **Fix: data tabt ved refresh** — `_recentWrites` var in-memory og forsvandt ved refresh. Boolean toggles og tekst-felter blev ikke gemt i localStorage (kun numeriske). `commitEdit` udvidet til at gemme ALLE felter, `doToggle` capturer prevUpdated + gemmer toggled felter. `fetchSheet` dynamisk restore-loop over alle `omkon_edit_*` nøgler (ikke kun hardkodet liste). Timeout fra 2 min → 5 min. |
| 2026-05-08 | `fdfdb78` | **Fix: dansk komma-decimal i inline edit** — `parseFloat("2,5")` = `2` i JS. Tilføjet `value.replace(',','.')` i `commitEdit()` for felterne `Qty`, `Price`, `Total`, `Pct` inden lagring. |
| 2026-05-08 | `12b0b6d` | **Fix: da-DK tusindtalsformat** — `"15.000"` blev tolket som `15`. Ny `normalizeDaNum()`: komma → fjern tusindpunkter + konvertér decimal; mønster `^\d{1,3}(\.\d{3})+$` → strip tusindpunkter; ellers behold som dot-decimal. Bruges i `commitEdit()`, `fmt()`, `fmtEur()`. |
| 2026-05-08 | `8ccbd8d` | **Feature: Extra services betalingslinje** — ny valgfri betalingslinje (ExtraDesc, ExtraAmount, ExtraPaid) mellem Down payment og 2nd payment. Vises i Pricing & Progress med Grand total. Inline edit på kortet (CPH Steel). localStorage-fallback + fetchSheet-preservation. create form auto-udfylder 2nd payment dato fra pickup dato. |
| 2026-05-08 | `7141c6f` | **Fix: ChangeNote strip fallback** — viser seneste Notes-besked hvis ChangeNote-kolonnen er tom. |
| 2026-05-08 | `fb1977d` | **Fix: progress slider roller** — slider var disabled for Omkon (forkert). Nu: Omkon kan trække slider, CPH Steel er read-only. |
| 2026-05-08 | `*` | **Fix: Apps Script** — skriver COLS som header-række 1 ved hver write. Sikrer kolonne-alignment permanent. ExtraDesc/ExtraAmount/ExtraPaid tilføjet til COLS. |

---

## Nuværende status — stabile features

| Feature | Status |
|---------|--------|
| Google Sheets sync (read + write) | ✅ Stabil |
| Begge roller (CPH Steel + Omkon) | ✅ Stabil |
| Chat/beskeder med historik | ✅ Stabil |
| System-events i chat (toggle-log) | ✅ Stabil |
| CBAM to-toggle system | ✅ Stabil |
| finalUnlocked + missing-array | ✅ Stabil |
| Arkivering + årsgrupper | ✅ Stabil |
| Stats-bar (tons, EUR, projekter) | ✅ Stabil |
| Tooltips på alle felter | ✅ Stabil |
| Fotos + dokumenter upload | ✅ Stabil |
| Excel-export (SheetJS) | ✅ Stabil |
| Cash Flow modal (kun CPH Steel) | ✅ Stabil |
| ChangeNote-strip (seneste hændelse + fallback) | ✅ Stabil |
| GitHub Pages deploy via git push | ✅ Stabil |
| Extra services betalingslinje | ✅ Stabil |
| Progress slider (Omkon styrer) | ✅ Rettet |

---

## Kendte begrænsninger

- Fotos/filer synkroniseres ikke på tværs af enheder (Base64 i localStorage)
- Apps Script write er fire-and-forget (no-cors) — ingen fejlbekræftelse
- Sheet CSV-opdatering er 10 sekunders polling — ikke realtime
