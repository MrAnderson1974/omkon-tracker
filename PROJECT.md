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

## Apps Script COLS — kolonne-rækkefølge (MÅ IKKE ÆNDRES uden synkronisering)

```javascript
const COLS = ['CPO','Name','Responsible','Email','Phone','KS_Tags','Qty','Price','Total',
  'Pay1Paid','Pay2Paid','Pay3Paid','GoodsReceived','DeliveryApproved','DeliveryRemarks',
  'Deadline','Pickup','PickupConfirmed','KS_DocReceived','KS_DocApproved','KS_Remarks',
  'Pct','OmkonNotes','CPHNotes','Updated','UpdatedBy','Archived','Files',
  'Pay1Date','Pay2Date','Pay3Date','ShippingDate',
  'CBAM_CNCode','CBAM_Route','CBAM_EmDirect','CBAM_EmIndirect','CBAM_Registered',
  'PONumber','ChangeNote','CBAM_Submitted','Notes'];
```

⚠️ Hvis kolonner tilføjes/flyttes i Sheet skal Apps Script redeployes med ny version.

---

## BOOL_FIELDS — boolean-konvertering fra CSV (MÅ IKKE MANGLE FELTER)

```javascript
const BOOL_FIELDS = ['Pay1Paid','Pay2Paid','Pay3Paid','GoodsReceived','DeliveryApproved',
  'PickupConfirmed','KS_DocReceived','KS_DocApproved','Archived','CBAM_Registered','CBAM_Submitted'];
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
| 2026-05-08 | `fdfdb78` | **Fix: dansk komma-decimal i inline edit** — `parseFloat("2,5")` = `2` i JS. Tilføjet `value.replace(',','.')` i `commitEdit()` for felterne `Qty`, `Price`, `Total`, `Pct` inden lagring. |
| 2026-05-08 | `12b0b6d` | **Fix: da-DK tusindtalsformat** — `"15.000"` blev tolket som `15`. Ny `normalizeDaNum()`: komma → fjern tusindpunkter + konvertér decimal; mønster `^\d{1,3}(\.\d{3})+$` → strip tusindpunkter; ellers behold som dot-decimal. Bruges i `commitEdit()`, `fmt()`, `fmtEur()`. |

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
| ChangeNote-strip (seneste hændelse) | ✅ Stabil |
| GitHub Pages deploy via git push | ✅ Stabil |

---

## Kendte begrænsninger

- Fotos/filer synkroniseres ikke på tværs af enheder (Base64 i localStorage)
- Apps Script write er fire-and-forget (no-cors) — ingen fejlbekræftelse
- Sheet CSV-opdatering er 10 sekunders polling — ikke realtime
