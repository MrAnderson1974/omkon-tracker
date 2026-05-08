# OMKON Project Tracker — Guide

**Til:** CPH Steel teamet  
**Sprog:** Dansk  
**Sidst opdateret:** April 2026

---

## Hvad er det?

En live project tracker der kører i browseren — ingen installation, ingen konto for Omkon. Data deles via Google Sheets. CPH Steel styrer alt. Omkon åbner bare et link.

```
Google Sheet  ←→  HTML-tracker (Netlify)
     ↑                    ↑
  Fælles data       CPH + Omkon
  gemmes her        åbner samme URL
```

---

## Sådan virker det

### Roller
| Rolle | Kan gøre |
|-------|----------|
| **CPH Steel** | Alt — oprette projekter, redigere pris, arkivere |
| **Omkon** | Opdatere progress, toggle KS/levering, tilføje noter og filer |

Skift rolle øverst til højre i trackeren — valget huskes automatisk.

### Auto-sync
- Data hentes fra Google Sheet **hvert 10. sekund** automatisk
- Ændringer gemmes **øjeblikkeligt** når du klikker/redigerer
- Grøn tekst i toppen = "Synkroniseret HH:MM:SS"

### Projekt-statuser
| Farve | Betyd |
|-------|-------|
| 🟢 **GREEN** | På skinner |
| 🟡 **YELLOW** | Deadline inden for 14 dage og under 80% færdig |
| 🔴 **RED** | Deadline inden for 7 dage og ikke 100% — eller overskredet |

---

## Regler

- **Pris og Total** — kun CPH Steel kan redigere
- **Arkivering** — kun CPH Steel kan arkivere og genaktivere projekter
- **Nye projekter** — kun CPH Steel kan oprette
- **KS-felter, betalinger, levering, progress** — begge parter kan opdatere
- **Fotos og filer** — gemmes lokalt i browseren (synkroniseres ikke til Sheet)
- **Arkiverede projekter** — vises i en sammenfoldelig sektion nederst, skjult som standard

---

## Opsætning (én gang — ca. 20 min)

### Trin 1 — Opret Google Sheet

1. Gå til [sheets.google.com](https://sheets.google.com) → **Nyt ark**
2. Navngiv det fx `OMKON Tracker`
3. Klik på celle **A1** og indsæt disse kolonnenavne (kopier hele linjen):

```
CPO	Name	Responsible	Email	Phone	KS_Tags	Qty	Price	Total	Pay1Paid	Pay2Paid	Pay3Paid	GoodsReceived	DeliveryApproved	DeliveryRemarks	Deadline	Pickup	PickupConfirmed	KS_DocReceived	KS_DocApproved	KS_Remarks	Pct	OmkonNotes	CPHNotes	Updated	UpdatedBy	Archived	Files
```

4. Gør arket **offentligt læsebart**:
   - Klik **Del** (øverst højre)
   - Klik **Skift til alle med linket**
   - Vælg **Seer** og klik **Færdig**

5. Kopiér **Sheet ID** fra URL-linjen — det er det lange kryptiske id:
   ```
   https://docs.google.com/spreadsheets/d/ ← HER → /edit
   ```

---

### Trin 2 — Deploy Google Apps Script

Apps Script giver trackeren lov til at **skrive** data tilbage til Sheet.

1. I dit Google Sheet: klik **Udvidelser → Apps Script**
2. Slet al eksisterende kode og indsæt:

```javascript
const COLS = ['CPO','Name','Responsible','Email','Phone','KS_Tags','Qty','Price','Total',
  'Pay1Paid','Pay2Paid','Pay3Paid','GoodsReceived','DeliveryApproved','DeliveryRemarks',
  'Deadline','Pickup','PickupConfirmed','KS_DocReceived','KS_DocApproved','KS_Remarks',
  'Pct','OmkonNotes','CPHNotes','Updated','UpdatedBy','Archived','Files'];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if(sheet.getLastRow() === 0) {
      sheet.getRange(1,1,1,COLS.length).setValues([COLS]);
    }
    let rowIdx = -1;
    if(sheet.getLastRow() > 1) {
      const cpos = sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues();
      for(let i=0;i<cpos.length;i++){
        if(cpos[i][0]===data.CPO){rowIdx=i+2;break;}
      }
    }
    const rowData = [COLS.map(col => data[col]!==undefined ? data[col] : '')];
    if(rowIdx===-1) sheet.appendRow(rowData[0]);
    else sheet.getRange(rowIdx,1,1,COLS.length).setValues(rowData);
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  } catch(err) {
    return ContentService.createTextOutput('Fejl: '+err).setMimeType(ContentService.MimeType.TEXT);
  }
}
function doGet() {
  return ContentService.createTextOutput('OMKON Tracker OK');
}
```

3. Klik **Gem** (diskette-ikon eller Cmd+S)
4. Klik **Deploy → Ny deployment**
5. Vælg **Webapplikation** som type
6. Sæt:
   - *Udfør som:* **Mig**
   - *Hvem har adgang:* **Alle**
7. Klik **Deploy** → klik igennem advarslerne og godkend adgang
8. Kopiér **URL'en** — den ligner:
   ```
   https://script.google.com/macros/s/AKfyc.../exec
   ```

---

### Trin 3 — Indsæt URLs i filen

Åbn `omkon-tracker-demo.html` i en teksteditor (TextEdit på Mac — sæt til **Ren tekst** under Format-menuen).

Find disse to linjer øverst (ca. linje 400):

```javascript
const SHEET_ID = 'YOUR_SHEET_ID_HERE';
const GAS_URL  = 'YOUR_GAS_URL_HERE';
```

Erstat med dine egne værdier og gem filen.

---

### Trin 4 — Upload til Netlify

1. Opret gratis konto på [netlify.com](https://netlify.com) (brug CPH Steel email)
2. Klik **Sites → Add new site → Deploy manually**
3. Træk `omkon-tracker-demo.html` ind i upload-feltet
4. Vent 10 sekunder → du får en URL, fx:
   ```
   https://omkon-tracker.netlify.app
   ```
5. (Valgfrit) Klik **Site settings → Change site name** for en pænere URL

---

## Opdatering af filen

Når du vil opdatere trackeren (ny funktion, rettelse osv.):

1. Åbn `omkon-tracker-demo.html` lokalt og lav ændringen
2. Log ind på [netlify.com](https://netlify.com)
3. Gå til dit site → **Deploys → Drag & drop a new deploy**
4. Træk den opdaterede fil ind → URL forbliver den samme

> Kolleger med adgang til Netlify-kontoen kan gøre det samme.

---

## Del med Omkon

Send Omkon denne besked:

> "Åbn dette link i din browser: **[din Netlify URL]**  
> Vælg *Omkon* i rullemenuen øverst til højre.  
> Ingen installation. Ingen login."

---

## Daglig brug — oversigt

| Hvad | Hvordan |
|------|---------|
| Skift rolle | Rullemenu øverst til højre |
| Rediger tekst/dato | Klik direkte på feltet |
| Toggle betaling/KS/levering | Klik på den grønne/røde pille |
| Opdater production progress | Træk i slideren |
| Nyt projekt | **+ New Project** (kun CPH Steel) |
| Tilføj fotos | **📷 Add photos** på projektkortet |
| Vedhæft filer (PDF, Word, Excel) | **📎 Add files** på projektkortet |
| Arkivér afsluttet projekt | **📦 Arkivér** i kortets header (kun CPH Steel) |
| Se arkiverede projekter | Klik på **▶ Afsluttede projekter** nederst |
| Genaktivér arkiveret projekt | **↩ Genaktivér** på det arkiverede kort |

---

## Fejlfinding

| Problem | Løsning |
|---------|---------|
| Siden viser "Demo mode" | SHEET_ID eller GAS_URL er ikke udfyldt i HTML-filen |
| "Sync fejlede" i topbaren | Tjek at Google Sheet er sat til offentlig læsning (Trin 1, pkt. 4) |
| Ændringer gemmes ikke i Sheet | Tjek at GAS_URL er korrekt — re-deploy Apps Script hvis nødvendigt |
| Omkon kan ikke åbne siden | Tjek at Netlify-linket er rigtigt og at siden er deployed |
| Fotos/filer forsvinder | Fotos og filer gemmes lokalt i browseren — de synkroniseres ikke til Sheet |

---

**Spørgsmål?** Kontakt Jess Andersen — [CPH Steel Marketing](mailto:ja@cphsteel.dk)
