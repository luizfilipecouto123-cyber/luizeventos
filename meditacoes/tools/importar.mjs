// Importa as meditações do site Rumo à Santidade para data/meditacoes.js.
//
//   node tools/importar.mjs
//
// 1. baixa o índice (FONTE) e reúne os links para as meditações;
// 2. baixa cada meditação (com cache em tools/.cache) e extrai título e texto;
// 3. identifica o dia litúrgico pelo texto do link ou pelo título;
// 4. grava data/meditacoes.js e data/relatorio-importacao.txt, que lista
//    o que não foi possível identificar, para ajuste manual em AJUSTES.
//
// Usa o curl do sistema para respeitar proxies configurados no ambiente.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const SANTORAL = require(join(raiz, "js", "santoral.js"));

const FONTE = "https://rumoasantidade.com.br/meditacoes-santo-afonso/";
const HOST = new URL(FONTE).host;
const CACHE = join(raiz, "tools", ".cache");

// Correções manuais: url (ou parte dela) → chave do dia litúrgico.
const AJUSTES = {
  // "/meditacao-exemplo/": "PENT-18-5",
};

// ───────── rede ─────────
function baixar(url) {
  mkdirSync(CACHE, { recursive: true });
  const arq = join(CACHE, createHash("sha1").update(url).digest("hex") + ".html");
  if (existsSync(arq)) return readFileSync(arq, "utf8");
  const html = execFileSync("curl", ["-sSL", "--compressed", "--max-time", "60", "-A",
    "Mozilla/5.0 (meditacoes-santo-afonso importador)", url], { encoding: "utf8", maxBuffer: 64 << 20 });
  writeFileSync(arq, html);
  execFileSync("sleep", ["0.4"]);
  return html;
}

// ───────── HTML → texto ─────────
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»",
  ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ordm: "º", ordf: "ª" };
function texto(html) {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

function conteudo(html) {
  const ini = html.search(/class="[^"]*\bentry-content\b/);
  let trecho = ini >= 0 ? html.slice(ini) : html;
  const fim = trecho.search(/<footer|class="[^"]*(sharedaddy|jp-relatedposts|post-navigation|entry-footer)|<\/article>/);
  if (fim > 0) trecho = trecho.slice(0, fim);
  return trecho;
}

function blocos(trecho) {
  const out = [];
  const re = /<(h[1-6]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(trecho))) {
    const t = texto(m[2]);
    if (!t) continue;
    out.push([/^h/i.test(m[1]) ? "h" : "p", t]);
  }
  return out;
}

function titulo(html) {
  const m = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
    || html.match(/<meta property="og:title" content="([^"]*)"/i)
    || html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? texto(m[1]).replace(/\s*[–|-]\s*Rumo [àa] Santidade.*$/i, "") : "";
}

function links(html) {
  const vistos = new Map();
  const re = /<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(conteudo(html)))) {
    let u;
    try { u = new URL(m[1], FONTE); } catch { continue; }
    if (u.host !== HOST || u.href === FONTE) continue;
    if (/\/(category|tag|author|wp-content|wp-admin|page)\//.test(u.pathname)) continue;
    const t = texto(m[2]);
    if (t && !vistos.has(u.href)) vistos.set(u.href, t);
  }
  return [...vistos].map(([url, rotulo]) => ({ url, rotulo }));
}

// ───────── identificar o dia litúrgico ─────────
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[ºª°]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto",
  "setembro", "outubro", "novembro", "dezembro"];
const SEMANA = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
const UNID = { primeir: 1, segund: 2, terceir: 3, quart: 4, quint: 5, sext: 6, setim: 7, sétim: 7,
  oitav: 8, non: 9 };
const ROMANOS = { i: 1, v: 5, x: 10 };

function deRomano(s) {
  if (!/^[ivx]+$/.test(s)) return null;
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const a = ROMANOS[s[i]], b = ROMANOS[s[i + 1]] || 0;
    n += a < b ? -a : a;
  }
  return n;
}

// Número ordinal do texto ("18", "xviii", "decimo oitavo", "vigesima quarta").
function ordinal(t) {
  let m = t.match(/\b(\d{1,2})\b(?! de )/);
  if (m) return +m[1];
  for (const p of t.split(" ")) {
    const r = deRomano(p);
    if (r) return r;
  }
  let n = 0;
  if (/\bdecim[oa]\b/.test(t)) n = 10;
  if (/\bvigesim[oa]\b/.test(t)) n = 20;
  for (const [raizU, v] of Object.entries(UNID)) {
    if (new RegExp("\\b" + raizU + "(o|a)\\b").test(t) && !(raizU === "segund" && /segunda feira/.test(t) && !/segunda (semana|domingo)/.test(t))) {
      if (raizU === "sext" && /sexta feira/.test(t)) continue;
      if (raizU === "quart" && /quarta feira/.test(t)) continue;
      if (raizU === "quint" && /quinta feira/.test(t)) continue;
      return n + v;
    }
  }
  return n || null;
}

function diaSemana(t) {
  for (const [k, v] of Object.entries(SEMANA)) if (new RegExp("\\b" + k + "\\b").test(t)) return v;
  return null;
}

const FESTAS_MOVEIS = [
  [/trindade/, "F-TRINDADE"],
  [/corpus christi|corpo de deus|corpo de (nosso senhor|cristo)|santissimo sacramento/, "F-CORPUS-CHRISTI"],
  [/(sagrado|sacratissimo) coracao de jesus/, "F-SAGRADO-CORACAO"],
  [/cristo rei|jesus cristo rei/, "F-CRISTO-REI"],
  [/sagrada familia/, "F-SAGRADA-FAMILIA"],
  [/nome de jesus/, "F-NOME-JESUS"],
  [/batismo de (nosso senhor|jesus)/, "F-BATISMO"]
];

function chaveDoTempo(t) {
  const dow = diaSemana(t);
  const n = ordinal(t.replace(/\b(segunda|terca|quarta|quinta|sexta) feira\b/g, " "));
  if (/advento/.test(t) && n && dow !== null) return `ADV-${n}-${dow}`;
  if (/depois da epifania|apos a epifania/.test(t) && n && dow !== null) return `EPI-${n}-${dow}`;
  if (/septuagesima/.test(t) && dow !== null) return `SEPT-${dow}`;
  if (/sexagesima/.test(t) && dow !== null) return `SEXA-${dow}`;
  if (/quinquagesima/.test(t) && dow !== null) return `QUINQ-${dow}`;
  if (/cinzas/.test(t) && dow !== null) return `QUAD-0-${dow}`;
  if (/quaresma/.test(t) && n && dow !== null) return `QUAD-${n}-${dow}`;
  if (/^sexta feira da paixao( do senhor)?$/.test(t)) return "PASS-2-5";
  if (/ramos|semana santa|(feira|sabado) santo?a?\b/.test(t) && dow !== null) return `PASS-2-${dow}`;
  if (/paixao/.test(t) && dow !== null) return `PASS-${n === 2 ? 2 : 1}-${dow}`;
  if (/in albis|pascoela/.test(t) && dow !== null) return `PASC-2-${dow}`;
  if (/oitava da pascoa|domingo de pascoa|ressurreicao/.test(t) && dow !== null) return `PASC-1-${dow}`;
  if (/(depois|apos) da pascoa/.test(t) && n && dow !== null) return `PASC-${n + 1}-${dow}`;
  if (/ascensao/.test(t)) {
    if (/domingo/.test(t)) return "PASC-7-0";
    if (/vigilia/.test(t)) return "PASC-6-3";
    if (/(depois|apos) da ascensao/.test(t) && dow !== null) return `PASC-${dow >= 5 ? 6 : 7}-${dow}`;
    return "PASC-6-4";
  }
  if (/vigilia de pentecostes/.test(t)) return "PASC-7-6";
  if (/domingo de pentecostes|^pentecostes$/.test(t)) return "PASC-8-0";
  if (/oitava de pentecostes/.test(t) && dow !== null) return `PASC-8-${dow}`;
  if (/(depois|apos) de pentecostes/.test(t) && n && dow !== null) return `PENT-${n}-${dow}`;
  return null;
}

const SANTOS = Object.entries(SANTORAL).flatMap(([k, lista]) =>
  lista.map((e) => ({ chave: "S-" + k, palavras: new Set(norm(e[2]).replace(/\b(s|sao|santo|santa|santos|ss|e|de|da|do|dos|das|o|a|os|as)\b/g, " ").split(" ").filter((w) => w.length > 2)) })));

function chaveDoSanto(t) {
  const m = t.match(/\b(\d{1,2}) de (janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/);
  if (m) {
    const mm = String(MESES.indexOf(m[2]) + 1).padStart(2, "0"), dd = m[1].padStart(2, "0");
    return SANTORAL[`${mm}-${dd}`] ? `S-${mm}-${dd}` : `D-${mm}-${dd}`;
  }
  const palavras = t.split(" ").filter((w) => w.length > 2);
  let melhor = null, nota = 0;
  for (const s of SANTOS) {
    const comuns = palavras.filter((w) => s.palavras.has(w)).length;
    const r = comuns / Math.max(s.palavras.size, 1);
    if (comuns >= 1 && r > nota) { nota = r; melhor = s.chave; }
  }
  return nota >= 0.6 ? melhor : null;
}

function identificar(...textos) {
  for (const bruto of textos) {
    const t = norm(bruto || "");
    if (!t) continue;
    for (const [re, k] of FESTAS_MOVEIS) if (re.test(t)) return k;
    const k = chaveDoTempo(t) || chaveDoSanto(t);
    if (k) return k;
  }
  return null;
}

export { identificar };

// ───────── execução ─────────
if (process.argv[1] === fileURLToPath(import.meta.url)) principal();

function principal() {
const indice = baixar(FONTE);
const lista = links(indice);
console.log(`${lista.length} links no índice`);

const itens = {}, problemas = [];
for (const [i, { url, rotulo }] of lista.entries()) {
  let html;
  try { html = baixar(url); } catch (e) { problemas.push(`ERRO AO BAIXAR\t${url}\t${e.message}`); continue; }
  const tit = titulo(html) || rotulo;
  const ajuste = Object.entries(AJUSTES).find(([parte]) => url.includes(parte));
  const chave = ajuste ? ajuste[1] : identificar(rotulo, tit);
  const corpo = blocos(conteudo(html));
  if (!chave) { problemas.push(`SEM CHAVE\t${url}\t${rotulo}\t${tit}`); continue; }
  if (itens[chave]) problemas.push(`DUPLICADA\t${chave}\t${url}\t(já: ${itens[chave].url})`);
  else itens[chave] = { titulo: tit, url, blocos: corpo };
  process.stdout.write(`\r${i + 1}/${lista.length}`);
}
console.log();

const cabecalho = readFileSync(join(raiz, "data", "meditacoes.js"), "utf8").split("window.MEDITACOES")[0];
writeFileSync(join(raiz, "data", "meditacoes.js"),
  cabecalho + "window.MEDITACOES = " + JSON.stringify({ fonte: FONTE, itens }, null, 1) + ";\n");
writeFileSync(join(raiz, "data", "relatorio-importacao.txt"),
  `Importadas: ${Object.keys(itens).length}\nProblemas: ${problemas.length}\n\n` + problemas.join("\n") + "\n");
console.log(`importadas ${Object.keys(itens).length}; problemas ${problemas.length} (ver data/relatorio-importacao.txt)`);
}
