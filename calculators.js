/* CALCULATORS.JS — calculator logic for all MEP modules & converters */

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
      misc.push(line);
      return;
    }
    cards.push(`<div class="calc-metric-card"><div class="metric-label">${label}</div><div class="metric-value">${value}</div></div>`);
  });

  let html = `<div class="calc-cards">${cards.join('')}</div>`;
  if (misc.length) html += `<div class="calc-notes small">${misc.join(' · ')}</div>`;
  if (notes) html += `<div class="calc-notes">${notes}</div>`;
  if (refs) html += `<div class="calc-refs">References: ${refs}</div>`;
  valueEl.innerHTML = html;
  resultEl.classList.add('show');
}

// --- ELECTRICAL CALCULATIONS ---
function hitungSegitigaDaya() {
  const V = parseFloat(document.getElementById('sd-v').value) || null;
  const I = parseFloat(document.getElementById('sd-i').value) || null;
  const P = parseFloat(document.getElementById('sd-p').value) || null;
  const S = parseFloat(document.getElementById('sd-s').value) || null;
  const cos = parseFloat(document.getElementById('sd-cos').value) || 0.85;
  const phase = document.getElementById('sd-phase').value;
  const k = phase === '3' ? Math.sqrt(3) : 1;
  const resultEl = document.getElementById('sd-result');
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
  } else {
    renderCalcResult(resultEl, ['Enter at least 2 valid values (e.g. V + I or P + V)']);
    return;
  }
  renderCalcResult(resultEl, deskripsi, '', 'ASHRAE / SNI');
  if (window.MEPHistory) window.MEPHistory.save('Power Triangle', `V=${V||'-'} I=${I||'-'} P=${P||'-'}`, deskripsi.join(' | '));
}

function hitungSizingBreaker() {
  const P = parseFloat(document.getElementById('sb-p').value) || 0;
  const V = parseFloat(document.getElementById('sb-v').value) || 380;
  const cos = parseFloat(document.getElementById('sb-cos').value) || 0.85;
  const phase = document.getElementById('sb-phase').value;
  const safety = parseFloat(document.getElementById('sb-safety').value) || 25;
  const resultEl = document.getElementById('sb-result');

  if (P <= 0) { renderCalcResult(resultEl, ['Enter valid power (kW)']); return; }

  const k = phase === '3' ? Math.sqrt(3) : 1;
  const In = (P * 1000) / (k * V * cos);
  const InSafety = In * (1 + safety / 100);
  const breakers = [6,10,16,20,25,32,40,50,63,80,100,125,160,200,250,315,400,500,630,800];
  const breaker = breakers.find(b => b >= InSafety) || 800;

  const kabelTable = [
    {mm2:1.5,kha:18},{mm2:2.5,kha:25},{mm2:4,kha:34},{mm2:6,kha:44},{mm2:10,kha:60},
    {mm2:16,kha:78},{mm2:25,kha:103},{mm2:35,kha:126},{mm2:50,kha:154},{mm2:70,kha:192}
  ];
  const kabel = kabelTable.find(kb => kb.kha >= InSafety) || kabelTable[kabelTable.length - 1];

  const deskripsi = [
    `In = ${In.toFixed(2)} A`,
    `In × safety = ${InSafety.toFixed(2)} A`,
    `Breaker ≈ ${breaker} A`,
    `Cable ≈ ${kabel.mm2} mm² (KHA ${kabel.kha} A)`
  ];
  renderCalcResult(resultEl, deskripsi, '', 'SNI / IEC');
  if (window.MEPHistory) window.MEPHistory.save('Breaker & Cable Sizing', `P=${P}kW`, deskripsi.join(' | '));
}

function hitungVoltageDrop() {
  const phase = document.getElementById('vd-phase').value;
  const V = parseFloat(document.getElementById('vd-v').value) || (phase === '3' ? 380 : 220);
  const I = parseFloat(document.getElementById('vd-i').value) || 0;
  const L = parseFloat(document.getElementById('vd-l').value) || 0;
  const R = parseFloat(document.getElementById('vd-r').value) || 0.02;
  const X = parseFloat(document.getElementById('vd-x').value) || 0.08;
  const cos = parseFloat(document.getElementById('vd-cos').value) || 0.85;
  const resultEl = document.getElementById('vd-result');

  if (!I || !L) { renderCalcResult(resultEl, ['Enter Current (A) and Length (m)']); return; }

  const sin = Math.sin(Math.acos(cos));
  const dU = (phase === '3' ? Math.sqrt(3) : 2) * I * (R * cos + X * sin) * (L / 1000);
  const dUpersen = (dU / V) * 100;
  const status = dUpersen <= 4 ? '✅ Safe (≤ 4%)' : '⚠️ Exceeds limit';

  const deskripsi = [`ΔU = ${dU.toFixed(2)} V`, `Drop = ${dUpersen.toFixed(2)} %`, status];
  renderCalcResult(resultEl, deskripsi, '', 'ASHRAE / SNI');
  if (window.MEPHistory) window.MEPHistory.save('Voltage Drop', `I=${I}A L=${L}m`, deskripsi.join(' | '));
}

function hitungCapacitorBank() {
  const P = parseFloat(document.getElementById('cb-p').value) || 0;
  const cos1 = parseFloat(document.getElementById('cb-cos1').value) || 0.85;
  const cos2 = parseFloat(document.getElementById('cb-cos2').value) || 0.95;
  const resultEl = document.getElementById('cb-result');

  if (P <= 0) { renderCalcResult(resultEl, ['Enter active power (kW)']); return; }

  const Qc = P * (Math.tan(Math.acos(cos1)) - Math.tan(Math.acos(cos2)));
  const deskripsi = [`Qc = ${Qc.toFixed(2)} kVAR`, `Recommended Bank ≈ ${Math.ceil(Qc)} kVAR`];
  renderCalcResult(resultEl, deskripsi, '', 'SNI');
  if (window.MEPHistory) window.MEPHistory.save('Capacitor Bank', `P=${P}kW`, deskripsi.join(' | '));
}

function hitungResistansiKabel() {
  const S = parseFloat(document.getElementById('rk-s').value) || 0;
  const L = parseFloat(document.getElementById('rk-l').value) || 0;
  const mat = document.getElementById('rk-mat').value;
  const resultEl = document.getElementById('rk-result');

  if (!S || !L) { renderCalcResult(resultEl, ['Enter cross-section and length']); return; }

  const rho = mat === 'cu' ? 22.5 : 36;
  const R = (rho / S) * (L / 1000);
  const deskripsi = [`Resistance R = ${R.toFixed(4)} Ω`, `Material: ${mat.toUpperCase()}`];
  renderCalcResult(resultEl, deskripsi, '', 'SNI');
}

function hitungTrafoGenset() {
  const P = parseFloat(document.getElementById('tg-p').value) || 0;
  const df = parseFloat(document.getElementById('tg-df').value) || 1.2;
  const cos = parseFloat(document.getElementById('tg-cos').value) || 0.85;
  const resultEl = document.getElementById('tg-result');

  if (P <= 0) { renderCalcResult(resultEl, ['Enter total power']); return; }

  const S_trafo = P * df;
  const P_genset = (P * df) / cos;
  const trafoStd = [100,160,200,250,315,400,500,630,800,1000,1250,1600,2000];
  const trafo = trafoStd.find(t => t >= S_trafo) || 2000;

  const deskripsi = [`Transformer ≈ ${trafo} kVA`, `Genset Power ≈ ${P_genset.toFixed(1)} kW`];
  renderCalcResult(resultEl, deskripsi, '', 'SNI');
}

function hitungArmaturLampu() {
  const E = parseFloat(document.getElementById('al-e').value) || 0;
  const A = parseFloat(document.getElementById('al-a').value) || 0;
  const eta = parseFloat(document.getElementById('al-eta').value) || 0.5;
  const d = parseFloat(document.getElementById('al-d').value) || 0.8;
  const lmW = parseFloat(document.getElementById('al-lmw').value) || 80;
  const watt = parseFloat(document.getElementById('al-watt').value) || 36;
  const resultEl = document.getElementById('al-result');

  if (!E || !A) { renderCalcResult(resultEl, ['Enter Lux and Area']); return; }

  const Q = lmW * watt;
  const N = (E * A) / (eta * Q * d);
  const deskripsi = [`Luminaires needed ≈ ${Math.ceil(N)} pcs`, `Total Lumen = ${(E*A).toFixed(0)} lm`];
  renderCalcResult(resultEl, deskripsi, '', 'SNI');
}

function hitungShortCircuit() {
  const S = parseFloat(document.getElementById('sc-s').value) || 0;
  const V = parseFloat(document.getElementById('sc-v').value) || 380;
  const uk = parseFloat(document.getElementById('sc-uk').value) || 4;
  const resultEl = document.getElementById('sc-result');

  if (!S) { renderCalcResult(resultEl, ['Enter Transformer capacity']); return; }

  const Isc = (S * 1000) / (Math.sqrt(3) * V * (uk / 100));
  const deskripsi = [`Isc ≈ ${Isc.toFixed(0)} A`, `Isc ≈ ${(Isc/1000).toFixed(2)} kA`];
  renderCalcResult(resultEl, deskripsi, '', 'IEC');
}

// --- HVAC CALCULATIONS ---
function hitungKapasitasAC() {
  const W = parseFloat(document.getElementById('ac-w').value) || 0;
  const L = parseFloat(document.getElementById('ac-l').value) || 0;
  const H = parseFloat(document.getElementById('ac-h').value) || 3;
  const I = parseFloat(document.getElementById('ac-i').value) || 18;
  const E = parseFloat(document.getElementById('ac-e').value) || 18;
  const sf = parseFloat(document.getElementById('ac-sf').value) || 10;
  const resultEl = document.getElementById('ac-result');

  if (!W || !L) { renderCalcResult(resultEl, ['Enter room dimensions']); return; }

  const Q = 0.59 * W * L * H * I * E;
  const Q_adj = Q * (1 + sf / 100);
  const deskripsi = [`Capacity ≈ ${Q_adj.toFixed(0)} Btu/h`, `≈ ${(Q_adj/9000).toFixed(2)} PK`, `≈ ${(Q_adj/12000).toFixed(2)} TR`];
  renderCalcResult(resultEl, deskripsi, '', 'ASHRAE');
}

function hitungDayaAC() {
  const btu = parseFloat(document.getElementById('dac-btu').value) || 0;
  const resultEl = document.getElementById('dac-result');
  if (!btu) { renderCalcResult(resultEl, ['Enter BTU/h']); return; }
  const P = (btu / 9000) * 746 * 1.3;
  renderCalcResult(resultEl, [`Electric Power ≈ ${P.toFixed(0)} Watt`, `≈ ${(P/1000).toFixed(2)} kW`], '', 'ASHRAE');
}

function hitungPipaRefrigerant() {
  const pk = parseFloat(document.getElementById('pr-pk').value) || 0;
  const resultEl = document.getElementById('pr-result');
  if (!pk) { renderCalcResult(resultEl, ['Enter PK capacity']); return; }
  let liquid = '1/4"', gas = '3/8"';
  if (pk > 1 && pk <= 1.5) { liquid = '1/4"'; gas = '1/2"'; }
  else if (pk > 1.5 && pk <= 5) { liquid = '3/8"'; gas = '5/8"'; }
  else if (pk > 5) { liquid = '1/2"'; gas = '3/4"'; }
  renderCalcResult(resultEl, [`Liquid Line = ${liquid}`, `Gas Line = ${gas}`], '', 'Manufacturer standard');
}

function hitungDucting() {
  const Q = parseFloat(document.getElementById('duct-q').value) || 0;
  const unit = document.getElementById('duct-unit').value;
  const v = parseFloat(document.getElementById('duct-v').value) || 5;
  const resultEl = document.getElementById('duct-result');

  if (!Q) { renderCalcResult(resultEl, ['Enter airflow']); return; }
  const Qm3s = unit === 'cfm' ? Q * 0.0004719 : Q / 3600;
  const A = Qm3s / v;
  const side = Math.sqrt(A) * 1000;
  renderCalcResult(resultEl, [`Area A = ${A.toFixed(4)} m²`, `Square Duct Side ≈ ${side.toFixed(0)} mm`], '', 'ASHRAE');
}

function hitungDiffuser() {
  const Q = parseFloat(document.getElementById('dif-q').value) || 0;
  const p = parseFloat(document.getElementById('dif-p').value) || 300;
  const l = parseFloat(document.getElementById('dif-l').value) || 300;
  const v = parseFloat(document.getElementById('dif-v').value) || 2.5;
  const resultEl = document.getElementById('dif-result');

  if (!Q) { renderCalcResult(resultEl, ['Enter CFM']); return; }
  const count = (Q * 472) / (p * l * v);
  renderCalcResult(resultEl, [`Diffusers needed ≈ ${Math.ceil(count)} pcs`], '', 'ASHRAE');
}

function hitungDayaAHU() {
  const Q = parseFloat(document.getElementById('ahu-q').value) || 0;
  const dP = parseFloat(document.getElementById('ahu-dp').value) || 375;
  const v = parseFloat(document.getElementById('ahu-v').value) || 3;
  const eff = parseFloat(document.getElementById('ahu-eff').value) || 0.8;
  const resultEl = document.getElementById('ahu-result');

  if (!Q) { renderCalcResult(resultEl, ['Enter CFM']); return; }
  const P = (Q * 1.7 * (dP + v * v * 0.6)) / (eff * 3600);
  renderCalcResult(resultEl, [`Fan Power ≈ ${P.toFixed(0)} Watt`, `≈ ${(P/1000).toFixed(2)} kW`], '', 'ASHRAE');
}

function hitungPompaCHWS() {
  const tr = parseFloat(document.getElementById('chws-tr').value) || 0;
  const jenis = document.getElementById('chws-jenis').value;
  const sf = parseFloat(document.getElementById('chws-sf').value) || 15;
  const resultEl = document.getElementById('chws-result');

  if (!tr) { renderCalcResult(resultEl, ['Enter TR']); return; }
  const rate = jenis === 'air' ? 9.1 : 11.4;
  const q = tr * rate * (1 + sf / 100);
  renderCalcResult(resultEl, [`Water Flow ≈ ${q.toFixed(1)} LPM`, `≈ ${(q/60).toFixed(2)} LPS`], '', 'ASHRAE');
}

// --- PLUMBING CALCULATIONS ---
function hitungDiameterPipa() {
  const Q = parseFloat(document.getElementById('dp-q').value) || 0;
  const v = parseFloat(document.getElementById('dp-v').value) || 1.5;
  const resultEl = document.getElementById('dp-result');

  if (!Q) { renderCalcResult(resultEl, ['Enter LPM']); return; }
  const d = Math.sqrt((200 * Q) / (3 * Math.PI * v));
  renderCalcResult(resultEl, [`Calculated Diameter = ${d.toFixed(1)} mm`], '', 'SNI');
}

function hitungHeadPompa() {
  const Lv = parseFloat(document.getElementById('hp-lv').value) || 0;
  const Lt = parseFloat(document.getElementById('hp-lt').value) || 0;
  const f = parseFloat(document.getElementById('hp-f').value) || 0.04;
  const Pf = parseFloat(document.getElementById('hp-pf').value) || 10;
  const sf = parseFloat(document.getElementById('hp-sf').value) || 10;
  const resultEl = document.getElementById('hp-result');

  const H = (Lv + (Lt * f) + Pf) * (1 + sf / 100);
  renderCalcResult(resultEl, [`Total Pump Head ≥ ${H.toFixed(1)} m`], '', 'SNI');
}

function hitungDayaPompa() {
  const H = parseFloat(document.getElementById('dpy-h').value) || 0;
  const Q = parseFloat(document.getElementById('dpy-q').value) || 0;
  const eta = parseFloat(document.getElementById('dpy-eta').value) || 0.6;
  const sf = parseFloat(document.getElementById('dpy-sf').value) || 15;
  const resultEl = document.getElementById('dpy-result');

  if (!H || !Q) { renderCalcResult(resultEl, ['Enter Head and LPM']); return; }
  const P = ((0.163 * H * Q * 1.1) / eta) * (1 + sf / 100);
  renderCalcResult(resultEl, [`Pump Power ≈ ${P.toFixed(0)} Watt`, `≈ ${(P/1000).toFixed(2)} kW`], '', 'SNI');
}

function hitungGroundTank() {
  const qd = parseFloat(document.getElementById('gt-qd').value) || 0;
  const storage = parseFloat(document.getElementById('gt-storage').value) || 20;
  const resultEl = document.getElementById('gt-result');

  if (!qd) { renderCalcResult(resultEl, ['Enter daily demand']); return; }
  const vol = (qd / 1000) * (1 + storage / 100);
  renderCalcResult(resultEl, [`Tank Volume ≈ ${vol.toFixed(2)} m³`], '', 'SNI');
}

// --- FIRE FIGHTING CALCULATIONS ---
function hitungKapasitasPompaFF() {
  const spr = parseFloat(document.getElementById('ff-spr').value) || 0;
  const ihb = parseFloat(document.getElementById('ff-ihb').value) || 0;
  const pil = parseFloat(document.getElementById('ff-pillar').value) || 0;
  const margin = parseFloat(document.getElementById('ff-margin').value) || 10;
  const resultEl = document.getElementById('ff-result');

  const q = ((spr * 80) + (ihb * 400) + (pil * 1000)) * (1 + margin / 100);
  renderCalcResult(resultEl, [`Main Fire Pump ≈ ${q.toFixed(0)} LPM`], '', 'NFPA / SNI');
}

function hitungHeadPompaFF() {
  const lv = parseFloat(document.getElementById('ffh-lv').value) || 0;
  const lj = parseFloat(document.getElementById('ffh-lj').value) || 0;
  const ph = parseFloat(document.getElementById('ffh-ph').value) || 4;
  const resultEl = document.getElementById('ffh-result');

  const head = lv + (lj * 0.05) + (ph * 10);
  renderCalcResult(resultEl, [`Fire Pump Head ≈ ${head.toFixed(1)} m`], '', 'NFPA');
}

function hitungDayaPompaFF() {
  const H = parseFloat(document.getElementById('ffd-h').value) || 0;
  const Q = parseFloat(document.getElementById('ffd-q').value) || 0;
  const resultEl = document.getElementById('ffd-result');

  if (!H || !Q) { renderCalcResult(resultEl, ['Enter Head and LPM']); return; }
  const P = (0.163 * H * (Q / 60) * 1.15) / 0.65;
  renderCalcResult(resultEl, [`Fire Pump Motor ≈ ${P.toFixed(1)} kW`], '', 'NFPA');
}

function hitungTangkiFF() {
  const q = parseFloat(document.getElementById('fft-q').value) || 0;
  const t = parseFloat(document.getElementById('fft-t').value) || 30;
  const resultEl = document.getElementById('fft-result');

  if (!q) { renderCalcResult(resultEl, ['Enter pump flow']); return; }
  const vol = (q * t) / 1000;
  renderCalcResult(resultEl, [`Fire Tank Capacity ≈ ${vol.toFixed(1)} m³`], '', 'NFPA');
}

function hitungDiameterPipaFF() {
  const Q = parseFloat(document.getElementById('ffp-q').value) || 0;
  const v = parseFloat(document.getElementById('ffp-v').value) || 3.5;
  const resultEl = document.getElementById('ffp-result');

  if (!Q) { renderCalcResult(resultEl, ['Enter LPM']); return; }
  const d = Math.sqrt((200 * Q) / (3 * Math.PI * v));
  renderCalcResult(resultEl, [`Fire Pipe Diameter = ${d.toFixed(1)} mm`], '', 'NFPA');
}

function hitungSprinklerPipeSizeFF() {
  const pts = parseFloat(document.getElementById('ffsp-points').value) || 1;
  const resultEl = document.getElementById('ffsp-result');
  let size = pts <= 1 ? '25 mm (1")' : (pts <= 2 ? '32 mm (1-1/4")' : '50 mm (2")');
  renderCalcResult(resultEl, [`Recommended Size = ${size}`], '', 'NFPA 13');
}

// --- ELECTRONIC CALCULATIONS ---
function hitungSPL() {
  const sens = parseFloat(document.getElementById('sp-sensitivity').value) || 90;
  const pwr = parseFloat(document.getElementById('sp-power').value) || 50;
  const dist = parseFloat(document.getElementById('sp-distance').value) || 10;
  const count = parseFloat(document.getElementById('sp-count').value) || 1;
  const resultEl = document.getElementById('sp-result');

  const spl = sens + (10 * Math.log10(pwr)) - (20 * Math.log10(dist)) + (10 * Math.log10(count));
  renderCalcResult(resultEl, [`Calculated SPL = ${spl.toFixed(1)} dB`], '', 'Acoustic standard');
}

// --- CONVERTERS ---
function convertBTUtoPKTR() {
  const btu = parseFloat(document.getElementById('btu-value').value) || 0;
  const el = document.getElementById('btu-result');
  renderCalcResult(el, [`${btu} BTU/h = ${(btu/9000).toFixed(2)} PK`, `= ${(btu/12000).toFixed(2)} TR`]);
}

function convertPKtoWatt() {
  const pk = parseFloat(document.getElementById('pk-value').value) || 0;
  const el = document.getElementById('pk-result');
  renderCalcResult(el, [`${pk} PK = ${(pk * 746 * 1.3).toFixed(0)} Watt`]);
}

function convertM3hToCFM() {
  const m3h = parseFloat(document.getElementById('m3h-value').value) || 0;
  const el = document.getElementById('m3h-result');
  renderCalcResult(el, [`${m3h} m³/h = ${(m3h * 0.5886).toFixed(2)} CFM`]);
}

function convertCFMToLs() {
  const cfm = parseFloat(document.getElementById('cfm-value').value) || 0;
  const el = document.getElementById('cfm-result');
  renderCalcResult(el, [`${cfm} CFM = ${(cfm * 0.4719).toFixed(2)} L/s`]);
}

function convertWattToAmp() {
  const w = parseFloat(document.getElementById('watt-value').value) || 0;
  const v = parseFloat(document.getElementById('watt-voltage').value) || 230;
  const phase = document.getElementById('watt-phase').value;
  const el = document.getElementById('watt-result');
  const k = phase === '3' ? Math.sqrt(3) : 1;
  const a = w / (k * v * 0.85);
  renderCalcResult(el, [`${w} Watt = ${a.toFixed(2)} Ampere`]);
}