<<<<<<< HEAD
/* CALCULATORS.JS — calculator logic */

// Helper: render calculation results as cards with optional notes/refs
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderCalcResult(resultEl, lines, notes, refs) {
  if (!resultEl) return;
  const valueEl = resultEl.querySelector('.value') || resultEl;
  const cards = [];
  const misc = [];
  lines.forEach(line => {
    if (!line) return;
    let label = '';
    let value = '';
    if (line.includes('≈')) {
      const parts = line.split('≈');
      label = parts[0].trim();
      value = '≈ ' + parts.slice(1).join('≈').trim();
    } else if (line.includes('=')) {
      const parts = line.split('=');
      label = parts[0].trim();
      value = parts.slice(1).join('=').trim();
    } else {
      // fallback: put as misc line
      misc.push(line);
      return;
    }
    cards.push(`<div class="calc-metric-card"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(value)}</div></div>`);
  });

  let html = `<div class="calc-cards">${cards.join('')}</div>`;
  if (misc.length) html += `<div class="calc-notes small">${escapeHtml(misc.join(' · '))}</div>`;
  if (notes) html += `<div class="calc-notes">${escapeHtml(notes)}</div>`;
  if (refs) html += `<div class="calc-refs">References: ${escapeHtml(refs)}</div>`;
  valueEl.innerHTML = html;
  resultEl.classList.add('show');
}

// Power triangle & current
function hitungSegitigaDaya() {
  const V = parseFloat(document.getElementById('sd-v').value) || null;
  const I = parseFloat(document.getElementById('sd-i').value) || null;
  const P = parseFloat(document.getElementById('sd-p').value) || null;
  const S = parseFloat(document.getElementById('sd-s').value) || null;
  const cos = parseFloat(document.getElementById('sd-cos').value) || 0.85;
  const phase = document.getElementById('sd-phase').value;
  const k = phase === '3' ? Math.sqrt(3) : 1;
  const resultEl = document.getElementById('sd-result');
  const resultText = document.getElementById('sd-result-text');
  let deskripsi = [];

  if (V && I) {
    const S_kva = (k * V * I) / 1000;
    const P_kw = S_kva * cos;
    const Q_kvar = S_kva * Math.sin(Math.acos(cos));
    deskripsi = [`S = ${S_kva.toFixed(2)} kVA`, `P = ${P_kw.toFixed(2)} kW`, `Q = ${Q_kvar.toFixed(2)} kVAR`];
  } else if (P && V) {
    const I_calc = (P * 1000) / (k * V * cos);
    const S_kva = P / cos;
    const Q_kvar = S_kva * Math.sin(Math.acos(cos));
    deskripsi = [`I = ${I_calc.toFixed(2)} A`, `S = ${S_kva.toFixed(2)} kVA`, `Q = ${Q_kvar.toFixed(2)} kVAR`];
  } else if (S && V) {
    const I_calc = (S * 1000) / (k * V);
    const P_kw = S * cos;
    const Q_kvar = S * Math.sin(Math.acos(cos));
    deskripsi = [`I = ${I_calc.toFixed(2)} A`, `P = ${P_kw.toFixed(2)} kW`, `Q = ${Q_kvar.toFixed(2)} kVAR`];
  } else if (P && S) {
    const cos_calc = P / S;
    const Q_kvar = Math.sqrt(Math.max(0, S * S - P * P));
    deskripsi = [`cos φ = ${cos_calc.toFixed(3)}`, `Q = ${Q_kvar.toFixed(2)} kVAR`];
  } else {
    resultText.textContent = 'Enter at least 2 values (e.g. V + I, or P + V)';
    resultEl.classList.add('show');
    return;
  }
  renderCalcResult(resultEl, deskripsi, '1 PK = 9,000 Btu/h · 1 TR = 12,000 Btu/h', 'ASHRAE Handbook; local SNI standards');
  MEPHistory.save('Power Triangle & Current', `V=${V||'-'} I=${I||'-'} P=${P||'-'} S=${S||'-'} cos=${cos} ${phase}fasa`, deskripsi.join(' | '));
}

// Sizing breaker & cable
function hitungSizingBreaker() {
  const P = parseFloat(document.getElementById('sb-p').value);
  const V = parseFloat(document.getElementById('sb-v').value) || 380;
  const cos = parseFloat(document.getElementById('sb-cos').value) || 0.85;
  const phase = document.getElementById('sb-phase').value;
  const resultEl = document.getElementById('sb-result');
  const resultText = document.getElementById('sb-result-text');

  if (!P || P <= 0) {
    resultText.textContent = 'Enter a valid power (kW)';
    resultEl.classList.add('show');
    return;
  }

  const k = phase === '3' ? Math.sqrt(3) : 1;
  const In = (P * 1000) / (k * V * cos);
  const sbSafety = parseFloat(document.getElementById('sb-safety')?.value) || 25;
  const InSafety = In * (1 + sbSafety / 100);
  const breakers = [6,10,16,20,25,32,40,50,63,80,100,125,160,200,250,315,400,500,630,800];
  const breaker = breakers.find(b => b >= InSafety) || 800;

  const kabelTable = [
    {mm2:1.5,kha:18},{mm2:2.5,kha:25},{mm2:4,kha:34},{mm2:6,kha:44},{mm2:10,kha:60},
    {mm2:16,kha:78},{mm2:25,kha:103},{mm2:35,kha:126},{mm2:50,kha:154},{mm2:70,kha:192},
    {mm2:95,kha:232},{mm2:120,kha:268},{mm2:150,kha:304},{mm2:185,kha:347},{mm2:240,kha:402}
  ];
  const kabel = kabelTable.find(k => k.kha >= InSafety) || kabelTable[kabelTable.length-1];
  let pe = kabel.mm2 <= 16 ? kabel.mm2 : (kabel.mm2 <= 35 ? 16 : kabel.mm2 / 2);

  const deskripsi = [
    `Nominal current (In) = ${In.toFixed(2)} A`,
    `In × ${sbSafety}% = ${InSafety.toFixed(2)} A`,
    `Recommended breaker = ${breaker} A`,
    `Recommended cable = ${kabel.mm2} mm² (KHA ${kabel.kha} A)`,
    `PE / Grounding = ${pe} mm²`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'SNI / IEC guidance');
  MEPHistory.save('Sizing Breaker & Kabel', `P=${P}kW V=${V}V cos=${cos} ${phase}fasa`, deskripsi.join(' | '));
}

// Voltage drop
function hitungVoltageDrop() {
  const phase = document.getElementById('vd-phase').value;
  const V = parseFloat(document.getElementById('vd-v').value) || (phase === '3' ? 380 : 220);
  const I = parseFloat(document.getElementById('vd-i').value);
  const L = parseFloat(document.getElementById('vd-l').value);
  const R = parseFloat(document.getElementById('vd-r').value) || 0;
  const X = parseFloat(document.getElementById('vd-x').value) || 0.08;
  const cos = parseFloat(document.getElementById('vd-cos').value) || 0.85;
  const resultEl = document.getElementById('vd-result');
  const resultText = document.getElementById('vd-result-text');

  if (!I || !L) {
    resultText.textContent = 'Enter current (A) and length (m)';
    resultEl.classList.add('show');
    return;
  }

  const sin = Math.sin(Math.acos(cos));
  let dU;
  if (phase === '3') {
    dU = Math.sqrt(3) * I * (R * cos + X * sin) * (L / 1000);
  } else {
    dU = 2 * I * (R * cos + X * sin) * (L / 1000);
  }
  const dUpersen = (dU / V) * 100;
  let status = dUpersen <= 4 ? '✅ Safe (≤ 4%)' : '⚠️ Exceeds 4% — increase conductor size';

  const deskripsi = [`ΔU = ${dU.toFixed(2)} Volt`, `Drop = ${dUpersen.toFixed(2)} %`, status];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Voltage Drop', `I=${I}A L=${L}m V=${V} ${phase}fasa`, deskripsi.join(' | '));
}

// Capacitor bank
function hitungCapacitorBank() {
  const P = parseFloat(document.getElementById('cb-p').value);
  const cos1 = parseFloat(document.getElementById('cb-cos1').value) || 0.85;
  const cos2 = parseFloat(document.getElementById('cb-cos2').value) || 0.95;
  const resultEl = document.getElementById('cb-result');
  const resultText = document.getElementById('cb-result-text');

  if (!P || P <= 0) {
    resultText.textContent = 'Enter power (kW)';
    resultEl.classList.add('show');
    return;
  }

  const phi1 = Math.acos(cos1);
  const phi2 = Math.acos(cos2);
  const Qc = P * (Math.tan(phi1) - Math.tan(phi2));

  const deskripsi = [`Qc = ${Qc.toFixed(2)} kVAR`, `From cos φ ${cos1} → ${cos2}`, `Capacitor bank size ≈ ${Math.ceil(Qc)} kVAR`];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Capacitor Bank', `P=${P}kW cos1=${cos1} cos2=${cos2}`, deskripsi.join(' | '));
}

// Cable resistance
function hitungResistansiKabel() {
  const S = parseFloat(document.getElementById('rk-s').value);
  const L = parseFloat(document.getElementById('rk-l').value);
  const material = document.getElementById('rk-mat').value;
  const resultEl = document.getElementById('rk-result');
  const resultText = document.getElementById('rk-result-text');

  if (!S || !L) {
    resultText.textContent = 'Enter conductor size (mm²) and length (m)';
    resultEl.classList.add('show');
    return;
  }

  const rho = material === 'cu' ? 22.5 : 36;
  const R = (rho / S) * (L / 1000);

  const deskripsi = [`R = ${R.toFixed(4)} Ω`, `Material: ${material === 'cu' ? 'Copper (Cu)' : 'Aluminium (Al)'}`, `ρ = ${rho} Ω·mm²/km`];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Resistansi Kabel', `S=${S}mm² L=${L}m ${material}`, deskripsi.join(' | '));
}

// Transformer & genset sizing
function hitungTrafoGenset() {
  const P = parseFloat(document.getElementById('tg-p').value);
  const df = parseFloat(document.getElementById('tg-df').value) || 1.2;
  const cos = parseFloat(document.getElementById('tg-cos').value) || 0.85;
  const resultEl = document.getElementById('tg-result');
  const resultText = document.getElementById('tg-result-text');

  if (!P || P <= 0) {
    resultText.textContent = 'Enter total power (kW)';
    resultEl.classList.add('show');
    return;
  }

  const S_trafo = P * df;
  const P_genset = (P * df) / cos;
  const trafoStd = [100,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150];
  const trafo = trafoStd.find(t => t >= S_trafo) || 3150;

  const deskripsi = [`Transformer size ≈ ${trafo} kVA`, `Generator power ≈ ${P_genset.toFixed(1)} kW`, `Ideal transformer load: 40–80%`];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Sizing Trafo & Genset', `P=${P}kW DF=${df} cos=${cos}`, deskripsi.join(' | '));
}

// Lighting: estimated luminaires
function hitungArmaturLampu() {
  const E = parseFloat(document.getElementById('al-e').value);
  const A = parseFloat(document.getElementById('al-a').value);
  const eta = parseFloat(document.getElementById('al-eta').value) || 0.5;
  const d = parseFloat(document.getElementById('al-d').value) || 0.8;
  const lmW = parseFloat(document.getElementById('al-lmw').value) || 80;
  const watt = parseFloat(document.getElementById('al-watt').value) || 36;
  const resultEl = document.getElementById('al-result');
  const resultText = document.getElementById('al-result-text');

  if (!E || !A) {
    resultText.textContent = 'Enter lux (E) and area (m²)';
    resultEl.classList.add('show');
    return;
  }

  const Q = lmW * watt;
  const N = (E * A) / (eta * Q * d);

  const deskripsi = [`Estimated luminaires ≈ ${Math.ceil(N)} pcs`, `Total lumen = ${(E*A).toFixed(0)} lm`, `Lumen per luminaire = ${Q.toFixed(0)} lm`];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Number of Luminaires', `E=${E}lux A=${A}m²`, deskripsi.join(' | '));
}

// Short circuit
function hitungShortCircuit() {
  const V = parseFloat(document.getElementById('sc-v').value) || 380;
  const S = parseFloat(document.getElementById('sc-s').value);
  const uk = parseFloat(document.getElementById('sc-uk').value) || 4;
  const resultEl = document.getElementById('sc-result');
  const resultText = document.getElementById('sc-result-text');

  if (!S) {
    resultText.textContent = 'Enter transformer capacity (kVA)';
    resultEl.classList.add('show');
    return;
  }

  const Isc = (S * 1000) / (Math.sqrt(3) * V * (uk / 100));
  const deskripsi = [`Isc ≈ ${Isc.toFixed(0)} A`, `Isc ≈ ${(Isc/1000).toFixed(2)} kA`, `Assumed uk = ${uk}%`];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Short Circuit Current', `Trafo=${S}kVA V=${V}V uk=${uk}%`, deskripsi.join(' | '));
}

// HVAC: AC capacity
function hitungKapasitasAC() {
  const W = parseFloat(document.getElementById('ac-w').value);
  const L = parseFloat(document.getElementById('ac-l').value);
  const H = parseFloat(document.getElementById('ac-h').value) || 3;
  const I = parseFloat(document.getElementById('ac-i').value) || 18;
  const E = parseFloat(document.getElementById('ac-e').value) || 18;
  const resultEl = document.getElementById('ac-result');
  const resultText = document.getElementById('ac-result-text');

  if (!W || !L) {
    resultText.textContent = 'Enter room width and length (m)';
    resultEl.classList.add('show');
    return;
  }

  const Q = 0.59 * W * L * H * I * E;
  const pk = Q / 9000;
  const acSf = parseFloat(document.getElementById('ac-sf')?.value) || 10;
  const Q_adj = Q * (1 + acSf / 100);
  const pk_adj = Q_adj / 9000;
  const deskripsi = [
    `Capacity ≈ ${Q.toFixed(0)} Btu/h`,
    `Adjusted (＋${acSf}%) ≈ ${Q_adj.toFixed(0)} Btu/h`,
    `≈ ${pk_adj.toFixed(2)} HP`,
    `≈ ${(Q_adj/12000).toFixed(2)} TR`
  ];
  renderCalcResult(resultEl, deskripsi, `1 PK = 9,000 Btu/h · 1 TR = 12,000 Btu/h`, 'ASHRAE Handbook; local SNI standards');
  MEPHistory.save('Room AC Capacity', `W=${W} L=${L} H=${H}`, deskripsi.join(' | '));
}

// HVAC: AC electric power
function hitungDayaAC() {
  const btu = parseFloat(document.getElementById('dac-btu').value);
  const resultEl = document.getElementById('dac-result');
  const resultText = document.getElementById('dac-result-text');

  if (!btu) {
    resultText.textContent = 'Enter AC capacity (Btu/h)';
    resultEl.classList.add('show');
    return;
  }

  const P = (btu / 9000) * 746 * 1.3;
  const deskripsi = [`Electric power ≈ ${P.toFixed(0)} Watt`, `≈ ${(P/1000).toFixed(2)} kW`, `For cable/breaker sizing`];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('AC Electric Power', `Btu=${btu}`, deskripsi.join(' | '));
}
// HVAC: Refrigerant pipe size lookup
function hitungPipaRefrigerant() {
  const pk = parseFloat(document.getElementById('pr-pk').value);
  const resultEl = document.getElementById('pr-result');
  const resultText = document.getElementById('pr-result-text');

  if (!pk || pk <= 0) {
    resultText.textContent = 'Enter refrigerant load (PK)';
    resultEl.classList.add('show');
    return;
  }

  // Simple lookup based on common R-32 / R-410A data
  let liquid = '-', gas = '-', note = '';
  if (pk <= 1) { liquid = '1/4" (6.35mm)'; gas = '3/8" (9.52mm)'; }
  else if (pk <= 1.5) { liquid = '1/4" (6.35mm)'; gas = '1/2" (12.70mm)'; }
  else if (pk <= 5) { liquid = '3/8" (9.52mm)'; gas = '5/8" (15.88mm)'; }
  else if (pk <= 7) { liquid = '3/8" (9.52mm)'; gas = '3/4" (19.05mm)'; }
  else if (pk <= 11) { liquid = '3/8" (9.52mm)'; gas = '7/8" (22.22mm)'; }
  else if (pk <= 16) { liquid = '1/2" (12.70mm)'; gas = '1-1/8" (28.58mm)'; }
  else if (pk <= 25) { liquid = '5/8" (15.88mm)'; gas = '1-1/8" (28.58mm)'; }
  else { liquid = '3/4" (19.05mm)'; gas = '1-3/8" or larger'; note = 'Check manufacturer manual'; }

  const deskripsi = [
    `Liquid line = ${liquid}`,
    `Gas / Suction = ${gas}`,
    note || 'Standard length ≈ 15m'
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Refrigerant Pipe Size', `PK=${pk}`, deskripsi.join(' | '));
}

// HVAC: Duct sizing
function hitungDucting() {
  const Q = parseFloat(document.getElementById('duct-q').value); // m3/h or CFM
  const v = parseFloat(document.getElementById('duct-v').value) || 5; // m/s
  const unit = document.getElementById('duct-unit').value;
  const resultEl = document.getElementById('duct-result');
  const resultText = document.getElementById('duct-result-text');

  if (!Q || Q <= 0) {
    resultText.textContent = 'Enter air flow (m³/h or CFM)';
    resultEl.classList.add('show');
    return;
  }

  // Convert to m3/s
  let Qm3s = unit === 'cfm' ? Q * 0.0004719 : Q / 3600;
  const A = Qm3s / v; // m²
  const A_cm2 = A * 10000;

  // Estimate square duct side
  const sisi = Math.sqrt(A) * 1000; // mm

  const deskripsi = [
    `Cross-section A = ${A.toFixed(4)} m² (${A_cm2.toFixed(0)} cm²)`,
    `Estimated square side ≈ ${sisi.toFixed(0)} mm`,
    `Velocity = ${v} m/s`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Dimensi Ducting', `Q=${Q} ${unit} v=${v}m/s`, deskripsi.join(' | '));
}

// HVAC: Diffuser count
function hitungDiffuser() {
  const Q = parseFloat(document.getElementById('dif-q').value); // CFM
  const p = parseFloat(document.getElementById('dif-p').value) || 300; // mm
  const l = parseFloat(document.getElementById('dif-l').value) || 300; // mm
  const v = parseFloat(document.getElementById('dif-v').value) || 2.5; // m/s
  const resultEl = document.getElementById('dif-result');
  const resultText = document.getElementById('dif-result-text');

  if (!Q) {
    resultText.textContent = 'Enter airflow (CFM)';
    resultEl.classList.add('show');
    return;
  }

  // S = (Q × 472) / (p × l × v)   → number of points
  const S = (Q * 472) / (p * l * v);

  const deskripsi = [
    `Estimated diffusers ≈ ${Math.ceil(S)} pcs`,
    `Each diffuser = ${p} × ${l} mm`,
    `Velocity = ${v} m/s`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Number of Diffusers', `Q=${Q}CFM ${p}x${l}mm v=${v}`, deskripsi.join(' | '));
}

// HVAC: AHU/FCU fan power
function hitungDayaAHU() {
  const Q = parseFloat(document.getElementById('ahu-q').value); // CFM
  const dP = parseFloat(document.getElementById('ahu-dp').value) || 375; // Pa (1.5 inWg ≈ 375)
  const v = parseFloat(document.getElementById('ahu-v').value) || 3; // m/s
  const eff = parseFloat(document.getElementById('ahu-eff').value) || 0.8;
  const resultEl = document.getElementById('ahu-result');
  const resultText = document.getElementById('ahu-result-text');

  if (!Q) {
    resultText.textContent = 'Enter airflow (CFM)';
    resultEl.classList.add('show');
    return;
  }

  // Approximation: P = Q × 1.7 × (ΔP + v²×0.6) / (η × 3600)
  const P = Q * 1.7 * (dP + v * v * 0.6) / (eff * 3600);

  const deskripsi = [
    `Fan power ≈ ${P.toFixed(0)} Watt`,
    `≈ ${(P/1000).toFixed(2)} kW`,
    `ΔP = ${dP} Pa · η = ${eff}`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('AHU/FCU Fan Power', `Q=${Q}CFM ΔP=${dP}Pa`, deskripsi.join(' | '));
}

// HVAC: CHWS pump capacity
function hitungPompaCHWS() {
  const TR = parseFloat(document.getElementById('chws-tr').value);
  const jenis = document.getElementById('chws-jenis').value;
  const resultEl = document.getElementById('chws-result');
  const resultText = document.getElementById('chws-result-text');

  if (!TR) {
    resultText.textContent = 'Enter chiller capacity (TR)';
    resultEl.classList.add('show');
    return;
  }

  const X = jenis === 'air' ? 9.1 : 11.4; // LPM per TR
  const Q = X * TR;
  const chwsSf = parseFloat(document.getElementById('chws-sf')?.value) || 15;
  const Q_adj = Q * (1 + chwsSf / 100);

  const deskripsi = [
    `Water flow ≈ ${Q.toFixed(1)} LPM`,
    `Adjusted (＋${chwsSf}%) ≈ ${Q_adj.toFixed(1)} LPM`,
    `≈ ${(Q_adj/60).toFixed(2)} LPS`,
    `Type: ${jenis === 'air' ? 'Air Cooled' : 'Water Cooled'} (${X} LPM/TR)`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'ASHRAE; local SNI');
  MEPHistory.save('CHWS Pump Capacity', `TR=${TR} ${jenis}`, deskripsi.join(' | '));
}

// Plumbing: pipe diameter
function hitungDiameterPipa() {
  const Q = parseFloat(document.getElementById('dp-q').value); // LPM
  const v = parseFloat(document.getElementById('dp-v').value) || 1.5; // m/s
  const resultEl = document.getElementById('dp-result');
  const resultText = document.getElementById('dp-result-text');

  if (!Q || Q <= 0) {
    resultText.textContent = 'Enter pipe flow (LPM)';
    resultEl.classList.add('show');
    return;
  }

  // d = √( (200 × Q) / (3 × π × v) )   → result in mm (approximation)
  const d = Math.sqrt((200 * Q) / (3 * Math.PI * v));

  // Commercial sizes
  const sizes = [20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300];
  const recommended = sizes.find(s => s >= d) || sizes[sizes.length - 1];

  const deskripsi = [
    `Calculated diameter = ${d.toFixed(1)} mm`,
    `Recommended commercial size = ${recommended} mm`,
    `Velocity = ${v} m/s`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Diameter Pipa Plumbing', `Q=${Q}LPM v=${v}m/s`, deskripsi.join(' | '));
}

// Plumbing: pump head
function hitungHeadPompa() {
  const Lv = parseFloat(document.getElementById('hp-lv').value) || 0; // vertical lift
  const Lt = parseFloat(document.getElementById('hp-lt').value) || 0; // total pipe length
  const f = parseFloat(document.getElementById('hp-f').value) || 0.04; // friction factor m/m
  const Pf = parseFloat(document.getElementById('hp-pf').value) || 10; // fixture pressure (m)
  const safety = parseFloat(document.getElementById('hp-sf').value) || 10; // %
  const resultEl = document.getElementById('hp-result');
  const resultText = document.getElementById('hp-result-text');

  const H = Lv + (Lt * f) + Pf;
  const Htotal = H * (1 + safety / 100);

  const deskripsi = [
    `Theoretical head = ${H.toFixed(1)} m`,
    `Head + safety ${safety}% = ${Htotal.toFixed(1)} m`,
    `Recommended pump head ≥ ${Math.ceil(Htotal)} m`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Head Pompa Plumbing', `Lv=${Lv} Lt=${Lt} Pf=${Pf}`, deskripsi.join(' | '));
}

// Plumbing: pump electric power
function hitungDayaPompa() {
  const H = parseFloat(document.getElementById('dpy-h').value);
  const Q = parseFloat(document.getElementById('dpy-q').value); // LPM
  const eta = parseFloat(document.getElementById('dpy-eta').value) || 0.6;
  const f = parseFloat(document.getElementById('dpy-f').value) || 1.1;
  const resultEl = document.getElementById('dpy-result');
  const resultText = document.getElementById('dpy-result-text');

  if (!H || !Q) {
    resultText.textContent = 'Enter head (m) and flow (LPM)';
    resultEl.classList.add('show');
    return;
  }

  // P = (0.163 × H × Q × f) / η     (Q in LPM)
  const P = (0.163 * H * Q * f) / eta;
  const dpySf = parseFloat(document.getElementById('dpy-sf')?.value) || 15;
  const P_adj = P * (1 + dpySf / 100);

  const deskripsi = [
    `Pump power ≈ ${P.toFixed(0)} Watt`,
    `Adjusted (＋${dpySf}%) ≈ ${P_adj.toFixed(0)} Watt`,
    `≈ ${(P_adj / 1000).toFixed(2)} kW`,
    `η = ${eta} · factor = ${f}`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: local SNI / hydraulic practice');
  MEPHistory.save('Pump Electric Power', `H=${H}m Q=${Q}LPM`, deskripsi.join(' | '));
}

// Plumbing: ground tank capacity (simple)
function hitungGroundTank() {
  const Qd = parseFloat(document.getElementById('gt-qd').value); // liters/day
  const jam = parseFloat(document.getElementById('gt-jam').value) || 8;
  const resultEl = document.getElementById('gt-result');
  const resultText = document.getElementById('gt-result-text');

  if (!Qd) {
    resultText.textContent = 'Enter daily water demand (liters)';
    resultEl.classList.add('show');
    return;
  }

  // Rough estimate: tank volume ≈ 1 day demand + backup
  const V = Qd / 1000; // m³
  const gtStorage = parseFloat(document.getElementById('gt-storage')?.value) || 20;
  const Vcadangan = V * (1 + gtStorage / 100);

  const deskripsi = [
    `Demand = ${Qd.toFixed(0)} liters/day`,
    `Minimum tank volume ≈ ${V.toFixed(2)} m³`,
    `With ${gtStorage}% backup ≈ ${Vcadangan.toFixed(2)} m³`,
    `Assumed operating hours = ${jam} h`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Ground Tank Capacity', `Qd=${Qd}L/day`, deskripsi.join(' | '));
}
// Fire: pump capacity
function hitungKapasitasPompaFF() {
  const sprinkler = parseFloat(document.getElementById('ff-spr').value) || 0;
  const ihb = parseFloat(document.getElementById('ff-ihb').value) || 0;
  const pillar = parseFloat(document.getElementById('ff-pillar').value) || 0;
  const jockey = parseFloat(document.getElementById('ff-jockey').value) || 10; // %
  const resultEl = document.getElementById('ff-result');
  const resultText = document.getElementById('ff-result-text');

  // Standard flow assumptions
  const Q_spr = sprinkler * 80;      // LPM per point
  const Q_ihb = ihb * 400;           // LPM per IHB
  const Q_pillar = pillar * 1000;    // LPM per pillar
  const Q_total = Q_spr + Q_ihb + Q_pillar;
  const Q_jockey = Q_total * (jockey / 100);
    const ffMargin = parseFloat(document.getElementById('ff-margin')?.value) || 10;
    const Q_total_adj = Q_total * (1 + ffMargin / 100);
    const Q_jockey_adj = Q_total_adj * (jockey / 100);

  const deskripsi = [
    `Sprinkler flow = ${Q_spr.toFixed(0)} LPM`,
    `IHB flow = ${Q_ihb.toFixed(0)} LPM`,
    `Hydrant pillar flow = ${Q_pillar.toFixed(0)} LPM`,
      `Main pump flow ≈ ${Q_total.toFixed(0)} LPM`,
      `Adjusted (＋${ffMargin}%) ≈ ${Q_total_adj.toFixed(0)} LPM`,
    `Jockey pump ≈ ${Q_jockey.toFixed(0)} LPM (${jockey}%)`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Fire Pump Capacity', `Spr=${sprinkler} IHB=${ihb} Pillar=${pillar}`, deskripsi.join(' | '));
}

// Fire: pump head
function hitungHeadPompaFF() {
  const Lvert = parseFloat(document.getElementById('ffh-lv').value) || 0;
  const Ljauh = parseFloat(document.getElementById('ffh-lj').value) || 0;
  const f = parseFloat(document.getElementById('ffh-f').value) || 0.05;
  const Phyd = parseFloat(document.getElementById('ffh-ph').value) || 4; // bar
  const Pspr = parseFloat(document.getElementById('ffh-ps').value) || 1; // bar
  const resultEl = document.getElementById('ffh-result');
  const resultText = document.getElementById('ffh-result-text');

  // H = vertical lift + longest run × friction + (hydrant + sprinkler pressure) × 10
  const H = Lvert + (Ljauh * f) + (Phyd + Pspr) * 10;

  const deskripsi = [
    `Pump head ≈ ${H.toFixed(1)} m`,
    `≈ ${(H / 10).toFixed(2)} bar`,
    `Recommended pump head ≥ ${Math.ceil(H)} m`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Fire Pump Head', `Lv=${Lvert} Lj=${Ljauh}`, deskripsi.join(' | '));
}

// Fire: pump electric power
function hitungDayaPompaFF() {
  const H = parseFloat(document.getElementById('ffd-h').value);
  const Q = parseFloat(document.getElementById('ffd-q').value); // LPM
  const eta = parseFloat(document.getElementById('ffd-eta').value) || 0.65;
  const sf = parseFloat(document.getElementById('ffd-sf').value) || 1.15;
  const resultEl = document.getElementById('ffd-result');
  const resultText = document.getElementById('ffd-result-text');

  if (!H || !Q) {
    resultText.textContent = 'Enter head (m) and flow (LPM)';
    resultEl.classList.add('show');
    return;
  }

  // Q in LPS = Q / 60
  // P = 0.163 × H × Q(LPS) × SF / η
  const Qlps = Q / 60;
  const P = (0.163 * H * Qlps * sf) / eta;

  const deskripsi = [
    `Pump power ≈ ${P.toFixed(0)} Watt`,
    `≈ ${(P / 1000).toFixed(2)} kW`,
    `η = ${eta} · SF = ${sf}`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'NFPA 20; local SNI');
  MEPHistory.save('Fire Pump Power', `H=${H}m Q=${Q}LPM`, deskripsi.join(' | '));
}

// Fire: tank capacity
function hitungTangkiFF() {
  const Q = parseFloat(document.getElementById('fft-q').value); // LPM or USGPM
  const t = parseFloat(document.getElementById('fft-t').value) || 30; // minutes
  const unit = document.getElementById('fft-unit').value;
  const resultEl = document.getElementById('fft-result');
  const resultText = document.getElementById('fft-result-text');

  if (!Q) {
    resultText.textContent = 'Enter pump flow (LPM)';
    resultEl.classList.add('show');
    return;
  }

  let V;
  if (unit === 'usgpm') {
    // V = Q(USGPM) × t(minutes) × 0.003785 → m³
    V = Q * t * 0.003785;
  } else {
    // Q in LPM → liters = Q × t → m³
    V = (Q * t) / 1000;
  }

  const deskripsi = [
    `Tank volume ≈ ${V.toFixed(2)} m³`,
    `≈ ${(V * 1000).toFixed(0)} liters`,
    `Duration = ${t} minutes`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'NFPA guidance; local SNI');
  MEPHistory.save('Fire Tank Capacity', `Q=${Q} t=${t}min`, deskripsi.join(' | '));
}

// Fire: sprinkler pipe size
function hitungSprinklerPipeSizeFF() {
  const points = parseInt(document.getElementById('ffsp-points').value, 10);
  const flow = parseFloat(document.getElementById('ffsp-flow').value) || 80;
  const resultEl = document.getElementById('ffsp-result');
  const resultText = document.getElementById('ffsp-result-text');

  if (!points || points < 1) {
    resultText.textContent = 'Enter the number of sprinkler points';
    resultEl.classList.add('show');
    return;
  }

  const totalFlow = points * flow;
  const mapping = [
    { maxPoints: 1, size: 25 },
    { maxPoints: 2, size: 32 },
    { maxPoints: 4, size: 40 },
    { maxPoints: 8, size: 50 },
    { maxPoints: 12, size: 65 },
    { maxPoints: 18, size: 80 },
    { maxPoints: 24, size: 100 },
  ];
  const recommended = mapping.find(item => points <= item.maxPoints)?.size || 125;

  const deskripsi = [
    `Sprinkler points = ${points}`,
    `Total flow ≈ ${totalFlow.toFixed(0)} LPM`,
    `Recommended pipe = Ø${recommended} mm`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'NFPA 13; Manufacturer data');
  MEPHistory.save('Sprinkler Pipe Size', `points=${points} flow=${flow}`, deskripsi.join(' | '));
}

// Electronic: speaker SPL
function hitungSPL() {
  const sensitivity = parseFloat(document.getElementById('sp-sensitivity').value) || 90;
  const power = parseFloat(document.getElementById('sp-power').value) || 50;
  const distance = parseFloat(document.getElementById('sp-distance').value) || 1;
  const count = parseInt(document.getElementById('sp-count').value, 10) || 1;
  const target = parseFloat(document.getElementById('sp-target').value);
  const resultEl = document.getElementById('sp-result');
  const resultText = document.getElementById('sp-result-text');

  if (!power || power <= 0 || !distance || distance <= 0 || !count || count <= 0) {
    resultText.textContent = 'Enter valid speaker power, distance, and count';
    resultEl.classList.add('show');
    return;
  }

  const splSingle = sensitivity + 10 * Math.log10(power) - 20 * Math.log10(distance);
  const splTotal = splSingle + 10 * Math.log10(count);
  const spMargin = parseFloat(document.getElementById('sp-margin')?.value) || 3;
  const delta = target ? (splTotal - target).toFixed(1) : null;
  const meetsWithMargin = target ? (splTotal >= (target + spMargin)) : null;

  const deskripsi = [
    `Single speaker = ${splSingle.toFixed(1)} dB`,
    `Combined ${count} speakers ≈ ${splTotal.toFixed(1)} dB`
  ];
  if (target) {
    if (meetsWithMargin) {
      deskripsi.push(`Target ${target.toFixed(1)} dB + ${spMargin} dB margin → OK`);
    } else {
      const need = ((target + spMargin) - splTotal).toFixed(1);
      deskripsi.push(`Target ${target.toFixed(1)} dB + ${spMargin} dB margin → Need ${need} dB more`);
    }
  }

  renderCalcResult(resultEl, deskripsi, '', 'ISO 3744; local acoustic guidelines');
  MEPHistory.save('Speaker SPL', `sens=${sensitivity} dB power=${power}W dist=${distance}m count=${count}`, `SPL=${splTotal.toFixed(1)} dB`);
}

// Fire: pipe diameter
function hitungDiameterPipaFF() {
  const Q = parseFloat(document.getElementById('ffp-q').value); // LPM
  const v = parseFloat(document.getElementById('ffp-v').value) || 3.5; // m/s
  const resultEl = document.getElementById('ffp-result');
  const resultText = document.getElementById('ffp-result-text');

  if (!Q) {
    resultText.textContent = 'Enter flow (LPM)';
    resultEl.classList.add('show');
    return;
  }

  const d = Math.sqrt((200 * Q) / (3 * Math.PI * v));
  const sizes = [50, 65, 80, 100, 125, 150, 200, 250, 300];
  const recommended = sizes.find(s => s >= d) || 300;

  const deskripsi = [
    `Calculated diameter = ${d.toFixed(1)} mm`,
    `Commercial size = ${recommended} mm`,
    `Velocity = ${v} m/s (typical 3–4.5 m/s)`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'NFPA 13; local SNI');
  MEPHistory.save('Diameter Pipa FF', `Q=${Q}LPM v=${v}`, deskripsi.join(' | '));
}

// ========= Converter: generic unit conversions =========
function updateConverterUnits() {
  const cat = document.getElementById('conv-category').value;
  const from = document.getElementById('conv-from');
  const to = document.getElementById('conv-to');
  from.innerHTML = '';
  to.innerHTML = '';
  const opts = {
    length: ['mm','cm','m','in'],
    area: ['mm²','cm²','m²'],
    volume: ['mm³','cm³','L','m³'],
    flow: ['m³/h','CFM','L/s'],
    power: ['W','kW','HP','Btu/h'],
    temperature: ['°C','°F','K'],
    electrical: ['W','A']
  };
  const list = opts[cat] || ['--'];
  list.forEach(u => {
    const o1 = document.createElement('option'); o1.value = u; o1.textContent = u; from.appendChild(o1);
    const o2 = document.createElement('option'); o2.value = u; o2.textContent = u; to.appendChild(o2);
  });
  // show voltage if electrical
  document.getElementById('conv-voltage-group').style.display = cat === 'electrical' ? '' : 'none';
}

function hitungConverter() {
  const cat = document.getElementById('conv-category').value;
  const v = parseFloat(document.getElementById('conv-value').value);
  const from = document.getElementById('conv-from').value;
  const to = document.getElementById('conv-to').value;
  const resultEl = document.getElementById('conv-result');
  const valueEl = resultEl.querySelector('.value');
  if (!v && v !== 0) { valueEl.textContent = 'Enter a numeric value'; resultEl.classList.add('show'); return; }

  // helper: convert via base units
  const lengthToM = {'mm':0.001,'cm':0.01,'m':1,'in':0.0254};
  const areaToM2 = {'mm²':1e-6,'cm²':1e-4,'m²':1};
  const volToM3 = {'mm³':1e-9,'cm³':1e-6,'L':0.001,'m³':1};
  const flowToM3s = {'m³/h':1/3600,'CFM':0.00047194745,'L/s':0.001};
  const powerToW = {'W':1,'kW':1000,'HP':746,'Btu/h':0.29307107};

  let out = '';
  try {
    if (cat === 'length') {
      const m = v * (lengthToM[from] || 1);
      const conv = m / (lengthToM[to] || 1);
      out = `${v} ${from} = ${conv} ${to}`;
    } else if (cat === 'area') {
      const m2 = v * (areaToM2[from] || 1);
      const conv = m2 / (areaToM2[to] || 1);
      out = `${v} ${from} = ${conv} ${to}`;
    } else if (cat === 'volume') {
      const m3 = v * (volToM3[from] || 1);
      const conv = m3 / (volToM3[to] || 1);
      out = `${v} ${from} = ${conv} ${to}`;
    } else if (cat === 'flow') {
      const m3s = v * (flowToM3s[from] || 1);
      const conv = m3s / (flowToM3s[to] || 1);
      out = `${v} ${from} = ${conv} ${to}`;
    } else if (cat === 'power') {
      const w = v * (powerToW[from] || 1);
      const conv = w / (powerToW[to] || 1);
      out = `${v} ${from} = ${conv} ${to}`;
    } else if (cat === 'temperature') {
      let c;
      if (from === '°C') c = v;
      else if (from === '°F') c = (v - 32) * 5/9;
      else if (from === 'K') c = v - 273.15;
      let res;
      if (to === '°C') res = c;
      else if (to === '°F') res = c * 9/5 + 32;
      else if (to === 'K') res = c + 273.15;
      out = `${v} ${from} = ${res} ${to}`;
    } else if (cat === 'electrical') {
      // support W <-> A (single-phase by default)
      const V = parseFloat(document.getElementById('conv-voltage').value) || 230;
      if (from === 'W' && to === 'A') {
        const A = v / V;
        out = `${v} W ≈ ${A.toFixed(3)} A (at ${V} V)`;
      } else if (from === 'A' && to === 'W') {
        const W = v * V;
        out = `${v} A ≈ ${W.toFixed(2)} W (at ${V} V)`;
      } else {
        out = 'Unsupported electrical conversion';
      }
    } else {
      out = 'Unsupported conversion';
    }
  } catch (e) {
    out = 'Conversion error';
  }

  valueEl.innerHTML = `<div class="calc-notes">${out}</div>`;
  resultEl.classList.add('show');
  MEPHistory.save('Converter', `${v} ${from} → ${to}`, out);
}

// initialize converter selects on load
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('conv-category')) updateConverterUnits();
});

// Specific converter functions for the new cards
function convertBTUtoPKTR() {
  const v = parseFloat(document.getElementById('btu-value').value);
  const resEl = document.getElementById('btu-result');
  if (!v && v !== 0) { resEl.querySelector('.value').textContent = 'Enter BTU/h value'; resEl.classList.add('show'); return; }
  const pk = v / 9000; // 1 PK = 9000 Btu/h
  const tr = v / 12000; // 1 TR = 12000 Btu/h
  const out = `≈ ${pk.toFixed(3)} PK · ${tr.toFixed(3)} TR`;
  resEl.querySelector('.value').innerHTML = `<div class="calc-notes">${out}</div>`;
  resEl.classList.add('show');
  MEPHistory.save('BTU → PK/TR', `BTU=${v}`, out);
}

function convertPKtoWatt() {
  const pk = parseFloat(document.getElementById('pk-value').value);
  const resEl = document.getElementById('pk-result');
  if (!pk && pk !== 0) { resEl.querySelector('.value').textContent = 'Enter PK value'; resEl.classList.add('show'); return; }
  const btu = pk * 9000;
  const watt = btu * 0.29307107;
  const out = `${pk} PK ≈ ${watt.toFixed(0)} W (${btu.toFixed(0)} Btu/h)`;
  resEl.querySelector('.value').innerHTML = `<div class="calc-notes">${out}</div>`;
  resEl.classList.add('show');
  MEPHistory.save('PK → W', `PK=${pk}`, out);
}

function convertM3hToCFM() {
  const v = parseFloat(document.getElementById('m3h-value').value);
  const resEl = document.getElementById('m3h-result');
  if (!v && v !== 0) { resEl.querySelector('.value').textContent = 'Enter m³/h value'; resEl.classList.add('show'); return; }
  const cfm = v * 0.588577; // 1 m3/h = 0.588577 CFM
  const ls = (v / 3600) * 1000 / 1000; // placeholder: we'll compute L/s below
  const lps = v / 3600; // m3/s => L/s = m3/s * 1000 => v/3.6 ? wait
  const l_s = v / 3.6; // m3/h to L/s: divide by 3.6
  const out = `${v} m³/h ≈ ${cfm.toFixed(2)} CFM · ${l_s.toFixed(3)} L/s`;
  resEl.querySelector('.value').innerHTML = `<div class="calc-notes">${out}</div>`;
  resEl.classList.add('show');
  MEPHistory.save('m³/h → CFM', `m3h=${v}`, out);
}

function convertCFMToLs() {
  const v = parseFloat(document.getElementById('cfm-value').value);
  const resEl = document.getElementById('cfm-result');
  if (!v && v !== 0) { resEl.querySelector('.value').textContent = 'Enter CFM value'; resEl.classList.add('show'); return; }
  const m3h = v * 1.699; // 1 CFM ≈ 1.699 m3/h
  const l_s = (m3h / 3600) * 1000; // convert m3/h to L/s
  const out = `${v} CFM ≈ ${m3h.toFixed(2)} m³/h · ${ (m3h/3.6).toFixed(3) } L/s`;
  resEl.querySelector('.value').innerHTML = `<div class="calc-notes">${out}</div>`;
  resEl.classList.add('show');
  MEPHistory.save('CFM → L/s', `CFM=${v}`, out);
}

function convertWattToAmp() {
  const w = parseFloat(document.getElementById('watt-value').value);
  const V = parseFloat(document.getElementById('watt-voltage').value) || 230;
  const phase = document.getElementById('watt-phase').value;
  const resEl = document.getElementById('watt-result');
  if (!w && w !== 0) { resEl.querySelector('.value').textContent = 'Enter Watt value'; resEl.classList.add('show'); return; }
  let A;
  if (phase === '1') A = w / V;
  else A = w / (Math.sqrt(3) * V);
  const out = `${w} W ≈ ${A.toFixed(3)} A (${phase}-phase @ ${V} V)`;
  resEl.querySelector('.value').innerHTML = `<div class="calc-notes">${out}</div>`;
  resEl.classList.add('show');
  MEPHistory.save('W → A', `W=${w} V=${V} phase=${phase}`, out);
}

function convertLengthCard() {
  const v = parseFloat(document.getElementById('len-value').value);
  const unit = document.getElementById('len-unit').value;
  const resEl = document.getElementById('len-result');
  if (!v && v !== 0) { resEl.querySelector('.value').textContent = 'Enter a value'; resEl.classList.add('show'); return; }
  const toM = {'mm':0.001,'cm':0.01,'m':1,'in':0.0254};
  const m = v * toM[unit];
  const mm = m / toM['mm'];
  const cm = m / toM['cm'];
  const m_out = m;
  const inch = m / toM['in'];
  const out = `${mm.toFixed(3)} mm · ${cm.toFixed(3)} cm · ${m_out.toFixed(6)} m · ${inch.toFixed(3)} in`;
  resEl.querySelector('.value').innerHTML = `<div class="calc-notes">${out}</div>`;
  resEl.classList.add('show');
  MEPHistory.save('Length Converter', `${v}${unit}`, out);
=======
/* CALCULATORS.JS — calculator logic */

// Helper: render calculation results as cards with optional notes/refs
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderCalcResult(resultEl, lines, notes, refs) {
  if (!resultEl) return;
  const valueEl = resultEl.querySelector('.value') || resultEl;
  const cards = [];
  const misc = [];
  lines.forEach(line => {
    if (!line) return;
    let label = '';
    let value = '';
    if (line.includes('≈')) {
      const parts = line.split('≈');
      label = parts[0].trim();
      value = '≈ ' + parts.slice(1).join('≈').trim();
    } else if (line.includes('=')) {
      const parts = line.split('=');
      label = parts[0].trim();
      value = parts.slice(1).join('=').trim();
    } else {
      // fallback: put as misc line
      misc.push(line);
      return;
    }
    cards.push(`<div class="calc-metric-card"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(value)}</div></div>`);
  });

  let html = `<div class="calc-cards">${cards.join('')}</div>`;
  if (misc.length) html += `<div class="calc-notes small">${escapeHtml(misc.join(' · '))}</div>`;
  if (notes) html += `<div class="calc-notes">${escapeHtml(notes)}</div>`;
  if (refs) html += `<div class="calc-refs">References: ${escapeHtml(refs)}</div>`;
  valueEl.innerHTML = html;
  resultEl.classList.add('show');
}

// Power triangle & current
function hitungSegitigaDaya() {
  const V = parseFloat(document.getElementById('sd-v').value) || null;
  const I = parseFloat(document.getElementById('sd-i').value) || null;
  const P = parseFloat(document.getElementById('sd-p').value) || null;
  const S = parseFloat(document.getElementById('sd-s').value) || null;
  const cos = parseFloat(document.getElementById('sd-cos').value) || 0.85;
  const phase = document.getElementById('sd-phase').value;
  const k = phase === '3' ? Math.sqrt(3) : 1;
  const resultEl = document.getElementById('sd-result');
  const resultText = document.getElementById('sd-result-text');
  let deskripsi = [];

  if (V && I) {
    const S_kva = (k * V * I) / 1000;
    const P_kw = S_kva * cos;
    const Q_kvar = S_kva * Math.sin(Math.acos(cos));
    deskripsi = [`S = ${S_kva.toFixed(2)} kVA`, `P = ${P_kw.toFixed(2)} kW`, `Q = ${Q_kvar.toFixed(2)} kVAR`];
  } else if (P && V) {
    const I_calc = (P * 1000) / (k * V * cos);
    const S_kva = P / cos;
    const Q_kvar = S_kva * Math.sin(Math.acos(cos));
    deskripsi = [`I = ${I_calc.toFixed(2)} A`, `S = ${S_kva.toFixed(2)} kVA`, `Q = ${Q_kvar.toFixed(2)} kVAR`];
  } else if (S && V) {
    const I_calc = (S * 1000) / (k * V);
    const P_kw = S * cos;
    const Q_kvar = S * Math.sin(Math.acos(cos));
    deskripsi = [`I = ${I_calc.toFixed(2)} A`, `P = ${P_kw.toFixed(2)} kW`, `Q = ${Q_kvar.toFixed(2)} kVAR`];
  } else if (P && S) {
    const cos_calc = P / S;
    const Q_kvar = Math.sqrt(Math.max(0, S * S - P * P));
    deskripsi = [`cos φ = ${cos_calc.toFixed(3)}`, `Q = ${Q_kvar.toFixed(2)} kVAR`];
  } else {
    resultText.textContent = 'Enter at least 2 values (e.g. V + I, or P + V)';
    resultEl.classList.add('show');
    return;
  }
  renderCalcResult(resultEl, deskripsi, '1 PK = 9,000 Btu/h · 1 TR = 12,000 Btu/h', 'ASHRAE Handbook; local SNI standards');
  MEPHistory.save('Power Triangle & Current', `V=${V||'-'} I=${I||'-'} P=${P||'-'} S=${S||'-'} cos=${cos} ${phase}fasa`, deskripsi.join(' | '));
}

// Sizing breaker & cable
function hitungSizingBreaker() {
  const P = parseFloat(document.getElementById('sb-p').value);
  const V = parseFloat(document.getElementById('sb-v').value) || 380;
  const cos = parseFloat(document.getElementById('sb-cos').value) || 0.85;
  const phase = document.getElementById('sb-phase').value;
  const resultEl = document.getElementById('sb-result');
  const resultText = document.getElementById('sb-result-text');

  if (!P || P <= 0) {
    resultText.textContent = 'Enter a valid power (kW)';
    resultEl.classList.add('show');
    return;
  }

  const k = phase === '3' ? Math.sqrt(3) : 1;
  const In = (P * 1000) / (k * V * cos);
  const sbSafety = parseFloat(document.getElementById('sb-safety')?.value) || 25;
  const InSafety = In * (1 + sbSafety / 100);
  const breakers = [6,10,16,20,25,32,40,50,63,80,100,125,160,200,250,315,400,500,630,800];
  const breaker = breakers.find(b => b >= InSafety) || 800;

  const kabelTable = [
    {mm2:1.5,kha:18},{mm2:2.5,kha:25},{mm2:4,kha:34},{mm2:6,kha:44},{mm2:10,kha:60},
    {mm2:16,kha:78},{mm2:25,kha:103},{mm2:35,kha:126},{mm2:50,kha:154},{mm2:70,kha:192},
    {mm2:95,kha:232},{mm2:120,kha:268},{mm2:150,kha:304},{mm2:185,kha:347},{mm2:240,kha:402}
  ];
  const kabel = kabelTable.find(k => k.kha >= InSafety) || kabelTable[kabelTable.length-1];
  let pe = kabel.mm2 <= 16 ? kabel.mm2 : (kabel.mm2 <= 35 ? 16 : kabel.mm2 / 2);

  const deskripsi = [
    `Nominal current (In) = ${In.toFixed(2)} A`,
    `In × ${sbSafety}% = ${InSafety.toFixed(2)} A`,
    `Recommended breaker = ${breaker} A`,
    `Recommended cable = ${kabel.mm2} mm² (KHA ${kabel.kha} A)`,
    `PE / Grounding = ${pe} mm²`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'SNI / IEC guidance');
  MEPHistory.save('Sizing Breaker & Kabel', `P=${P}kW V=${V}V cos=${cos} ${phase}fasa`, deskripsi.join(' | '));
}

// Voltage drop
function hitungVoltageDrop() {
  const phase = document.getElementById('vd-phase').value;
  const V = parseFloat(document.getElementById('vd-v').value) || (phase === '3' ? 380 : 220);
  const I = parseFloat(document.getElementById('vd-i').value);
  const L = parseFloat(document.getElementById('vd-l').value);
  const R = parseFloat(document.getElementById('vd-r').value) || 0;
  const X = parseFloat(document.getElementById('vd-x').value) || 0.08;
  const cos = parseFloat(document.getElementById('vd-cos').value) || 0.85;
  const resultEl = document.getElementById('vd-result');
  const resultText = document.getElementById('vd-result-text');

  if (!I || !L) {
    resultText.textContent = 'Enter current (A) and length (m)';
    resultEl.classList.add('show');
    return;
  }

  const sin = Math.sin(Math.acos(cos));
  let dU;
  if (phase === '3') {
    dU = Math.sqrt(3) * I * (R * cos + X * sin) * (L / 1000);
  } else {
    dU = 2 * I * (R * cos + X * sin) * (L / 1000);
  }
  const dUpersen = (dU / V) * 100;
  let status = dUpersen <= 4 ? '✅ Safe (≤ 4%)' : '⚠️ Exceeds 4% — increase conductor size';

  const deskripsi = [`ΔU = ${dU.toFixed(2)} Volt`, `Drop = ${dUpersen.toFixed(2)} %`, status];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Voltage Drop', `I=${I}A L=${L}m V=${V} ${phase}fasa`, deskripsi.join(' | '));
}

// Capacitor bank
function hitungCapacitorBank() {
  const P = parseFloat(document.getElementById('cb-p').value);
  const cos1 = parseFloat(document.getElementById('cb-cos1').value) || 0.85;
  const cos2 = parseFloat(document.getElementById('cb-cos2').value) || 0.95;
  const resultEl = document.getElementById('cb-result');
  const resultText = document.getElementById('cb-result-text');

  if (!P || P <= 0) {
    resultText.textContent = 'Enter power (kW)';
    resultEl.classList.add('show');
    return;
  }

  const phi1 = Math.acos(cos1);
  const phi2 = Math.acos(cos2);
  const Qc = P * (Math.tan(phi1) - Math.tan(phi2));

  const deskripsi = [`Qc = ${Qc.toFixed(2)} kVAR`, `From cos φ ${cos1} → ${cos2}`, `Capacitor bank size ≈ ${Math.ceil(Qc)} kVAR`];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Capacitor Bank', `P=${P}kW cos1=${cos1} cos2=${cos2}`, deskripsi.join(' | '));
}

// Cable resistance
function hitungResistansiKabel() {
  const S = parseFloat(document.getElementById('rk-s').value);
  const L = parseFloat(document.getElementById('rk-l').value);
  const material = document.getElementById('rk-mat').value;
  const resultEl = document.getElementById('rk-result');
  const resultText = document.getElementById('rk-result-text');

  if (!S || !L) {
    resultText.textContent = 'Enter conductor size (mm²) and length (m)';
    resultEl.classList.add('show');
    return;
  }

  const rho = material === 'cu' ? 22.5 : 36;
  const R = (rho / S) * (L / 1000);

  const deskripsi = [`R = ${R.toFixed(4)} Ω`, `Material: ${material === 'cu' ? 'Copper (Cu)' : 'Aluminium (Al)'}`, `ρ = ${rho} Ω·mm²/km`];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Resistansi Kabel', `S=${S}mm² L=${L}m ${material}`, deskripsi.join(' | '));
}

// Transformer & genset sizing
function hitungTrafoGenset() {
  const P = parseFloat(document.getElementById('tg-p').value);
  const df = parseFloat(document.getElementById('tg-df').value) || 1.2;
  const cos = parseFloat(document.getElementById('tg-cos').value) || 0.85;
  const resultEl = document.getElementById('tg-result');
  const resultText = document.getElementById('tg-result-text');

  if (!P || P <= 0) {
    resultText.textContent = 'Enter total power (kW)';
    resultEl.classList.add('show');
    return;
  }

  const S_trafo = P * df;
  const P_genset = (P * df) / cos;
  const trafoStd = [100,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150];
  const trafo = trafoStd.find(t => t >= S_trafo) || 3150;

  const deskripsi = [`Transformer size ≈ ${trafo} kVA`, `Generator power ≈ ${P_genset.toFixed(1)} kW`, `Ideal transformer load: 40–80%`];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Sizing Trafo & Genset', `P=${P}kW DF=${df} cos=${cos}`, deskripsi.join(' | '));
}

// Lighting: estimated luminaires
function hitungArmaturLampu() {
  const E = parseFloat(document.getElementById('al-e').value);
  const A = parseFloat(document.getElementById('al-a').value);
  const eta = parseFloat(document.getElementById('al-eta').value) || 0.5;
  const d = parseFloat(document.getElementById('al-d').value) || 0.8;
  const lmW = parseFloat(document.getElementById('al-lmw').value) || 80;
  const watt = parseFloat(document.getElementById('al-watt').value) || 36;
  const resultEl = document.getElementById('al-result');
  const resultText = document.getElementById('al-result-text');

  if (!E || !A) {
    resultText.textContent = 'Enter lux (E) and area (m²)';
    resultEl.classList.add('show');
    return;
  }

  const Q = lmW * watt;
  const N = (E * A) / (eta * Q * d);

  const deskripsi = [`Estimated luminaires ≈ ${Math.ceil(N)} pcs`, `Total lumen = ${(E*A).toFixed(0)} lm`, `Lumen per luminaire = ${Q.toFixed(0)} lm`];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Number of Luminaires', `E=${E}lux A=${A}m²`, deskripsi.join(' | '));
}

// Short circuit
function hitungShortCircuit() {
  const V = parseFloat(document.getElementById('sc-v').value) || 380;
  const S = parseFloat(document.getElementById('sc-s').value);
  const uk = parseFloat(document.getElementById('sc-uk').value) || 4;
  const resultEl = document.getElementById('sc-result');
  const resultText = document.getElementById('sc-result-text');

  if (!S) {
    resultText.textContent = 'Enter transformer capacity (kVA)';
    resultEl.classList.add('show');
    return;
  }

  const Isc = (S * 1000) / (Math.sqrt(3) * V * (uk / 100));
  const deskripsi = [`Isc ≈ ${Isc.toFixed(0)} A`, `Isc ≈ ${(Isc/1000).toFixed(2)} kA`, `Assumed uk = ${uk}%`];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Short Circuit Current', `Trafo=${S}kVA V=${V}V uk=${uk}%`, deskripsi.join(' | '));
}

// HVAC: AC capacity
function hitungKapasitasAC() {
  const W = parseFloat(document.getElementById('ac-w').value);
  const L = parseFloat(document.getElementById('ac-l').value);
  const H = parseFloat(document.getElementById('ac-h').value) || 3;
  const I = parseFloat(document.getElementById('ac-i').value) || 18;
  const E = parseFloat(document.getElementById('ac-e').value) || 18;
  const resultEl = document.getElementById('ac-result');
  const resultText = document.getElementById('ac-result-text');

  if (!W || !L) {
    resultText.textContent = 'Enter room width and length (m)';
    resultEl.classList.add('show');
    return;
  }

  const Q = 0.59 * W * L * H * I * E;
  const pk = Q / 9000;
  const acSf = parseFloat(document.getElementById('ac-sf')?.value) || 10;
  const Q_adj = Q * (1 + acSf / 100);
  const pk_adj = Q_adj / 9000;
  const deskripsi = [
    `Capacity ≈ ${Q.toFixed(0)} Btu/h`,
    `Adjusted (＋${acSf}%) ≈ ${Q_adj.toFixed(0)} Btu/h`,
    `≈ ${pk_adj.toFixed(2)} HP`,
    `≈ ${(Q_adj/12000).toFixed(2)} TR`
  ];
  renderCalcResult(resultEl, deskripsi, `1 PK = 9,000 Btu/h · 1 TR = 12,000 Btu/h`, 'ASHRAE Handbook; local SNI standards');
  MEPHistory.save('Room AC Capacity', `W=${W} L=${L} H=${H}`, deskripsi.join(' | '));
}

// HVAC: AC electric power
function hitungDayaAC() {
  const btu = parseFloat(document.getElementById('dac-btu').value);
  const resultEl = document.getElementById('dac-result');
  const resultText = document.getElementById('dac-result-text');

  if (!btu) {
    resultText.textContent = 'Enter AC capacity (Btu/h)';
    resultEl.classList.add('show');
    return;
  }

  const P = (btu / 9000) * 746 * 1.3;
  const deskripsi = [`Electric power ≈ ${P.toFixed(0)} Watt`, `≈ ${(P/1000).toFixed(2)} kW`, `For cable/breaker sizing`];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('AC Electric Power', `Btu=${btu}`, deskripsi.join(' | '));
}
// HVAC: Refrigerant pipe size lookup
function hitungPipaRefrigerant() {
  const pk = parseFloat(document.getElementById('pr-pk').value);
  const resultEl = document.getElementById('pr-result');
  const resultText = document.getElementById('pr-result-text');

  if (!pk || pk <= 0) {
    resultText.textContent = 'Enter refrigerant load (PK)';
    resultEl.classList.add('show');
    return;
  }

  // Simple lookup based on common R-32 / R-410A data
  let liquid = '-', gas = '-', note = '';
  if (pk <= 1) { liquid = '1/4" (6.35mm)'; gas = '3/8" (9.52mm)'; }
  else if (pk <= 1.5) { liquid = '1/4" (6.35mm)'; gas = '1/2" (12.70mm)'; }
  else if (pk <= 5) { liquid = '3/8" (9.52mm)'; gas = '5/8" (15.88mm)'; }
  else if (pk <= 7) { liquid = '3/8" (9.52mm)'; gas = '3/4" (19.05mm)'; }
  else if (pk <= 11) { liquid = '3/8" (9.52mm)'; gas = '7/8" (22.22mm)'; }
  else if (pk <= 16) { liquid = '1/2" (12.70mm)'; gas = '1-1/8" (28.58mm)'; }
  else if (pk <= 25) { liquid = '5/8" (15.88mm)'; gas = '1-1/8" (28.58mm)'; }
  else { liquid = '3/4" (19.05mm)'; gas = '1-3/8" or larger'; note = 'Check manufacturer manual'; }

  const deskripsi = [
    `Liquid line = ${liquid}`,
    `Gas / Suction = ${gas}`,
    note || 'Standard length ≈ 15m'
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Refrigerant Pipe Size', `PK=${pk}`, deskripsi.join(' | '));
}

// HVAC: Duct sizing
function hitungDucting() {
  const Q = parseFloat(document.getElementById('duct-q').value); // m3/h or CFM
  const v = parseFloat(document.getElementById('duct-v').value) || 5; // m/s
  const unit = document.getElementById('duct-unit').value;
  const resultEl = document.getElementById('duct-result');
  const resultText = document.getElementById('duct-result-text');

  if (!Q || Q <= 0) {
    resultText.textContent = 'Enter air flow (m³/h or CFM)';
    resultEl.classList.add('show');
    return;
  }

  // Convert to m3/s
  let Qm3s = unit === 'cfm' ? Q * 0.0004719 : Q / 3600;
  const A = Qm3s / v; // m²
  const A_cm2 = A * 10000;

  // Estimate square duct side
  const sisi = Math.sqrt(A) * 1000; // mm

  const deskripsi = [
    `Cross-section A = ${A.toFixed(4)} m² (${A_cm2.toFixed(0)} cm²)`,
    `Estimated square side ≈ ${sisi.toFixed(0)} mm`,
    `Velocity = ${v} m/s`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Dimensi Ducting', `Q=${Q} ${unit} v=${v}m/s`, deskripsi.join(' | '));
}

// HVAC: Diffuser count
function hitungDiffuser() {
  const Q = parseFloat(document.getElementById('dif-q').value); // CFM
  const p = parseFloat(document.getElementById('dif-p').value) || 300; // mm
  const l = parseFloat(document.getElementById('dif-l').value) || 300; // mm
  const v = parseFloat(document.getElementById('dif-v').value) || 2.5; // m/s
  const resultEl = document.getElementById('dif-result');
  const resultText = document.getElementById('dif-result-text');

  if (!Q) {
    resultText.textContent = 'Enter airflow (CFM)';
    resultEl.classList.add('show');
    return;
  }

  // S = (Q × 472) / (p × l × v)   → number of points
  const S = (Q * 472) / (p * l * v);

  const deskripsi = [
    `Estimated diffusers ≈ ${Math.ceil(S)} pcs`,
    `Each diffuser = ${p} × ${l} mm`,
    `Velocity = ${v} m/s`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Number of Diffusers', `Q=${Q}CFM ${p}x${l}mm v=${v}`, deskripsi.join(' | '));
}

// HVAC: AHU/FCU fan power
function hitungDayaAHU() {
  const Q = parseFloat(document.getElementById('ahu-q').value); // CFM
  const dP = parseFloat(document.getElementById('ahu-dp').value) || 375; // Pa (1.5 inWg ≈ 375)
  const v = parseFloat(document.getElementById('ahu-v').value) || 3; // m/s
  const eff = parseFloat(document.getElementById('ahu-eff').value) || 0.8;
  const resultEl = document.getElementById('ahu-result');
  const resultText = document.getElementById('ahu-result-text');

  if (!Q) {
    resultText.textContent = 'Enter airflow (CFM)';
    resultEl.classList.add('show');
    return;
  }

  // Approximation: P = Q × 1.7 × (ΔP + v²×0.6) / (η × 3600)
  const P = Q * 1.7 * (dP + v * v * 0.6) / (eff * 3600);

  const deskripsi = [
    `Fan power ≈ ${P.toFixed(0)} Watt`,
    `≈ ${(P/1000).toFixed(2)} kW`,
    `ΔP = ${dP} Pa · η = ${eff}`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('AHU/FCU Fan Power', `Q=${Q}CFM ΔP=${dP}Pa`, deskripsi.join(' | '));
}

// HVAC: CHWS pump capacity
function hitungPompaCHWS() {
  const TR = parseFloat(document.getElementById('chws-tr').value);
  const jenis = document.getElementById('chws-jenis').value;
  const resultEl = document.getElementById('chws-result');
  const resultText = document.getElementById('chws-result-text');

  if (!TR) {
    resultText.textContent = 'Enter chiller capacity (TR)';
    resultEl.classList.add('show');
    return;
  }

  const X = jenis === 'air' ? 9.1 : 11.4; // LPM per TR
  const Q = X * TR;
  const chwsSf = parseFloat(document.getElementById('chws-sf')?.value) || 15;
  const Q_adj = Q * (1 + chwsSf / 100);

  const deskripsi = [
    `Water flow ≈ ${Q.toFixed(1)} LPM`,
    `Adjusted (＋${chwsSf}%) ≈ ${Q_adj.toFixed(1)} LPM`,
    `≈ ${(Q_adj/60).toFixed(2)} LPS`,
    `Type: ${jenis === 'air' ? 'Air Cooled' : 'Water Cooled'} (${X} LPM/TR)`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'ASHRAE; local SNI');
  MEPHistory.save('CHWS Pump Capacity', `TR=${TR} ${jenis}`, deskripsi.join(' | '));
}

// Plumbing: pipe diameter
function hitungDiameterPipa() {
  const Q = parseFloat(document.getElementById('dp-q').value); // LPM
  const v = parseFloat(document.getElementById('dp-v').value) || 1.5; // m/s
  const resultEl = document.getElementById('dp-result');
  const resultText = document.getElementById('dp-result-text');

  if (!Q || Q <= 0) {
    resultText.textContent = 'Enter pipe flow (LPM)';
    resultEl.classList.add('show');
    return;
  }

  // d = √( (200 × Q) / (3 × π × v) )   → result in mm (approximation)
  const d = Math.sqrt((200 * Q) / (3 * Math.PI * v));

  // Commercial sizes
  const sizes = [20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300];
  const recommended = sizes.find(s => s >= d) || sizes[sizes.length - 1];

  const deskripsi = [
    `Calculated diameter = ${d.toFixed(1)} mm`,
    `Recommended commercial size = ${recommended} mm`,
    `Velocity = ${v} m/s`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Diameter Pipa Plumbing', `Q=${Q}LPM v=${v}m/s`, deskripsi.join(' | '));
}

// Plumbing: pump head
function hitungHeadPompa() {
  const Lv = parseFloat(document.getElementById('hp-lv').value) || 0; // vertical lift
  const Lt = parseFloat(document.getElementById('hp-lt').value) || 0; // total pipe length
  const f = parseFloat(document.getElementById('hp-f').value) || 0.04; // friction factor m/m
  const Pf = parseFloat(document.getElementById('hp-pf').value) || 10; // fixture pressure (m)
  const safety = parseFloat(document.getElementById('hp-sf').value) || 10; // %
  const resultEl = document.getElementById('hp-result');
  const resultText = document.getElementById('hp-result-text');

  const H = Lv + (Lt * f) + Pf;
  const Htotal = H * (1 + safety / 100);

  const deskripsi = [
    `Theoretical head = ${H.toFixed(1)} m`,
    `Head + safety ${safety}% = ${Htotal.toFixed(1)} m`,
    `Recommended pump head ≥ ${Math.ceil(Htotal)} m`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Head Pompa Plumbing', `Lv=${Lv} Lt=${Lt} Pf=${Pf}`, deskripsi.join(' | '));
}

// Plumbing: pump electric power
function hitungDayaPompa() {
  const H = parseFloat(document.getElementById('dpy-h').value);
  const Q = parseFloat(document.getElementById('dpy-q').value); // LPM
  const eta = parseFloat(document.getElementById('dpy-eta').value) || 0.6;
  const f = parseFloat(document.getElementById('dpy-f').value) || 1.1;
  const resultEl = document.getElementById('dpy-result');
  const resultText = document.getElementById('dpy-result-text');

  if (!H || !Q) {
    resultText.textContent = 'Enter head (m) and flow (LPM)';
    resultEl.classList.add('show');
    return;
  }

  // P = (0.163 × H × Q × f) / η     (Q in LPM)
  const P = (0.163 * H * Q * f) / eta;
  const dpySf = parseFloat(document.getElementById('dpy-sf')?.value) || 15;
  const P_adj = P * (1 + dpySf / 100);

  const deskripsi = [
    `Pump power ≈ ${P.toFixed(0)} Watt`,
    `Adjusted (＋${dpySf}%) ≈ ${P_adj.toFixed(0)} Watt`,
    `≈ ${(P_adj / 1000).toFixed(2)} kW`,
    `η = ${eta} · factor = ${f}`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: local SNI / hydraulic practice');
  MEPHistory.save('Pump Electric Power', `H=${H}m Q=${Q}LPM`, deskripsi.join(' | '));
}

// Plumbing: ground tank capacity (simple)
function hitungGroundTank() {
  const Qd = parseFloat(document.getElementById('gt-qd').value); // liters/day
  const jam = parseFloat(document.getElementById('gt-jam').value) || 8;
  const resultEl = document.getElementById('gt-result');
  const resultText = document.getElementById('gt-result-text');

  if (!Qd) {
    resultText.textContent = 'Enter daily water demand (liters)';
    resultEl.classList.add('show');
    return;
  }

  // Rough estimate: tank volume ≈ 1 day demand + backup
  const V = Qd / 1000; // m³
  const gtStorage = parseFloat(document.getElementById('gt-storage')?.value) || 20;
  const Vcadangan = V * (1 + gtStorage / 100);

  const deskripsi = [
    `Demand = ${Qd.toFixed(0)} liters/day`,
    `Minimum tank volume ≈ ${V.toFixed(2)} m³`,
    `With ${gtStorage}% backup ≈ ${Vcadangan.toFixed(2)} m³`,
    `Assumed operating hours = ${jam} h`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Ground Tank Capacity', `Qd=${Qd}L/day`, deskripsi.join(' | '));
}
// Fire: pump capacity
function hitungKapasitasPompaFF() {
  const sprinkler = parseFloat(document.getElementById('ff-spr').value) || 0;
  const ihb = parseFloat(document.getElementById('ff-ihb').value) || 0;
  const pillar = parseFloat(document.getElementById('ff-pillar').value) || 0;
  const jockey = parseFloat(document.getElementById('ff-jockey').value) || 10; // %
  const resultEl = document.getElementById('ff-result');
  const resultText = document.getElementById('ff-result-text');

  // Standard flow assumptions
  const Q_spr = sprinkler * 80;      // LPM per point
  const Q_ihb = ihb * 400;           // LPM per IHB
  const Q_pillar = pillar * 1000;    // LPM per pillar
  const Q_total = Q_spr + Q_ihb + Q_pillar;
  const Q_jockey = Q_total * (jockey / 100);
    const ffMargin = parseFloat(document.getElementById('ff-margin')?.value) || 10;
    const Q_total_adj = Q_total * (1 + ffMargin / 100);
    const Q_jockey_adj = Q_total_adj * (jockey / 100);

  const deskripsi = [
    `Sprinkler flow = ${Q_spr.toFixed(0)} LPM`,
    `IHB flow = ${Q_ihb.toFixed(0)} LPM`,
    `Hydrant pillar flow = ${Q_pillar.toFixed(0)} LPM`,
      `Main pump flow ≈ ${Q_total.toFixed(0)} LPM`,
      `Adjusted (＋${ffMargin}%) ≈ ${Q_total_adj.toFixed(0)} LPM`,
    `Jockey pump ≈ ${Q_jockey.toFixed(0)} LPM (${jockey}%)`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Fire Pump Capacity', `Spr=${sprinkler} IHB=${ihb} Pillar=${pillar}`, deskripsi.join(' | '));
}

// Fire: pump head
function hitungHeadPompaFF() {
  const Lvert = parseFloat(document.getElementById('ffh-lv').value) || 0;
  const Ljauh = parseFloat(document.getElementById('ffh-lj').value) || 0;
  const f = parseFloat(document.getElementById('ffh-f').value) || 0.05;
  const Phyd = parseFloat(document.getElementById('ffh-ph').value) || 4; // bar
  const Pspr = parseFloat(document.getElementById('ffh-ps').value) || 1; // bar
  const resultEl = document.getElementById('ffh-result');
  const resultText = document.getElementById('ffh-result-text');

  // H = vertical lift + longest run × friction + (hydrant + sprinkler pressure) × 10
  const H = Lvert + (Ljauh * f) + (Phyd + Pspr) * 10;

  const deskripsi = [
    `Pump head ≈ ${H.toFixed(1)} m`,
    `≈ ${(H / 10).toFixed(2)} bar`,
    `Recommended pump head ≥ ${Math.ceil(H)} m`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'Refs: ASHRAE / NFPA / SNI');
  MEPHistory.save('Fire Pump Head', `Lv=${Lvert} Lj=${Ljauh}`, deskripsi.join(' | '));
}

// Fire: pump electric power
function hitungDayaPompaFF() {
  const H = parseFloat(document.getElementById('ffd-h').value);
  const Q = parseFloat(document.getElementById('ffd-q').value); // LPM
  const eta = parseFloat(document.getElementById('ffd-eta').value) || 0.65;
  const sf = parseFloat(document.getElementById('ffd-sf').value) || 1.15;
  const resultEl = document.getElementById('ffd-result');
  const resultText = document.getElementById('ffd-result-text');

  if (!H || !Q) {
    resultText.textContent = 'Enter head (m) and flow (LPM)';
    resultEl.classList.add('show');
    return;
  }

  // Q in LPS = Q / 60
  // P = 0.163 × H × Q(LPS) × SF / η
  const Qlps = Q / 60;
  const P = (0.163 * H * Qlps * sf) / eta;

  const deskripsi = [
    `Pump power ≈ ${P.toFixed(0)} Watt`,
    `≈ ${(P / 1000).toFixed(2)} kW`,
    `η = ${eta} · SF = ${sf}`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'NFPA 20; local SNI');
  MEPHistory.save('Fire Pump Power', `H=${H}m Q=${Q}LPM`, deskripsi.join(' | '));
}

// Fire: tank capacity
function hitungTangkiFF() {
  const Q = parseFloat(document.getElementById('fft-q').value); // LPM or USGPM
  const t = parseFloat(document.getElementById('fft-t').value) || 30; // minutes
  const unit = document.getElementById('fft-unit').value;
  const resultEl = document.getElementById('fft-result');
  const resultText = document.getElementById('fft-result-text');

  if (!Q) {
    resultText.textContent = 'Enter pump flow (LPM)';
    resultEl.classList.add('show');
    return;
  }

  let V;
  if (unit === 'usgpm') {
    // V = Q(USGPM) × t(minutes) × 0.003785 → m³
    V = Q * t * 0.003785;
  } else {
    // Q in LPM → liters = Q × t → m³
    V = (Q * t) / 1000;
  }

  const deskripsi = [
    `Tank volume ≈ ${V.toFixed(2)} m³`,
    `≈ ${(V * 1000).toFixed(0)} liters`,
    `Duration = ${t} minutes`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'NFPA guidance; local SNI');
  MEPHistory.save('Fire Tank Capacity', `Q=${Q} t=${t}min`, deskripsi.join(' | '));
}

// Fire: sprinkler pipe size
function hitungSprinklerPipeSizeFF() {
  const points = parseInt(document.getElementById('ffsp-points').value, 10);
  const flow = parseFloat(document.getElementById('ffsp-flow').value) || 80;
  const resultEl = document.getElementById('ffsp-result');
  const resultText = document.getElementById('ffsp-result-text');

  if (!points || points < 1) {
    resultText.textContent = 'Enter the number of sprinkler points';
    resultEl.classList.add('show');
    return;
  }

  const totalFlow = points * flow;
  const mapping = [
    { maxPoints: 1, size: 25 },
    { maxPoints: 2, size: 32 },
    { maxPoints: 4, size: 40 },
    { maxPoints: 8, size: 50 },
    { maxPoints: 12, size: 65 },
    { maxPoints: 18, size: 80 },
    { maxPoints: 24, size: 100 },
  ];
  const recommended = mapping.find(item => points <= item.maxPoints)?.size || 125;

  const deskripsi = [
    `Sprinkler points = ${points}`,
    `Total flow ≈ ${totalFlow.toFixed(0)} LPM`,
    `Recommended pipe = Ø${recommended} mm`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'NFPA 13; Manufacturer data');
  MEPHistory.save('Sprinkler Pipe Size', `points=${points} flow=${flow}`, deskripsi.join(' | '));
}

// Electronic: speaker SPL
function hitungSPL() {
  const sensitivity = parseFloat(document.getElementById('sp-sensitivity').value) || 90;
  const power = parseFloat(document.getElementById('sp-power').value) || 50;
  const distance = parseFloat(document.getElementById('sp-distance').value) || 1;
  const count = parseInt(document.getElementById('sp-count').value, 10) || 1;
  const target = parseFloat(document.getElementById('sp-target').value);
  const resultEl = document.getElementById('sp-result');
  const resultText = document.getElementById('sp-result-text');

  if (!power || power <= 0 || !distance || distance <= 0 || !count || count <= 0) {
    resultText.textContent = 'Enter valid speaker power, distance, and count';
    resultEl.classList.add('show');
    return;
  }

  const splSingle = sensitivity + 10 * Math.log10(power) - 20 * Math.log10(distance);
  const splTotal = splSingle + 10 * Math.log10(count);
  const spMargin = parseFloat(document.getElementById('sp-margin')?.value) || 3;
  const delta = target ? (splTotal - target).toFixed(1) : null;
  const meetsWithMargin = target ? (splTotal >= (target + spMargin)) : null;

  const deskripsi = [
    `Single speaker = ${splSingle.toFixed(1)} dB`,
    `Combined ${count} speakers ≈ ${splTotal.toFixed(1)} dB`
  ];
  if (target) {
    if (meetsWithMargin) {
      deskripsi.push(`Target ${target.toFixed(1)} dB + ${spMargin} dB margin → OK`);
    } else {
      const need = ((target + spMargin) - splTotal).toFixed(1);
      deskripsi.push(`Target ${target.toFixed(1)} dB + ${spMargin} dB margin → Need ${need} dB more`);
    }
  }

  renderCalcResult(resultEl, deskripsi, '', 'ISO 3744; local acoustic guidelines');
  MEPHistory.save('Speaker SPL', `sens=${sensitivity} dB power=${power}W dist=${distance}m count=${count}`, `SPL=${splTotal.toFixed(1)} dB`);
}

// Fire: pipe diameter
function hitungDiameterPipaFF() {
  const Q = parseFloat(document.getElementById('ffp-q').value); // LPM
  const v = parseFloat(document.getElementById('ffp-v').value) || 3.5; // m/s
  const resultEl = document.getElementById('ffp-result');
  const resultText = document.getElementById('ffp-result-text');

  if (!Q) {
    resultText.textContent = 'Enter flow (LPM)';
    resultEl.classList.add('show');
    return;
  }

  const d = Math.sqrt((200 * Q) / (3 * Math.PI * v));
  const sizes = [50, 65, 80, 100, 125, 150, 200, 250, 300];
  const recommended = sizes.find(s => s >= d) || 300;

  const deskripsi = [
    `Calculated diameter = ${d.toFixed(1)} mm`,
    `Commercial size = ${recommended} mm`,
    `Velocity = ${v} m/s (typical 3–4.5 m/s)`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'NFPA 13; local SNI');
  MEPHistory.save('Diameter Pipa FF', `Q=${Q}LPM v=${v}`, deskripsi.join(' | '));
}

// ========= Converter: generic unit conversions =========
function updateConverterUnits() {
  const cat = document.getElementById('conv-category').value;
  const from = document.getElementById('conv-from');
  const to = document.getElementById('conv-to');
  from.innerHTML = '';
  to.innerHTML = '';
  const opts = {
    length: ['mm','cm','m','in'],
    area: ['mm²','cm²','m²'],
    volume: ['mm³','cm³','L','m³'],
    flow: ['m³/h','CFM','L/s'],
    power: ['W','kW','HP','Btu/h'],
    temperature: ['°C','°F','K'],
    electrical: ['W','A']
  };
  const list = opts[cat] || ['--'];
  list.forEach(u => {
    const o1 = document.createElement('option'); o1.value = u; o1.textContent = u; from.appendChild(o1);
    const o2 = document.createElement('option'); o2.value = u; o2.textContent = u; to.appendChild(o2);
  });
  // show voltage if electrical
  document.getElementById('conv-voltage-group').style.display = cat === 'electrical' ? '' : 'none';
}

function hitungConverter() {
  const cat = document.getElementById('conv-category').value;
  const v = parseFloat(document.getElementById('conv-value').value);
  const from = document.getElementById('conv-from').value;
  const to = document.getElementById('conv-to').value;
  const resultEl = document.getElementById('conv-result');
  const valueEl = resultEl.querySelector('.value');
  if (!v && v !== 0) { valueEl.textContent = 'Enter a numeric value'; resultEl.classList.add('show'); return; }

  // helper: convert via base units
  const lengthToM = {'mm':0.001,'cm':0.01,'m':1,'in':0.0254};
  const areaToM2 = {'mm²':1e-6,'cm²':1e-4,'m²':1};
  const volToM3 = {'mm³':1e-9,'cm³':1e-6,'L':0.001,'m³':1};
  const flowToM3s = {'m³/h':1/3600,'CFM':0.00047194745,'L/s':0.001};
  const powerToW = {'W':1,'kW':1000,'HP':746,'Btu/h':0.29307107};

  let out = '';
  try {
    if (cat === 'length') {
      const m = v * (lengthToM[from] || 1);
      const conv = m / (lengthToM[to] || 1);
      out = `${v} ${from} = ${conv} ${to}`;
    } else if (cat === 'area') {
      const m2 = v * (areaToM2[from] || 1);
      const conv = m2 / (areaToM2[to] || 1);
      out = `${v} ${from} = ${conv} ${to}`;
    } else if (cat === 'volume') {
      const m3 = v * (volToM3[from] || 1);
      const conv = m3 / (volToM3[to] || 1);
      out = `${v} ${from} = ${conv} ${to}`;
    } else if (cat === 'flow') {
      const m3s = v * (flowToM3s[from] || 1);
      const conv = m3s / (flowToM3s[to] || 1);
      out = `${v} ${from} = ${conv} ${to}`;
    } else if (cat === 'power') {
      const w = v * (powerToW[from] || 1);
      const conv = w / (powerToW[to] || 1);
      out = `${v} ${from} = ${conv} ${to}`;
    } else if (cat === 'temperature') {
      let c;
      if (from === '°C') c = v;
      else if (from === '°F') c = (v - 32) * 5/9;
      else if (from === 'K') c = v - 273.15;
      let res;
      if (to === '°C') res = c;
      else if (to === '°F') res = c * 9/5 + 32;
      else if (to === 'K') res = c + 273.15;
      out = `${v} ${from} = ${res} ${to}`;
    } else if (cat === 'electrical') {
      // support W <-> A (single-phase by default)
      const V = parseFloat(document.getElementById('conv-voltage').value) || 230;
      if (from === 'W' && to === 'A') {
        const A = v / V;
        out = `${v} W ≈ ${A.toFixed(3)} A (at ${V} V)`;
      } else if (from === 'A' && to === 'W') {
        const W = v * V;
        out = `${v} A ≈ ${W.toFixed(2)} W (at ${V} V)`;
      } else {
        out = 'Unsupported electrical conversion';
      }
    } else {
      out = 'Unsupported conversion';
    }
  } catch (e) {
    out = 'Conversion error';
  }

  valueEl.innerHTML = `<div class="calc-notes">${out}</div>`;
  resultEl.classList.add('show');
  MEPHistory.save('Converter', `${v} ${from} → ${to}`, out);
}

// initialize converter selects on load
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('conv-category')) updateConverterUnits();
});

// Specific converter functions for the new cards
function convertBTUtoPKTR() {
  const v = parseFloat(document.getElementById('btu-value').value);
  const resEl = document.getElementById('btu-result');
  if (!v && v !== 0) { resEl.querySelector('.value').textContent = 'Enter BTU/h value'; resEl.classList.add('show'); return; }
  const pk = v / 9000; // 1 PK = 9000 Btu/h
  const tr = v / 12000; // 1 TR = 12000 Btu/h
  const out = `≈ ${pk.toFixed(3)} PK · ${tr.toFixed(3)} TR`;
  resEl.querySelector('.value').innerHTML = `<div class="calc-notes">${out}</div>`;
  resEl.classList.add('show');
  MEPHistory.save('BTU → PK/TR', `BTU=${v}`, out);
}

function convertPKtoWatt() {
  const pk = parseFloat(document.getElementById('pk-value').value);
  const resEl = document.getElementById('pk-result');
  if (!pk && pk !== 0) { resEl.querySelector('.value').textContent = 'Enter PK value'; resEl.classList.add('show'); return; }
  const btu = pk * 9000;
  const watt = btu * 0.29307107;
  const out = `${pk} PK ≈ ${watt.toFixed(0)} W (${btu.toFixed(0)} Btu/h)`;
  resEl.querySelector('.value').innerHTML = `<div class="calc-notes">${out}</div>`;
  resEl.classList.add('show');
  MEPHistory.save('PK → W', `PK=${pk}`, out);
}

function convertM3hToCFM() {
  const v = parseFloat(document.getElementById('m3h-value').value);
  const resEl = document.getElementById('m3h-result');
  if (!v && v !== 0) { resEl.querySelector('.value').textContent = 'Enter m³/h value'; resEl.classList.add('show'); return; }
  const cfm = v * 0.588577; // 1 m3/h = 0.588577 CFM
  const ls = (v / 3600) * 1000 / 1000; // placeholder: we'll compute L/s below
  const lps = v / 3600; // m3/s => L/s = m3/s * 1000 => v/3.6 ? wait
  const l_s = v / 3.6; // m3/h to L/s: divide by 3.6
  const out = `${v} m³/h ≈ ${cfm.toFixed(2)} CFM · ${l_s.toFixed(3)} L/s`;
  resEl.querySelector('.value').innerHTML = `<div class="calc-notes">${out}</div>`;
  resEl.classList.add('show');
  MEPHistory.save('m³/h → CFM', `m3h=${v}`, out);
}

function convertCFMToLs() {
  const v = parseFloat(document.getElementById('cfm-value').value);
  const resEl = document.getElementById('cfm-result');
  if (!v && v !== 0) { resEl.querySelector('.value').textContent = 'Enter CFM value'; resEl.classList.add('show'); return; }
  const m3h = v * 1.699; // 1 CFM ≈ 1.699 m3/h
  const l_s = (m3h / 3600) * 1000; // convert m3/h to L/s
  const out = `${v} CFM ≈ ${m3h.toFixed(2)} m³/h · ${ (m3h/3.6).toFixed(3) } L/s`;
  resEl.querySelector('.value').innerHTML = `<div class="calc-notes">${out}</div>`;
  resEl.classList.add('show');
  MEPHistory.save('CFM → L/s', `CFM=${v}`, out);
}

function convertWattToAmp() {
  const w = parseFloat(document.getElementById('watt-value').value);
  const V = parseFloat(document.getElementById('watt-voltage').value) || 230;
  const phase = document.getElementById('watt-phase').value;
  const resEl = document.getElementById('watt-result');
  if (!w && w !== 0) { resEl.querySelector('.value').textContent = 'Enter Watt value'; resEl.classList.add('show'); return; }
  let A;
  if (phase === '1') A = w / V;
  else A = w / (Math.sqrt(3) * V);
  const out = `${w} W ≈ ${A.toFixed(3)} A (${phase}-phase @ ${V} V)`;
  resEl.querySelector('.value').innerHTML = `<div class="calc-notes">${out}</div>`;
  resEl.classList.add('show');
  MEPHistory.save('W → A', `W=${w} V=${V} phase=${phase}`, out);
}

function convertLengthCard() {
  const v = parseFloat(document.getElementById('len-value').value);
  const unit = document.getElementById('len-unit').value;
  const resEl = document.getElementById('len-result');
  if (!v && v !== 0) { resEl.querySelector('.value').textContent = 'Enter a value'; resEl.classList.add('show'); return; }
  const toM = {'mm':0.001,'cm':0.01,'m':1,'in':0.0254};
  const m = v * toM[unit];
  const mm = m / toM['mm'];
  const cm = m / toM['cm'];
  const m_out = m;
  const inch = m / toM['in'];
  const out = `${mm.toFixed(3)} mm · ${cm.toFixed(3)} cm · ${m_out.toFixed(6)} m · ${inch.toFixed(3)} in`;
  resEl.querySelector('.value').innerHTML = `<div class="calc-notes">${out}</div>`;
  resEl.classList.add('show');
  MEPHistory.save('Length Converter', `${v}${unit}`, out);
>>>>>>> 57b888311c598309cfad42dd1a17f5d94feda292
}