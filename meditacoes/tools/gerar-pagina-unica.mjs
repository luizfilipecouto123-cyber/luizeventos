// Gera dist/meditacoes.html: o site inteiro num só arquivo (CSS e JS
// embutidos), útil para abrir sem servidor ou publicar como página única.
//
//   node tools/gerar-pagina-unica.mjs            → documento HTML completo
//   node tools/gerar-pagina-unica.mjs --fragmento → sem <html>/<head>/<body>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const fragmento = process.argv.includes("--fragmento");
const ler = (p) => readFileSync(join(raiz, p), "utf8");

let html = ler("index.html");

html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g,
  (_, p) => `<style>\n${ler(p)}</style>`);
html = html.replace(/<script src="((?:js|data)\/[^"]+)"><\/script>/g,
  (_, p) => `<script>\n${ler(p).replace(/<\/script/gi, "<\\/script")}</script>`);

if (fragmento) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
    .replace(/<meta charset[^>]*>\s*/, "")
    .replace(/<meta name="viewport"[^>]*>\s*/, "");
  const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
  html = head.trim() + "\n" + body.trim() + "\n";
}

const saida = join(raiz, "dist", fragmento ? "meditacoes-fragmento.html" : "meditacoes.html");
mkdirSync(dirname(saida), { recursive: true });
writeFileSync(saida, html);
console.log("gerado:", saida, (html.length / 1024).toFixed(1) + " KB");
