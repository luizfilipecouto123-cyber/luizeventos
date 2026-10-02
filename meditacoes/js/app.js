(function () {
  "use strict";

  var C = window.Calendario1962;
  var DADOS = window.MEDITACOES || { itens: {} };
  var FONTE = DADOS.fonte || "https://rumoasantidade.com.br/meditacoes-santo-afonso/";
  var LIT = {
    w: "var(--lit-w)", r: "var(--lit-r)", v: "var(--lit-v)",
    g: "var(--lit-g)", p: "var(--lit-p)", b: "var(--lit-b)"
  };
  var ANO_MIN = 1900, ANO_MAX = 2199;

  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(o) { return o.y + "-" + pad(o.m) + "-" + pad(o.d); }
  function hoje() {
    var d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  }
  function deIso(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    if (!m) return null;
    var o = { y: +m[1], m: +m[2], d: +m[3] };
    var t = new Date(Date.UTC(o.y, o.m - 1, o.d));
    if (t.getUTCMonth() !== o.m - 1 || o.y < ANO_MIN || o.y > ANO_MAX) return null;
    return o;
  }
  function somar(o, n) {
    var t = new Date(Date.UTC(o.y, o.m - 1, o.d + n));
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  }
  function el(tag, attrs, texto) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (texto != null) e.textContent = texto;
    return e;
  }
  function guardar(chave, valor) {
    try { if (valor) localStorage.setItem(chave, valor); else localStorage.removeItem(chave); } catch (e) { /* armazenamento indisponível */ }
  }
  function ler(chave) {
    try { return localStorage.getItem(chave) || ""; } catch (e) { return ""; }
  }

  var atual = null;

  // ───────── o dia litúrgico ─────────
  function grau(r) {
    var tipo = r.tipo === "Féria" ? "Féria" : r.tipo;
    var cls = r.classe ? tipo + " de " + r.classeTexto : tipo;
    return cls + " · " + r.corNome;
  }

  function dataDaFesta(chaves) {
    var k = (chaves || []).filter(function (c) { return /^S-\d\d-\d\d$/.test(c); })[0];
    if (!k) return "";
    var mes = +k.slice(2, 4), dia = +k.slice(5, 7);
    return dia + " de " + C.MESES[mes - 1];
  }

  function mostrarDia(r) {
    $("dia-data").textContent = r.dataExtenso;
    $("dia-celebracao").textContent = r.celebracao;
    $("dia-grau").textContent = grau(r);

    var linhaTempo = r.vencedorEhTempo ? r.tempo : r.diaDoTempo + " · " + r.tempo;
    if (r.notaTempo) linhaTempo += " · " + r.notaTempo;
    $("dia-tempo").textContent = linhaTempo;

    var com = $("dia-comemoracoes");
    com.textContent = "";
    var partes = [];
    if (r.comemoracoes.length) partes.push(["Comemoração", r.comemoracoes.join("; ")]);
    r.omitidas.forEach(function (o) {
      if (o.motivo === "transferida") partes.push(["Transferida", o.nome]);
    });
    if (r.sabadoMariano) partes.push(["Facultativa", "Santa Maria no sábado"]);
    partes.forEach(function (p, i) {
      if (i) com.appendChild(document.createTextNode(" · "));
      com.appendChild(el("em", null, p[0] + ": "));
      com.appendChild(document.createTextNode(p[1]));
    });
    com.hidden = partes.length === 0;

    $("pagina").style.setProperty("--lit", LIT[r.cor] || LIT.g);
    $("fita").setAttribute("data-cor", r.cor);
    $("dia-amostra").setAttribute("data-cor", r.cor);
  }

  // ───────── a meditação ─────────
  function procurar(chaves) {
    var itens = DADOS.itens || {};
    for (var i = 0; i < chaves.length; i++) {
      if (itens[chaves[i]]) return itens[chaves[i]];
    }
    return null;
  }

  function desenharTexto(destino, item) {
    destino.textContent = "";
    destino.appendChild(el("h3", null, item.titulo));
    var corpo = el("div", { "class": "corpo justificado" });
    (item.blocos || []).forEach(function (b) {
      corpo.appendChild(el(b[0] === "h" ? "h4" : "p", null, b[1]));
    });
    destino.appendChild(corpo);
    if (item.url) {
      var f = el("p", { "class": "fonte" });
      f.appendChild(document.createTextNode("Fonte: "));
      var a = el("a", { href: item.url, target: "_blank", rel: "noopener" }, "Rumo à Santidade");
      f.appendChild(a);
      destino.appendChild(f);
    }
  }

  function desenharAviso(destino, r) {
    destino.textContent = "";
    var box = el("div", { "class": "aviso" });
    box.appendChild(el("p", null, "O texto desta meditação ainda não foi incorporado a este site. No índice das Meditações de Santo Afonso, procure a meditação de:"));
    box.appendChild(el("p", { "class": "procure" }, "«" + r.diaDoTempo + "»"));
    if (r.festa) {
      box.appendChild(el("p", null, "ou, pela festa do dia:"));
      var d = dataDaFesta(r.festa.chaves);
      box.appendChild(el("p", { "class": "procure" }, "«" + r.festa.nome + "»" + (d ? " (" + d + ")" : "")));
    }
    var p = el("p");
    p.appendChild(el("a", { href: FONTE, target: "_blank", rel: "noopener" }, "Abrir o índice das meditações ↗"));
    box.appendChild(p);
    destino.appendChild(box);
  }

  function mostrarMeditacao(r) {
    var destino = $("meditacao-texto"), abas = $("abas");
    var daFesta = r.chavesFesta.length ? procurar(r.chavesFesta) : null;
    var doTempo = procurar(r.chavesTempo);
    abas.textContent = "";
    abas.hidden = true;

    if (!daFesta && !doTempo) { desenharAviso(destino, r); return; }
    if (!(daFesta && doTempo) || daFesta === doTempo) { desenharTexto(destino, daFesta || doTempo); return; }

    var opcoes = [["festa", "Da festa", daFesta], ["tempo", "Do Tempo", doTempo]];
    var escolhida = r.vencedorEhTempo ? "tempo" : "festa";
    function selecionar(id) {
      Array.prototype.forEach.call(abas.children, function (b) {
        b.setAttribute("aria-selected", String(b.getAttribute("data-aba") === id));
      });
      opcoes.forEach(function (o) { if (o[0] === id) desenharTexto(destino, o[2]); });
    }
    opcoes.forEach(function (o) {
      var b = el("button", { type: "button", role: "tab", "data-aba": o[0], "aria-controls": "meditacao-texto" }, o[1]);
      b.addEventListener("click", function () { selecionar(o[0]); });
      abas.appendChild(b);
    });
    abas.hidden = false;
    selecionar(escolhida);
  }

  // ───────── resolução do dia ─────────
  function mostrarProposito() {
    $("campo-proposito").value = ler("proposito:" + iso(atual));
  }

  // ───────── navegação ─────────
  function mostrar(o, gravarEndereco) {
    atual = o;
    var r = C.diaLiturgico(o.y, o.m, o.d);
    mostrarDia(r);
    mostrarMeditacao(r);
    mostrarProposito();

    var h = hoje(), ehHoje = iso(h) === iso(o);
    $("campo-data").value = iso(o);
    if (ehHoje) $("btn-hoje").setAttribute("aria-current", "date");
    else $("btn-hoje").removeAttribute("aria-current");

    if (gravarEndereco) {
      try { history.replaceState(null, "", ehHoje ? location.pathname + location.search : "#" + iso(o)); }
      catch (e) { /* endereço fixo no visualizador */ }
    }
  }

  function iniciar() {
    $("campo-data").min = ANO_MIN + "-01-01";
    $("campo-data").max = ANO_MAX + "-12-31";
    $("btn-anterior").addEventListener("click", function () { mostrar(somar(atual, -1), true); });
    $("btn-seguinte").addEventListener("click", function () { mostrar(somar(atual, 1), true); });
    $("btn-hoje").addEventListener("click", function () { mostrar(hoje(), true); });
    $("campo-data").addEventListener("change", function () {
      var o = deIso(this.value);
      if (o) mostrar(o, true);
    });
    var espera;
    $("campo-proposito").addEventListener("input", function () {
      var valor = this.value, chave = "proposito:" + iso(atual);
      clearTimeout(espera);
      espera = setTimeout(function () { guardar(chave, valor.trim() ? valor : ""); }, 300);
    });
    window.addEventListener("hashchange", function () {
      var o = deIso(location.hash.slice(1));
      if (o) mostrar(o, false);
    });
    mostrar(deIso(location.hash.slice(1)) || hoje(), false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
