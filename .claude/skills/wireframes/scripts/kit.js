// Shared drawing primitives for scaffold wireframes.
//
// Every screen a PRD needs gets its own small generator script that requires
// this module, calls frame()/notes() plus whichever UI primitives the screen
// needs, then render()s to PNG. This file has no knowledge of any specific
// feature — it only knows how to draw a browser chrome, an AC-binding gutter,
// and a set of generic UI building blocks (forms, lists, badges, cards).

const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const W = 1100, H = 720;
const INK = '#1F2933', MUT = '#7B8794', LINE = '#CBD2D9', FILL = '#F5F7FA',
      BTN = '#3E4C59', ERR = '#C1483B', ERRBG = '#FDF2F1', ERRLINE = '#E8A29A',
      NOTE = '#0B7285', NOTEBG = '#E6F4F6', WARNBG = '#FFF7E6', WARNLINE = '#E5C07B', WARN = '#946200',
      OKBG = '#E8F5E9', OKLINE = '#A5D6A7', OK = '#2E7D32';

const F = 'Segoe UI, Arial, Helvetica, sans-serif';
const APPW = 770;   // app viewport width; gutter fills the rest of W

let e = [];
const push = (s) => e.push(s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------------- primitives ---------------- */

function rect(x, y, w, h, o = {}) {
  push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r || 0}" fill="${o.fill || 'none'}" stroke="${o.stroke || 'none'}" stroke-width="${o.sw || 1}" ${o.dash ? `stroke-dasharray="${o.dash}"` : ''}/>`);
}
function text(x, y, s, o = {}) {
  push(`<text x="${x}" y="${y}" font-family="${F}" font-size="${o.size || 13}" fill="${o.fill || INK}" font-weight="${o.bold ? 600 : 400}" text-anchor="${o.anchor || 'start'}" ${o.ls ? `letter-spacing="${o.ls}"` : ''}>${esc(s)}</text>`);
}
function line(x1, y1, x2, y2, o = {}) {
  push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke || LINE}" stroke-width="${o.sw || 1}" ${o.dash ? `stroke-dasharray="${o.dash}"` : ''}/>`);
}
function circle(cx, cy, r, o = {}) {
  push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${o.fill || 'none'}" stroke="${o.stroke || 'none'}" stroke-width="${o.sw || 1}"/>`);
}
function pathEl(d, o = {}) {
  push(`<path d="${d}" fill="${o.fill || 'none'}" stroke="${o.stroke || 'none'}" stroke-width="${o.sw || 1}" stroke-linecap="round"/>`);
}

/* ---------------- chrome + AC gutter ---------------- */

// Call first, per screen. Resets the canvas and draws the browser chrome plus
// the annotation gutter with a state chip (e.g. DEFAULT, ERROR, LOADING).
function frame(urlPath, stateLabel) {
  e = [];
  push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#FFFFFF"/>`);
  rect(0.5, 0.5, APPW, H - 1, { stroke: LINE });
  rect(0.5, 0.5, APPW, 34, { fill: FILL, stroke: LINE });
  circle(18, 17, 4, { fill: '#D8DEE4' });
  circle(32, 17, 4, { fill: '#D8DEE4' });
  circle(46, 17, 4, { fill: '#D8DEE4' });
  rect(64, 8, 320, 18, { fill: '#FFFFFF', stroke: LINE, r: 3 });
  text(72, 21, urlPath, { size: 11, fill: MUT });
  line(APPW, 0, APPW, H, { stroke: LINE });
  text(APPW + 26, 34, 'ACCEPTANCE CRITERIA', { size: 10, bold: true, fill: NOTE, ls: 1.2 });
  const chipW = Math.max(90, stateLabel.length * 8 + 30);
  rect(APPW + 26, 50, chipW, 22, { fill: NOTEBG, r: 11 });
  text(APPW + 26 + chipW / 2, 65, stateLabel, { size: 11, bold: true, fill: NOTE, anchor: 'middle' });
}

// items: [[ 'AC3', 'text of the criterion...' ], ...]. Word-wraps into the gutter.
function notes(items) {
  let y = 100;
  items.forEach(([ac, txt]) => {
    text(APPW + 26, y, ac, { size: 11, bold: true, fill: NOTE });
    const words = txt.split(' ');
    let ln = '', lines = [];
    words.forEach((w) => {
      if ((ln + ' ' + w).trim().length > 40) { lines.push(ln.trim()); ln = w; }
      else ln = (ln + ' ' + w).trim();
    });
    if (ln) lines.push(ln);
    lines.forEach((l, i) => text(APPW + 26, y + 16 + i * 14, l, { size: 11, fill: MUT }));
    y += 16 + lines.length * 14 + 14;
  });
}

/* ---------------- generic UI building blocks ---------------- */

function card(x, y, w, h) {
  rect(x, y, w, h, { fill: '#FFFFFF', stroke: LINE, r: 8 });
}
function heading(cx, y, title, sub) {
  text(cx, y, title, { size: 22, bold: true, anchor: 'middle' });
  if (sub) text(cx, y + 22, sub, { size: 12.5, fill: MUT, anchor: 'middle' });
}
function footer(x, w, y, label) {
  line(x, y, x + w, y, { stroke: LINE });
  text(x + w / 2, y + 24, label, { size: 11.5, fill: MUT, anchor: 'middle' });
}
function logo(cx, cy, label = 'logo') {
  rect(cx - 26, cy, 52, 52, { fill: FILL, stroke: LINE, dash: '4 3', r: 6 });
  text(cx, cy + 31, label, { size: 11, fill: MUT, anchor: 'middle' });
}

// A labeled input. o.eye adds a password-visibility toggle icon.
function field(x, y, w, label, value, o = {}) {
  text(x, y, label, { size: 12, bold: true });
  rect(x, y + 8, w, 38, { fill: o.disabled ? FILL : '#FFFFFF', stroke: o.err ? ERRLINE : LINE, r: 4, sw: o.err ? 1.5 : 1 });
  text(x + 12, y + 32, value, { size: 13, fill: value ? (o.disabled ? MUT : INK) : MUT });
  if (o.eye) {
    const ex = x + w - 26;
    pathEl(`M ${ex - 9} ${y + 27} Q ${ex} ${y + 18} ${ex + 9} ${y + 27} Q ${ex} ${y + 36} ${ex - 9} ${y + 27} Z`, { stroke: MUT, sw: 1.2 });
    circle(ex, y + 27, 3, { stroke: MUT, sw: 1.2 });
  }
  if (o.errMsg) text(x, y + 62, o.errMsg, { size: 11.5, fill: ERR });
}

function button(x, y, w, label, o = {}) {
  rect(x, y, w, 42, { fill: o.disabled ? '#A7B0B8' : (o.variant === 'secondary' ? '#FFFFFF' : BTN), stroke: o.variant === 'secondary' ? LINE : 'none', r: 4 });
  const fg = o.variant === 'secondary' ? INK : '#FFFFFF';
  if (o.spinner) {
    const sx = x + w / 2 - 46;
    pathEl(`M ${sx} ${y + 21} a 8 8 0 1 1 5.6 7.6`, { stroke: fg, sw: 2 });
    text(x + w / 2 + 12, y + 26, label, { size: 13.5, bold: true, fill: fg, anchor: 'middle' });
  } else {
    text(x + w / 2, y + 26, label, { size: 13.5, bold: true, fill: fg, anchor: 'middle' });
  }
}

// Full-width status/error/info banner. kind: 'err' | 'warn' | 'ok' | 'info'.
function banner(x, y, w, msg, kind = 'info') {
  const map = {
    err: [ERRBG, ERRLINE, ERR], warn: [WARNBG, WARNLINE, WARN],
    ok: [OKBG, OKLINE, OK], info: [NOTEBG, LINE, NOTE],
  };
  const [bg, st, fg] = map[kind] || map.info;
  const h = 44;
  rect(x, y, w, h, { fill: bg, stroke: st, r: 4 });
  circle(x + 20, y + h / 2, 7, { stroke: fg, sw: 1.3 });
  text(x + 20, y + h / 2 + 4, '!', { size: 11, bold: true, fill: fg, anchor: 'middle' });
  text(x + 36, y + h / 2 + 4, msg, { size: 12, fill: fg });
}

// Small status pill — table status, order status, stock level, etc.
// kind: 'ok' | 'warn' | 'err' | 'info' | 'neutral'.
function badge(x, y, label, kind = 'neutral') {
  const map = {
    ok: [OKBG, OK], warn: [WARNBG, WARN], err: [ERRBG, ERR],
    info: [NOTEBG, NOTE], neutral: [FILL, MUT],
  };
  const [bg, fg] = map[kind] || map.neutral;
  const w = label.length * 6.5 + 20;
  rect(x, y, w, 22, { fill: bg, r: 11 });
  text(x + w / 2, y + 15, label, { size: 11, bold: true, fill: fg, anchor: 'middle' });
  return w;
}

// One row of a list/table: cells = [{text, w, bold, align}]. Draws a bottom
// divider. Returns the y of the next row.
function listRow(x, y, w, cells, o = {}) {
  if (o.zebra) rect(x, y, w, o.h || 44, { fill: '#FAFBFC' });
  let cx = x + 16;
  cells.forEach((c) => {
    text(cx, y + (o.h || 44) / 2 + 4, c.text, { size: 12.5, bold: !!c.bold, fill: c.fill || INK, anchor: c.align || 'start' });
    cx += c.w;
  });
  line(x, y + (o.h || 44), x + w, y + (o.h || 44), { stroke: LINE });
  return y + (o.h || 44);
}

function sectionLabel(x, y, txt) {
  text(x, y, txt, { size: 11, bold: true, fill: MUT, ls: 1 });
}

/* ---------------- render ---------------- */

// Writes <outDir>/<name>.png from the elements accumulated since frame().
function render(outDir, name) {
  fs.mkdirSync(outDir, { recursive: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${e.join('')}</svg>`;
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W * 1.4 } }).render().asPng();
  const outPath = path.join(outDir, name);
  fs.writeFileSync(outPath, png);
  console.log('  ', name, (png.length / 1024).toFixed(0) + 'KB');
  return outPath;
}

module.exports = {
  W, H, APPW, INK, MUT, LINE, FILL, BTN, ERR, NOTE,
  rect, text, line, circle, pathEl,
  frame, notes,
  card, heading, footer, logo, field, button, banner, badge, listRow, sectionLabel,
  render,
};
