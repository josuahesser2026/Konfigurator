/* =========================================================
   EINFACHER SICHTSCHUTZ (kein echter Zugriffsschutz)
   ========================================================= */
const PASSWORD_HASH = "e6487c3d3b27ecf37b58228efdd1df09da6cee9596111187e6b0eea0b848f551";
const passwordForm = document.getElementById("passwordForm");
passwordForm.addEventListener("submit", async event => {
  event.preventDefault();
  const input = document.getElementById("pagePassword");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input.value));
  const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== PASSWORD_HASH) {
    document.getElementById("passwordError").hidden = false;
    input.select();
    return;
  }
  document.body.classList.remove("locked");
  document.getElementById("passwordGate").hidden = true;
});

/* =========================================================
   EINSTELLUNGEN – hier anpassen
   ========================================================= */
const EMPFAENGER = "josua.hesser.mail@gmail.com";   // an diese Adresse schickt der Kunde das PDF
const BETREFF    = "Inquiry";                    // Anfang des Betreffs

/* Vorschlag für den Mail-Text – der Kunde kann ihn ändern und ergänzen */
function mailText(nummer) {
  return "Dear Sir or Madam,\n\n" +
         "please find attached our inquiry for a customized transformer (project no. " + nummer + ").\n\n" +
         "\n\nBest regards\n";
}

/* Meldungen (englisch) */
const MELDUNG = {
  nr: "Project no."
};


/* =========================================================
   GRUNDLAGEN
   ========================================================= */
const form = document.getElementById("form");
const params = new URLSearchParams(location.search);
// Projekt-Nr.: aus dem Link (?nr=1042), sonst automatisch erzeugt
// Format: JJMMTT-XXX, z. B. 261005-K7Q (Datum + 3 Zufallszeichen)
const ZUFALLS_LAENGE = 3;
function neueNummer() {
  const d = new Date();
  const zwei = n => String(n).padStart(2, "0");
  const zeichen = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne leicht verwechselbare Zeichen wie O/0, I/1
  let zufall = "";
  for (let i = 0; i < ZUFALLS_LAENGE; i++) zufall += zeichen[Math.floor(Math.random() * zeichen.length)];
  return zwei(d.getFullYear() % 100) + zwei(d.getMonth() + 1) + zwei(d.getDate()) + "-" + zufall;
}
const nr = (params.get("nr") || "").trim() || neueNummer();
const jahr = new Date().getFullYear();

// Projekt-Nr. im Kopf anzeigen
document.getElementById("refVal").textContent = nr || "–";

// Jahreszahlen eintragen (data-year="1" = nächstes Jahr, "-2" = vor zwei Jahren)
document.querySelectorAll("[data-year]").forEach(el => {
  el.textContent = jahr + Number(el.dataset.year);
});

// Datum als JJJJ-MM-TT (Format der Datumsfelder)
function datumText(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// Heutiges Datum vorbelegen
const heute = new Date();
document.getElementById("date").value = datumText(heute);

// Gewünschtes Lieferdatum: standardmäßig 6 Wochen (42 Tage) später
const LIEFER_WOCHEN = 6;
const lieferdatum = new Date(heute);
lieferdatum.setDate(lieferdatum.getDate() + LIEFER_WOCHEN * 7);
document.getElementById("delivery").value = datumText(lieferdatum);

// Text eines Elements lesen – ohne Stern, Einheit und Fehlermeldung
function text(el) {
  const kopie = el.cloneNode(true);
  kopie.querySelectorAll(".rq, .err, .u, .lg-short").forEach(x => x.remove()); // kurze Beschriftungen nie in Mail/Datenblatt
  return kopie.textContent.replace(/\s+/g, " ").trim();
}


/* =========================================================
   FELDER EIN-/AUSBLENDEN (data-show-if="name:wert") – für Auswahlknöpfe und Dropdowns
   ========================================================= */
function pruefeBedingungen() {
  document.querySelectorAll("[data-show-if]").forEach(feld => {
    const [name, wert] = feld.dataset.showIf.split(":");
    const elemente = [...form.querySelectorAll(`[name="${name}"]`)];
    // Auswahlknöpfe: angehakt mit diesem Wert / Dropdown und Textfeld: dieser Wert ausgewählt
    let passt = elemente.some(i =>
      (i.type === "radio" || i.type === "checkbox") ? (i.checked && i.value === wert) : i.value === wert);
    // ist das steuernde Feld selbst ausgeblendet, bleibt auch dieses Feld ausgeblendet
    if (elemente.length && elemente[0].closest("[hidden]")) passt = false;
    feld.hidden = !passt;
  });
  // Felder, die nur bei einer Zahl unter einer Grenze erscheinen (data-show-if-below="name:grenze")
  document.querySelectorAll("[data-show-if-below]").forEach(feld => {
    const [name, grenze] = feld.dataset.showIfBelow.split(":");
    const wert = parseFloat(document.getElementById(name).value);
    feld.hidden = !(wert < Number(grenze));
  });
}
form.addEventListener("change", pruefeBedingungen);
form.addEventListener("input", pruefeBedingungen);
pruefeBedingungen();


/* =========================================================
   AUSGÄNGE 1–4
   ========================================================= */
const ausgaenge = [...document.querySelectorAll(".ocard")];
let anzahlAusgaenge = 1;

function zeigeAusgaenge() {
  ausgaenge.forEach((karte, i) => {
    karte.hidden = i >= anzahlAusgaenge;
    // "Entfernen" nur beim letzten sichtbaren Ausgang (nicht bei Ausgang 1)
    karte.querySelector(".remove-out").hidden = !(i === anzahlAusgaenge - 1 && i > 0);
  });
  document.getElementById("addOut").hidden = anzahlAusgaenge >= ausgaenge.length;
}

document.getElementById("addOut").addEventListener("click", () => {
  anzahlAusgaenge++;
  zeigeAusgaenge();
});

ausgaenge.forEach(karte => {
  karte.querySelector(".remove-out").addEventListener("click", () => {
    // Eingaben des Ausgangs leeren
    karte.querySelectorAll("input").forEach(i => {
      if (i.type === "checkbox" || i.type === "radio") i.checked = false; else i.value = "";
    });
    anzahlAusgaenge--;
    zeigeAusgaenge();
    pruefeBedingungen();
    aktualisiereRegler();
  });
});
zeigeAusgaenge();


/* =========================================================
   SCHIEBEREGLER
   Jedes Zahlenfeld mit data-slider="min,max,schritt" bekommt einen Regler.
   data-ticks="0,100,200" legt die Zahlen der Skala fest.
   ========================================================= */
// Breite des Reglergriffs in Pixeln (für die Skala) – auf Touch-Geräten sind die Griffe größer
const DAUMEN_BREITE = window.matchMedia("(pointer: coarse)").matches ? 24 : 16;

document.querySelectorAll("[data-slider]").forEach(zahl => {
  const [min, max, schritt] = zahl.dataset.slider.split(",").map(Number);
  const ticks = (zahl.dataset.ticks || "").split(",").filter(Boolean).map(Number);

  // Regler-Bausteine erzeugen
  const kasten = document.createElement("div");
  kasten.className = "slider unset";
  kasten.innerHTML = `
    <button type="button" class="arr" data-dir="-1" aria-label="−"></button>
    <div class="rail">
      <input type="range" min="${min}" max="${max}" step="${schritt}" value="${min}">
      <div class="ticks"></div>
    </div>
    <button type="button" class="arr" data-dir="1" aria-label="+"></button>`;
  // Zahlenfeld und Regler nebeneinander in eine Zeile setzen
  const zeile = document.createElement("div");
  zeile.className = "slider-row";
  const feld = zahl.closest(".inp");
  feld.before(zeile);
  zeile.append(feld, kasten);

  // Skala zeichnen
  ticks.forEach(t => {
    const anteil = (t - min) / (max - min);
    const s = document.createElement("span");
    s.textContent = t;
    s.style.left = `calc(${anteil * 100}% + ${(0.5 - anteil) * DAUMEN_BREITE}px)`;
    kasten.querySelector(".ticks").append(s);
  });

  const regler = kasten.querySelector("input[type=range]");
  // Startwert: 0, wenn 0 im Bereich liegt (z. B. bei Temperaturen), sonst das Minimum
  const start = (min <= 0 && max >= 0) ? 0 : min;
  regler.value = start;
  zahl._regler = { kasten, regler, min, max, start };

  // Regler bewegt → Zahl eintragen
  regler.addEventListener("input", () => {
    zahl.value = regler.value;
    aktualisiereRegler();
  });
  // Zahl getippt → Regler folgt
  zahl.addEventListener("input", aktualisiereRegler);

  // Pfeile: klicken = ±1 Schritt, gedrückt halten = schnell weiter
  kasten.querySelectorAll(".arr").forEach(pfeil => {
    let warte, wiederhole;
    const schrittMachen = () => {
      const alt = parseFloat(zahl.value);
      const basis = isNaN(alt) ? start : alt;
      const neu = basis + Number(pfeil.dataset.dir) * schritt;
      zahl.value = Math.min(Math.max(Math.round(neu * 100) / 100, min), max);
      aktualisiereRegler();
    };
    const stopp = () => { clearTimeout(warte); clearInterval(wiederhole); };
    pfeil.addEventListener("pointerdown", () => {
      schrittMachen();
      warte = setTimeout(() => { wiederhole = setInterval(schrittMachen, 60); }, 400);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(e => pfeil.addEventListener(e, stopp));
    pfeil.addEventListener("click", e => { if (e.detail === 0) schrittMachen(); }); // Tastatur
  });
});

// Alle Regler an die Zahlenfelder anpassen. Grau = noch kein Wert gesetzt.
function aktualisiereRegler() {
  document.querySelectorAll("[data-slider]").forEach(zahl => {
    const { kasten, regler, min, max, start } = zahl._regler;
    const wert = parseFloat(zahl.value);
    kasten.classList.toggle("unset", isNaN(wert));
    regler.value = isNaN(wert) ? start : Math.min(Math.max(wert, min), max);
  });
}


/* =========================================================
   WIEDERHOLBARE FELDER (data-repeat)
   Enthält mehrere .rep-item – das erste ist sichtbar, weitere kommen per .rep-add dazu.
   ========================================================= */
document.querySelectorAll("[data-repeat]").forEach(gruppe => {
  const teile = [...gruppe.querySelectorAll(".rep-item")];
  const hinzu = gruppe.querySelector(".rep-add");
  let anzahl = 1;

  function zeigen() {
    teile.forEach((teil, i) => {
      teil.hidden = i >= anzahl;
      const weg = teil.querySelector(".rep-remove");
      if (weg) weg.hidden = !(i === anzahl - 1 && i > 0); // nur beim letzten sichtbaren
    });
    hinzu.hidden = anzahl >= teile.length;
  }

  hinzu.addEventListener("click", () => { anzahl++; zeigen(); });
  teile.forEach(teil => {
    const weg = teil.querySelector(".rep-remove");
    if (!weg) return;
    weg.addEventListener("click", () => {
      teil.querySelectorAll("input:not([type=range])").forEach(i => i.value = "");
      anzahl--;
      zeigen();
      aktualisiereRegler();
    });
  });
  zeigen();
});


/* =========================================================
   DOPPEL-SCHIEBEREGLER (min. und max. auf einem Strahl)
   <div data-dual-slider="feldMin,feldMax" data-range="min,max,schritt" data-ticks="...">
   Die Pfeile bewegen den zuletzt angefassten Griff.
   ========================================================= */
document.querySelectorAll("[data-dual-slider]").forEach(platz => {
  const [idMin, idMax] = platz.dataset.dualSlider.split(",");
  const zMin = document.getElementById(idMin);
  const zMax = document.getElementById(idMax);
  const [min, max, schritt] = platz.dataset.range.split(",").map(Number);
  const ticks = (platz.dataset.ticks || "").split(",").filter(Boolean).map(Number);
  const start = (min <= 0 && max >= 0) ? 0 : min;
  // Trennwert (data-split): min.-Griff höchstens bis hier, max.-Griff mindestens ab hier
  const grenze = platz.dataset.split !== undefined ? Number(platz.dataset.split) : null;
  const begrenzeMin = v => grenze === null ? v : Math.min(v, grenze);
  const begrenzeMax = v => grenze === null ? v : Math.max(v, grenze);
  const position = wert => {
    const anteil = (wert - min) / (max - min);
    return `calc(${anteil * 100}% + ${(0.5 - anteil) * DAUMEN_BREITE}px)`;
  };

  platz.className = "slider dual";
  platz.innerHTML = `
    <button type="button" class="arr" data-dir="-1" aria-label="−"></button>
    <div class="rail">
      <div class="dual-wrap">
        <div class="dual-fill"></div>
        <span class="dual-tag dual-tag-min">min</span>
        <span class="dual-tag dual-tag-max">max</span>
        <input type="range" min="${min}" max="${max}" step="${schritt}" aria-label="min.">
        <input type="range" min="${min}" max="${max}" step="${schritt}" aria-label="max.">
      </div>
      <div class="ticks"></div>
    </div>
    <button type="button" class="arr" data-dir="1" aria-label="+"></button>`;

  ticks.forEach(t => {
    const s = document.createElement("span");
    s.textContent = t;
    s.style.left = position(t);
    platz.querySelector(".ticks").append(s);
  });

  const [rMin, rMax] = platz.querySelectorAll("input[type=range]");
  const fuellung = platz.querySelector(".dual-fill");
  const tagMin = platz.querySelector(".dual-tag-min"), tagMax = platz.querySelector(".dual-tag-max");
  const wrap = platz.querySelector(".dual-wrap");
  let aktiv = rMin; // zuletzt angefasster Griff

  // Griffe, Füllung und Farbe an die Zahlenfelder anpassen
  function abgleichen() {
    const vMin = parseFloat(zMin.value), vMax = parseFloat(zMax.value);
    rMin.value = isNaN(vMin) ? min : Math.min(Math.max(vMin, min), max);
    rMax.value = isNaN(vMax) ? max : Math.min(Math.max(vMax, min), max);
    rMin.classList.toggle("leer", isNaN(vMin));
    rMax.classList.toggle("leer", isNaN(vMax));
    // grüner Bereich zwischen den Griffen, sobald ein Wert gesetzt ist
    fuellung.hidden = isNaN(vMin) && isNaN(vMax);
    fuellung.style.left = position(+rMin.value);
    fuellung.style.width = `calc(${position(+rMax.value)} - ${position(+rMin.value)})`;
    // Beschriftung „min" und „max" mittig über den Griffen; liegen die Griffe sehr nah beieinander,
    // rücken die beiden Beschriftungen gerade so weit auseinander, dass sie sich nicht überdecken
    tagMin.style.left = position(+rMin.value);
    tagMax.style.left = position(+rMax.value);
    const abstandPx = (+rMax.value - +rMin.value) / (max - min) * (wrap.clientWidth - DAUMEN_BREITE);
    const brauchtPx = (tagMin.offsetWidth + tagMax.offsetWidth) / 2 + 4;
    const versatz = Math.max(0, (brauchtPx - abstandPx) / 2);
    tagMin.style.setProperty("--v", versatz + "px");
    tagMax.style.setProperty("--v", versatz + "px");
    // liegen die Griffe übereinander, muss der passende oben liegen
    rMin.style.zIndex = +rMin.value > (min + max) / 2 ? 3 : 1;
    rMax.style.zIndex = 2;
  }

  // Griff bewegt → Zahl eintragen (min. nie größer als max.)
  rMin.addEventListener("input", () => {
    zMin.value = begrenzeMin(Math.min(+rMin.value, +rMax.value));
    aktiv = rMin; abgleichen();
  });
  rMax.addEventListener("input", () => {
    zMax.value = begrenzeMax(Math.max(+rMax.value, +rMin.value));
    aktiv = rMax; abgleichen();
  });
  [rMin, rMax].forEach(r => r.addEventListener("pointerdown", () => { aktiv = r; }));
  zMin.addEventListener("focus", () => { aktiv = rMin; });
  zMax.addEventListener("focus", () => { aktiv = rMax; });
  zMin.addEventListener("input", abgleichen);
  zMax.addEventListener("input", abgleichen);
  // getippte Werte nach dem Verlassen des Feldes in den erlaubten Bereich setzen
  zMin.addEventListener("change", () => {
    const v = parseFloat(zMin.value);
    if (!isNaN(v)) zMin.value = begrenzeMin(Math.min(Math.max(v, min), max));
    abgleichen();
  });
  zMax.addEventListener("change", () => {
    const v = parseFloat(zMax.value);
    if (!isNaN(v)) zMax.value = begrenzeMax(Math.min(Math.max(v, min), max));
    abgleichen();
  });

  // Pfeile
  platz.querySelectorAll(".arr").forEach(pfeil => {
    let warte, wiederhole;
    const schrittMachen = () => {
      const istMin = aktiv === rMin;
      const zahl = istMin ? zMin : zMax;
      const alt = parseFloat(zahl.value);
      let neu = (isNaN(alt) ? start : alt) + Number(pfeil.dataset.dir) * schritt;
      neu = Math.round(neu * 100) / 100;
      neu = istMin ? begrenzeMin(Math.min(neu, +rMax.value)) : begrenzeMax(Math.max(neu, +rMin.value));
      zahl.value = Math.min(Math.max(neu, min), max);
      abgleichen();
    };
    const stopp = () => { clearTimeout(warte); clearInterval(wiederhole); };
    pfeil.addEventListener("pointerdown", () => {
      schrittMachen();
      warte = setTimeout(() => { wiederhole = setInterval(schrittMachen, 60); }, 400);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(e => pfeil.addEventListener(e, stopp));
    pfeil.addEventListener("click", e => { if (e.detail === 0) schrittMachen(); });
  });

  abgleichen();
  window.addEventListener("resize", abgleichen); // Abstand der Beschriftungen bei neuer Breite neu berechnen
});


/* =========================================================
   KEINE MINUSWERTE
   Alle Zahlenfelder mit min="0" (Spannungen, Leistungen, Mengen, Maße)
   ========================================================= */
// Minus- und e-Taste in diesen Feldern sperren
form.addEventListener("keydown", e => {
  const t = e.target;
  if (t.type === "number" && t.min === "0" && (e.key === "-" || e.key === "e" || e.key === "E")) e.preventDefault();
});
// eingefügte oder anders entstandene Minuswerte korrigieren
function keineMinuswerte() {
  form.querySelectorAll('input[type=number][min="0"]').forEach(t => {
    const v = parseFloat(t.value);
    if (!isNaN(v) && v < 0) t.value = String(Math.abs(v));
  });
}
form.addEventListener("input", keineMinuswerte);
form.addEventListener("change", keineMinuswerte);


/* =========================================================
   NENNSTROM BERECHNEN (Ausgänge) – wird nur als Hinweis angezeigt, nicht eingetragen
   1-phasig:  I = S / U
   3-phasig:  I = S / (√3 · U)
   S = Nennleistung in VA, U = Nennspannung in V
   ========================================================= */
function berechneStroeme() {
  const dreiphasig = !!form.querySelector('[name="phases"][value="3"]:checked');
  document.querySelectorAll("[data-calc-current]").forEach(feld => {
    const nr = feld.dataset.calcCurrent;
    const leistung = parseFloat(document.getElementById("o" + nr + "_pow").value);
    const spannung = parseFloat(document.getElementById("o" + nr + "_volt").value);
    if (isNaN(leistung) || isNaN(spannung) || spannung <= 0 || leistung < 0) { feld.placeholder = ""; return; }
    const strom = dreiphasig ? leistung / (Math.sqrt(3) * spannung) : leistung / spannung;
    // berechneter Wert erscheint nur blass im leeren Feld – der Kunde kann selbst einen Wert eintragen
    feld.placeholder = String(Math.round(strom * 100) / 100);
  });
}
form.addEventListener("input", berechneStroeme);
form.addEventListener("change", berechneStroeme);
form.addEventListener("click", () => setTimeout(berechneStroeme, 0)); // Pfeile der Regler
berechneStroeme();


/* =========================================================
   WERTE AUSLESEN UND E-MAIL-TEXT BAUEN
   ========================================================= */

// Wert eines Feldes (.f) als Text, leer wenn nichts ausgefüllt
function wertVon(feld) {
  const eingaben = [...feld.querySelectorAll("[name]")];
  if (!eingaben.length) return "";
  // Feldpaar min./max. (data-pair)
  if (feld.hasAttribute("data-pair")) {
    const a = eingaben[0].value.trim(), b = eingaben[1].value.trim();
    if (a && b) return a + " to " + b;
    if (a) return "min. " + a;
    if (b) return "max. " + b;
    return "";
  }
  const typ = eingaben[0].type;
  if (typ === "radio" || typ === "checkbox") {
    return eingaben.filter(i => i.checked).map(i => text(i.nextElementSibling)).join(", ");
  }
  return eingaben[0].value.trim();
}

// Zeilen "Bezeichnung [Einheit]: Wert" für eine Liste von Feldern
function zeilen(felder) {
  // Felder mit data-move-after="id" kommen in der Auflistung direkt hinter das genannte Feld
  felder = [...felder];
  felder.filter(f => f.dataset.moveAfter).forEach(f => {
    const ziel = document.getElementById(f.dataset.moveAfter)?.closest(".f");
    if (!ziel || !felder.includes(ziel)) return;
    felder.splice(felder.indexOf(f), 1);
    felder.splice(felder.indexOf(ziel) + 1, 0, f);
  });
  const ergebnis = [];
  felder.forEach(feld => {
    if (feld.closest("[hidden]")) return;           // ausgeblendete Felder überspringen
    const wert = wertVon(feld);
    if (!wert) return;                                // leere Felder überspringen
    let bezeichnung = text(feld.querySelector("label, .lg"));
    const einheit = feld.querySelector(".u");
    if (einheit) bezeichnung += " [" + text(einheit) + "]";
    ergebnis.push(bezeichnung + ": " + wert);
  });
  return ergebnis;
}

function bauMail() {
  const m = MELDUNG;
  const textZeilen = [m.nr + ": " + (nr || "-"), ""];

  document.querySelectorAll(".sec").forEach(abschnitt => {
    const block = [];

    // Ausgänge mit eigener Überschrift
    abschnitt.querySelectorAll(".ocard").forEach(karte => {
      if (karte.hidden) return;
      const z = zeilen(karte.querySelectorAll(".f"));
      if (z.length) block.push(text(karte.querySelector("strong")) + ":", ...z.map(x => "  " + x));
    });

    // alle übrigen Felder des Abschnitts
    const felder = [...abschnitt.querySelectorAll(".f")].filter(f => !f.closest(".ocard"));
    block.push(...zeilen(felder));

    if (block.length) textZeilen.push("== " + text(abschnitt.querySelector("h2")) + " ==", ...block, "");
  });

  const kunde = document.getElementById("cust").value.trim() || document.getElementById("appl").value.trim();
  const betreff = BETREFF + (nr ? " – " + nr : "") + (kunde ? " – " + kunde : "");
  return { betreff, inhalt: textZeilen.join("\n").trim() };
}

// Prüfregeln für ein Feld:
//  data-req      = muss ausgefüllt sein
//  data-nonzero  = darf nicht 0 sein (Spannungen, Leistungen)
// Gibt "" zurück, wenn alles passt, sonst den Fehlertext.
function fehlerVon(feld) {
  const wert = wertVon(feld);
  if (feld.hasAttribute("data-req") && wert === "") return "Please fill out this box.";
  if (feld.hasAttribute("data-nonzero") && wert !== "" && parseFloat(wert) === 0) return "Please enter a value greater than 0.";
  return "";
}

// Alle Pflicht- und Nicht-null-Felder prüfen und rot markieren
function pruefePflicht() {
  let erstes = null;
  document.querySelectorAll(".f[data-req], .f[data-nonzero]").forEach(feld => {
    if (feld.closest("[hidden]")) { feld.classList.remove("invalid"); return; } // ausgeblendete Felder nicht prüfen
    const fehler = fehlerVon(feld);
    feld.classList.toggle("invalid", fehler !== "");
    const meldung = feld.querySelector(".err");
    if (fehler && meldung) meldung.textContent = fehler;
    if (fehler && !erstes) erstes = feld;
  });
  document.getElementById("sendErr").hidden = !erstes;
  if (erstes) erstes.scrollIntoView({ behavior: "smooth", block: "center" });
  return !erstes;
}

// Sobald ein rot markiertes Feld korrekt ausgefüllt ist, verschwindet die Markierung
function entferneMarkierung() {
  document.querySelectorAll(".f.invalid").forEach(feld => {
    if (fehlerVon(feld) === "") feld.classList.remove("invalid");
  });
  if (!document.querySelector(".f.invalid")) document.getElementById("sendErr").hidden = true;
}
form.addEventListener("input", entferneMarkierung);
form.addEventListener("change", entferneMarkierung);
form.addEventListener("click", () => setTimeout(entferneMarkierung, 0)); // Pfeile der Regler


/* =========================================================
   BUTTONS
   ========================================================= */

// Schritt 2: E-Mail öffnen – Betreff und Text vorbelegt, PDF hängt der Kunde selbst an
function mailLink() {
  const kunde = document.getElementById("cust").value.trim();
  const betreff = BETREFF + " – " + nr + (kunde ? " – " + kunde : "");
  return "mailto:" + EMPFAENGER + "?subject=" + encodeURIComponent(betreff) + "&body=" + encodeURIComponent(mailText(nr));
}
document.getElementById("mail").addEventListener("click", () => {
  if (!pruefePflicht()) return;
  location.href = mailLink();
});

/* =========================================================
   DRUCKANSICHT
   Beim Drucken wird statt des Formulars eine kompakte Auflistung
   aller ausgefüllten Angaben gedruckt.
   ========================================================= */
function esc(t) {
  return String(t).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]));
}

// Zeile "Bezeichnung [Einheit]: Wert" in [Bezeichnung, "Wert Einheit"] zerlegen
function teileZeile(zeile) {
  const pos = zeile.indexOf(": ");
  let bezeichnung = zeile.slice(0, pos), wert = zeile.slice(pos + 2);
  const einheit = bezeichnung.match(/ \[(.+)\]$/);
  if (einheit) { bezeichnung = bezeichnung.replace(/ \[.+\]$/, ""); wert += " " + einheit[1]; }
  return [bezeichnung, wert];
}

function druckDateiname() {
  const datum = document.getElementById("date").value || datumText(new Date());
  const kunde = document.getElementById("cust").value.trim() || "Customer";
  return [datum, nr, kunde]
    .map(teil => teil.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/[. ]+$/g, ""))
    .join("_");
}

function aktualisiereDrucktitel() {
  document.title = druckDateiname();
}
["date", "cust"].forEach(id => {
  document.getElementById(id).addEventListener("input", aktualisiereDrucktitel);
  document.getElementById(id).addEventListener("change", aktualisiereDrucktitel);
});
aktualisiereDrucktitel();

function bauDruckansicht() {
  aktualisiereDrucktitel();
  const heute = document.getElementById("date").value || "";
  let bloecke = "";

  document.querySelectorAll(".sec").forEach(abschnitt => {
    const titel = esc(text(abschnitt.querySelector("h2")));
    let tabelle = "";
    let breit = false;

    // Ausgänge als Tabelle: Zeilen = Output 1, 2, ... / Spalten = Kennwerte (Spannung, Leistung, Strom)
    const karten = [...abschnitt.querySelectorAll(".ocard")].filter(k => !k.hidden);
    if (karten.length) {
      breit = true;
      const spalten = karten.map(k => {
        const werte = {};
        zeilen(k.querySelectorAll(".f")).forEach(z => { const [b, w] = teileZeile(z); werte[b] = w; });
        return { name: text(k.querySelector("strong")), werte };
      });
      const kennwerte = [];
      spalten.forEach(sp => Object.keys(sp.werte).forEach(b => { if (!kennwerte.includes(b)) kennwerte.push(b); }));
      if (kennwerte.length) {
        // eine Zeile pro Ausgang, eine Spalte pro Kennwert
        tabelle += `<table class="pv pv-matrix"><tr><th></th>${kennwerte.map(b => `<th>${esc(b)}</th>`).join("")}</tr>` +
          spalten.map(sp => `<tr><td class="pv-l">${esc(sp.name)}</td>${kennwerte.map(b => `<td>${esc(sp.werte[b] || "–")}</td>`).join("")}</tr>`).join("") +
          `</table>`;
      }
    }

    // übrige Felder als zweispaltige Tabelle
    const felder = [...abschnitt.querySelectorAll(".f")].filter(f => !f.closest(".ocard"));
    const rest = zeilen(felder).map(teileZeile);
    if (rest.length) {
      tabelle += `<table class="pv">` +
        rest.map(([b, w]) => `<tr><td class="pv-l">${esc(b)}</td><td>${esc(w)}</td></tr>`).join("") +
        `</table>`;
    }

    if (tabelle) bloecke += `<section class="pv-sec${breit ? " pv-wide" : ""}"><h2>${titel}</h2>${tabelle}</section>`;
  });

  document.getElementById("printView").innerHTML = `
    <div class="pv-band">
      <div>
        <div class="pv-kicker">Inquiry data sheet</div>
        <div class="pv-title">${esc(text(document.querySelector("h1")))}</div>
      </div>
      <div class="pv-ref">
        <div><span>${esc(MELDUNG.nr)}</span> <strong>${esc(nr || "–")}</strong></div>
        ${heute ? `<div><span>Date</span> <strong>${esc(heute)}</strong></div>` : ""}
      </div>
    </div>
    <div class="pv-body">${bloecke}</div>
    <div class="pv-foot">Generated from the online inquiry form · ${esc(MELDUNG.nr)} ${esc(nr || "–")}</div>`;
}

// auch bei Strg+P bzw. Drucken über das Browsermenü
window.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
    aktualisiereDrucktitel();
    bauDruckansicht();
  }
}, true);
window.addEventListener("beforeprint", bauDruckansicht);

// Als PDF drucken
// Schritt 1: Datenblatt als PDF speichern (Pflichtfelder werden vorher geprüft)
document.getElementById("print").addEventListener("click", () => {
  if (!pruefePflicht()) return;
  aktualisiereDrucktitel();
  bauDruckansicht();
  requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
});
