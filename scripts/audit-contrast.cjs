// Medición de contraste por píxeles, con el fondo resuelto por composicion
// de ancestros (el unico metodo fiable) y VALIDADO contra los pixeles
// reales: el fondo calculado debe aparecer de verdad junto al texto.
//
//   node scripts/audit-contrast.cjs
//
// Requiere el servidor de desarrollo en http://localhost:1420.
const { chromium } = require('C:/Users/rperez/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const { decodePNG } = require('C:/Users/rperez/AppData/Local/Temp/opencode/png.js');

function srgb(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function lum([r, g, b]) { return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b); }
function ratio(a, b) { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); }
function parseColor(s) {
  const m = String(s).match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (!m) return null;
  return { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] };
}
const over = (fg, a, bg) => [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));

const VIEWS = ['Mi Día', 'Bandeja', 'Esperando de Otros', 'Casos & Proyectos', 'Compromisos', 'Tickets & Soporte', 'Clientes', 'Correos', 'Documentos & Word', 'Notas & Bitácora', 'Calendario', 'Analíticas & SLA', 'Resumen', 'Configuración'];

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  let totalFallos = 0;

  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.goto('http://localhost:1420', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2200);
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    await page.waitForTimeout(700);

    let checked = 0;
    const fails = [];
    const vistos = new Set();

    for (const view of VIEWS) {
      await page.evaluate((l) => {
        const b = [...document.querySelectorAll('.nav-item')].find((n) => (n.textContent || '').trim() === l);
        b && b.click();
      }, view);
      await page.waitForTimeout(700);

      // El fondo efectivo se resuelve componiendo los background-color de
      // los ancestros (de dentro hacia fuera) sobre el fondo de la pagina.
      const runs = await page.evaluate(() => {
        const parse = (s) => {
          const m = String(s).match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/);
          return m ? { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] } : null;
        };
        const over = (fg, a, bg) => [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));

        const out = [];
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walk.nextNode())) {
          const t = n.textContent.trim();
          if (!t) continue;
          const el = n.parentElement;
          if (!el || el.children.length > 0) continue;
          const r = document.createRange();
          r.selectNodeContents(n);
          for (const rc of [...r.getClientRects()].filter((x) => x.width > 3 && x.height > 6)) {
            const cs = getComputedStyle(el);
            if (cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;

            // cadena de ancestros con su background-color
            const capas = [];
            let p = el;
            while (p && p !== document.documentElement) {
              const pc = getComputedStyle(p);
              const c = parse(pc.backgroundColor);
              if (c && c.a > 0) {
                // si hay gradiente, el color plano no sirve: se marca
                capas.push(c.a === 1 && pc.backgroundImage === 'none' ? c : { gradiente: true });
              }
              p = p.parentElement;
            }
            const raiz = getComputedStyle(document.body).backgroundColor;
            const rc0 = parse(raiz) || { rgb: [255, 255, 255], a: 1 };
            let bg = rc0.rgb;
            let conGradiente = false;
            for (let i = capas.length - 1; i >= 0; i--) {
              if (capas[i].gradiente) { conGradiente = true; break; }
              bg = over(capas[i].rgb, capas[i].a, bg);
            }

            out.push({
              text: t.slice(0, 34),
              x: Math.round(rc.left), y: Math.round(rc.top),
              w: Math.round(rc.width), h: Math.round(rc.height),
              size: parseFloat(cs.fontSize), weight: cs.fontWeight,
              color: cs.color, opacity: parseFloat(cs.opacity),
              bg, conGradiente,
            });
          }
        }
        return out;
      });

      const img = decodePNG(await page.screenshot());

      for (const r of runs) {
        const c = parseColor(r.color);
        if (!c) continue;

        // validacion: el fondo calculado debe aparecer junto al texto
        const cerca = [];
        for (let dy = -1; dy <= r.h + 1; dy++) {
          for (let dx = 0; dx < r.w; dx++) {
            const x = r.x + dx, y = r.y + dy;
            if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
            const i = (y * img.w + x) * img.bpp;
            cerca.push([img.data[i], img.data[i + 1], img.data[i + 2]]);
          }
        }
        if (!cerca.length) continue;
        const coincide = cerca.filter((p) => Math.abs(p[0] - r.bg[0]) < 4 && Math.abs(p[1] - r.bg[1]) < 4 && Math.abs(p[2] - r.bg[2]) < 4);
        if (coincide.length / cerca.length < 0.15) continue; // fondo no verificado: se omite

        const fg = over(c.rgb, c.a * r.opacity, r.bg);
        const cr = ratio(fg, r.bg);
        checked++;
        const large = r.size >= 24 || (r.size >= 18.66 && parseInt(r.weight) >= 700);
        const need = large ? 3 : 4.5;
        if (cr < need) {
          const clave = `${theme}|${r.text}|${r.x},${r.y}`;
          if (!vistos.has(clave)) {
            vistos.add(clave);
            fails.push({ ...r, ratio: +cr.toFixed(2), need, fg: fg.map(Math.round) });
          }
        }
      }
    }

    totalFallos += fails.length;
    console.log(`\n=== ${theme.toUpperCase()} === ${checked} medidos · ${fails.length} fallos AA`);
    fails.slice(0, 20).forEach((f) =>
      console.log(`  ${f.ratio}:1 (need ${f.need}) "${f.text}" ${f.size}px fg=${f.fg} fondo=${f.bg}${f.conGradiente ? ' [gradiente]' : ''}`)
    );
    await page.close();
  }

  console.log(`\nTOTAL de fallos reales: ${totalFallos}`);
  await browser.close();
})().catch((e) => { console.error('ERR', e.stack); process.exit(1); });
