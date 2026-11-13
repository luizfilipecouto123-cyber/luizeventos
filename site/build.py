#!/usr/bin/env python3
"""Gera site/index.html (documento completo) a partir de site/pagina.html.

pagina.html é a fonte: é o mesmo arquivo publicado como Artifact no claude.ai,
que recebe o esqueleto <!doctype>/<html>/<head>/<body> na publicação. Para
hospedar o site em outro lugar (GitHub Pages, Netlify, um servidor comum),
este script coloca o conteúdo dentro de um documento HTML completo.

Uso:  python3 site/build.py
"""
from pathlib import Path
import sys

AQUI = Path(__file__).resolve().parent
FONTE = AQUI / "pagina.html"
SAIDA = AQUI / "index.html"
MARCA = "<!-- /head -->"

RESET = (
    ":root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);"
    "padding-bottom:env(safe-area-inset-bottom,0px)}"
    "body{margin:0}"
    "img{max-width:100%}"
    "[hidden]{display:none!important}"
)


def main() -> int:
    texto = FONTE.read_text(encoding="utf-8")
    if texto.count(MARCA) != 1:
        print(f"erro: {FONTE.name} precisa ter exatamente um {MARCA!r}", file=sys.stderr)
        return 1
    cabeca, corpo = texto.split(MARCA)
    doc = (
        "<!doctype html>\n"
        '<html lang="pt-BR">\n'
        "<head>\n"
        '<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        f"<style>{RESET}</style>\n"
        f"{cabeca.strip()}\n"
        "</head>\n"
        "<body>\n"
        f"{corpo.strip()}\n"
        "</body>\n"
        "</html>\n"
    )
    doc = doc.replace(
        "<!doctype html>\n",
        "<!doctype html>\n<!-- Arquivo gerado por build.py a partir de pagina.html. Edite pagina.html. -->\n",
        1,
    )
    SAIDA.write_text(doc, encoding="utf-8")
    print(f"gerado {SAIDA.relative_to(AQUI.parent)} ({len(doc):,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
