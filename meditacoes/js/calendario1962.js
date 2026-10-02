/*
 * Calendário Romano de 1962 (Código de Rubricas de 1960).
 *
 * Calcula, para uma data civil, o dia litúrgico: o Próprio do Tempo,
 * a festa do santoral, a celebração vencedora segundo a tabela de
 * precedência, as comemorações e as festas de I classe transferidas.
 *
 * Datas internas são "números de dia" (dias desde 1970-01-01, UTC),
 * para que horário de verão e fusos não interfiram nas contas.
 */
(function (root) {
  "use strict";

  var SANTORAL = (typeof module !== "undefined" && module.exports)
    ? require("./santoral.js")
    : root.SANTORAL_1962;

  var DIA_MS = 86400000;
  var DIAS_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
    "Quinta-feira", "Sexta-feira", "Sábado"];
  var MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
    "agosto", "setembro", "outubro", "novembro", "dezembro"];
  var CORES = {
    w: "Branco", r: "Vermelho", v: "Roxo", g: "Verde", p: "Rosáceo", b: "Preto"
  };

  // Ordem de precedência (menor vence). Segue a tabela das rubricas de 1960,
  // reduzida aos degraus que de fato se encontram no calendário universal.
  var R = {
    MAXIMO: 1,        // Natal, Páscoa, Tríduo Sacro, Pentecostes
    IMACULADA: 1.5,   // prevalece sobre o domingo do Advento
    PRIVILEGIADO: 2,  // domingos de I classe, Cinzas, Semana Santa, oitavas de Páscoa e Pentecostes, vigílias de Natal e Pentecostes
    SENHOR_I: 3,      // festas móveis do Senhor de I classe
    SENHOR_I_FIXA: 3.5,
    FESTA_I: 4,
    SENHOR_II: 5,     // festas do Senhor de II classe vencem o domingo de II classe
    DOMINGO_II: 6,
    FESTA_II: 7,
    FERIA_II: 8,      // férias maiores do Advento, Têmporas, dias da oitava do Natal, vigílias de II classe
    FERIA_QUARESMA: 9,
    FESTA_III: 10,
    FERIA_ADVENTO: 11,
    FERIA_IV: 12,
    COMEMORACAO: 99
  };

  function classeDoRank(r) {
    if (r <= 4) return 1;
    if (r <= 8) return 2;
    if (r <= 11) return 3;
    if (r <= 12) return 4;
    return 0;
  }

  // ───────────── utilidades de data ─────────────
  function dn(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / DIA_MS); }
  function deDn(n) {
    var d = new Date(n * DIA_MS);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), dow: d.getUTCDay() };
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function mmdd(m, d) { return pad(m) + "-" + pad(d); }
  function romano(n) {
    var v = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]], s = "";
    v.forEach(function (p) { while (n >= p[0]) { s += p[1]; n -= p[0]; } });
    return s;
  }
  function bissexto(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }

  // Computo gregoriano (algoritmo de Meeus/Jones/Butcher).
  function pascoa(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
      f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return dn(y, mes, dia);
  }

  // Primeiro domingo do Advento: o quarto domingo antes do Natal.
  function advento(y) {
    var natal = dn(y, 12, 25), dow = deDn(natal).dow;
    return natal - (dow === 0 ? 7 : dow) - 21;
  }

  var cacheAno = {};
  function marcos(y) {
    if (cacheAno[y]) return cacheAno[y];
    var P = pascoa(y);
    var ep = dn(y, 1, 6), depEp = deDn(ep).dow;
    var sagradaFamilia = ep + (7 - depEp);           // domingo de 7 a 13 de janeiro
    var nomeJesus = null;
    for (var x = dn(y, 1, 2); x <= dn(y, 1, 5); x++) if (deDn(x).dow === 0) nomeJesus = x;
    if (nomeJesus === null) nomeJesus = dn(y, 1, 2);
    var set1 = dn(y, 9, 1), dSet = deDn(set1).dow;
    var primeiroDomSet = set1 + ((7 - dSet) % 7);
    var terceiroDomSet = primeiroDomSet + 14;
    var out31 = dn(y, 10, 31);
    var cristoRei = out31 - deDn(out31).dow;
    var adv = advento(y);
    var domOitavaNatal = null;
    for (var z = dn(y, 12, 26); z <= dn(y, 12, 31); z++) if (deDn(z).dow === 0) domOitavaNatal = z;
    if (domOitavaNatal === null) domOitavaNatal = dn(y, 12, 30);
    var trindade = P + 56;
    var m = {
      P: P, septuagesima: P - 63, cinzas: P - 46, quaresma1: P - 42, paixao: P - 14,
      ramos: P - 7, ascensao: P + 39, pentecostes: P + 49, trindade: trindade,
      corpus: P + 60, sagradoCoracao: P + 68, sagradaFamilia: sagradaFamilia,
      nomeJesus: nomeJesus, temporasSet: terceiroDomSet + 3, cristoRei: cristoRei,
      advento: adv, domOitavaNatal: domOitavaNatal,
      totalDomPent: (adv - trindade) / 7
    };
    cacheAno[y] = m;
    return m;
  }

  // ───────────── Próprio do Tempo ─────────────
  function T(o) {
    o.origem = "tempo";
    o.cor = o.cor || "g";
    o.chaves = o.chaves || [];
    return o;
  }

  function semanaDe(n, base) { return Math.floor((n - base) / 7) + 1; }

  function temporal(n) {
    var c = deDn(n), y = c.y, dow = c.dow, M = marcos(y), dia = DIAS_SEMANA[dow];
    var domingo = dow === 0;
    var data = mmdd(c.m, c.d);
    var w;

    // ── Natal (25 a 31 de dezembro) e Advento ──
    if (n >= M.advento) {
      if (c.m === 12 && c.d === 25) return T({ nome: "Natividade de Nosso Senhor Jesus Cristo", rank: R.MAXIMO, cor: "w", tempo: "Tempo do Natal", chaves: ["D-12-25"], semCom: true });
      if (c.m === 12 && c.d > 25) {
        if (n === M.domOitavaNatal) return T({ nome: "Domingo dentro da Oitava do Natal", rank: R.DOMINGO_II, cor: "w", tempo: "Tempo do Natal", domingo: true, chaves: ["NAT-DOM", "D-" + data] });
        var ord = ["", "", "", "", "", "V", "VI", "VII"][c.d - 24];
        return T({
          nome: (c.d <= 28 ? "Dia " + c.d + " de dezembro" : ord + " dia") + " dentro da Oitava do Natal",
          rank: R.FERIA_II, cor: "w", tempo: "Tempo do Natal", chaves: ["D-" + data],
          naoComemorar: c.d <= 28
        });
      }
      if (c.m === 12 && c.d === 24) {
        var t24 = T({ nome: "Vigília do Natal", rank: R.PRIVILEGIADO, cor: "v", tempo: "Tempo do Advento", chaves: ["D-12-24"], semCom: true });
        if (domingo) t24.comemoracoesTempo = ["IV Domingo do Advento"];
        return t24;
      }
      w = semanaDe(n, M.advento);
      var tAdv = { tempo: "Tempo do Advento", cor: "v", semana: w, chaves: ["ADV-" + w + "-" + dow] };
      if (domingo) {
        tAdv.nome = romano(w) + " Domingo do Advento" + (w === 3 ? " (Gaudete)" : "");
        tAdv.rank = R.PRIVILEGIADO; tAdv.domingo = true;
        if (w === 3) tAdv.cor = "p";
        return T(tAdv);
      }
      if (w === 3 && (dow === 3 || dow === 5 || dow === 6)) {
        tAdv.nome = dia + " das Têmporas do Advento";
        tAdv.rank = R.FERIA_II;
        tAdv.chaves.push("TEMP-ADV-" + dow);
      } else {
        tAdv.nome = dia + " da " + romano(w) + " semana do Advento";
        tAdv.rank = (c.m === 12 && c.d >= 17) ? R.FERIA_II : R.FERIA_ADVENTO;
      }
      if (c.m === 12 && c.d >= 17) {
        tAdv.nota = "Féria maior privilegiada (17 a 23 de dezembro)";
        tAdv.chaves.push("D-" + data);
      }
      return T(tAdv);
    }

    // ── Tempo do Natal e da Epifania (1 a 13 de janeiro) ──
    if (c.m === 1 && c.d <= 13) {
      var tNat = { tempo: c.d <= 5 ? "Tempo do Natal" : "Tempo da Epifania", cor: "w", chaves: ["D-" + data] };
      if (c.d === 1) return T(Object.assign(tNat, { nome: "Oitava do Natal", rank: R.SENHOR_I, semCom: true }));
      if (c.d === 6) return T(Object.assign(tNat, { nome: "Epifania de Nosso Senhor Jesus Cristo", rank: R.SENHOR_I, semCom: true }));
      if (n === M.nomeJesus) return T(Object.assign(tNat, { nome: "Santíssimo Nome de Jesus", rank: R.SENHOR_II, domingo: domingo, chaves: ["F-NOME-JESUS", "D-" + data] }));
      if (n === M.sagradaFamilia) return T(Object.assign(tNat, { nome: "Sagrada Família de Jesus, Maria e José", rank: R.SENHOR_II, domingo: true, chaves: ["F-SAGRADA-FAMILIA", "EPI-1-0"] }));
      if (c.d === 13) return T(Object.assign(tNat, { nome: "Comemoração do Batismo de Nosso Senhor Jesus Cristo", rank: R.SENHOR_II, chaves: ["F-BATISMO", "D-01-13"] }));
      if (c.d <= 5) return T(Object.assign(tNat, { nome: dia + " do Tempo do Natal", rank: R.FERIA_IV }));
      tNat.nome = dia + " depois da Epifania";
      tNat.rank = R.FERIA_IV;
      if (n > M.sagradaFamilia) tNat.chaves.push("EPI-1-" + dow);
      return T(tNat);
    }

    // ── Depois da Epifania, até a Septuagésima ──
    if (n < M.septuagesima) {
      w = semanaDe(n, M.sagradaFamilia);
      var tEp = { tempo: "Tempo depois da Epifania", cor: "g", semana: w, chaves: ["EPI-" + w + "-" + dow] };
      if (domingo) {
        tEp.nome = romano(w) + " Domingo depois da Epifania";
        tEp.rank = R.DOMINGO_II; tEp.domingo = true;
      } else {
        tEp.nome = dia + " da " + romano(w) + " semana depois da Epifania";
        tEp.rank = R.FERIA_IV;
      }
      return T(tEp);
    }

    // ── Septuagésima, Sexagésima, Qüinquagésima ──
    if (n < M.cinzas) {
      w = semanaDe(n, M.septuagesima);
      var nomesSept = ["Septuagésima", "Sexagésima", "Qüinquagésima"];
      var codSept = ["SEPT", "SEXA", "QUINQ"];
      var tS = { tempo: "Tempo da Septuagésima", cor: "v", semana: w, chaves: [codSept[w - 1] + "-" + dow] };
      if (domingo) {
        tS.nome = "Domingo da " + nomesSept[w - 1];
        tS.rank = R.DOMINGO_II; tS.domingo = true;
      } else {
        tS.nome = dia + " da semana da " + nomesSept[w - 1];
        tS.rank = R.FERIA_IV;
      }
      return T(tS);
    }

    // ── Quaresma ──
    if (n < M.paixao) {
      var tQ = { tempo: "Tempo da Quaresma", cor: "v" };
      if (n < M.quaresma1) {
        if (n === M.cinzas) return T(Object.assign(tQ, { nome: "Quarta-feira de Cinzas", rank: R.PRIVILEGIADO, chaves: ["QUAD-0-3"] }));
        return T(Object.assign(tQ, { nome: dia + " depois das Cinzas", rank: R.FERIA_QUARESMA, chaves: ["QUAD-0-" + dow] }));
      }
      w = semanaDe(n, M.quaresma1);
      tQ.semana = w;
      tQ.chaves = ["QUAD-" + w + "-" + dow];
      if (domingo) {
        tQ.nome = romano(w) + " Domingo da Quaresma" + (w === 4 ? " (Laetare)" : "");
        tQ.rank = R.PRIVILEGIADO; tQ.domingo = true;
        if (w === 4) tQ.cor = "p";
      } else if (w === 1 && (dow === 3 || dow === 5 || dow === 6)) {
        tQ.nome = dia + " das Têmporas da Quaresma";
        tQ.rank = R.FERIA_II;
      } else {
        tQ.nome = dia + " da " + romano(w) + " semana da Quaresma";
        tQ.rank = R.FERIA_QUARESMA;
      }
      return T(tQ);
    }

    // ── Tempo da Paixão e Semana Santa ──
    if (n < M.P) {
      var tP = { tempo: "Tempo da Paixão", cor: "v" };
      if (n < M.ramos) {
        tP.chaves = ["PASS-1-" + dow];
        if (domingo) return T(Object.assign(tP, { nome: "I Domingo da Paixão", rank: R.PRIVILEGIADO, domingo: true }));
        tP.nome = dia + " da semana da Paixão";
        tP.rank = R.FERIA_QUARESMA;
        if (dow === 5) tP.comemoracoesTempo = ["Sete Dores da Bem-aventurada Virgem Maria"];
        return T(tP);
      }
      tP.chaves = ["PASS-2-" + dow];
      tP.semCom = true;
      var santa = ["II Domingo da Paixão ou de Ramos", "Segunda-feira Santa", "Terça-feira Santa",
        "Quarta-feira Santa", "Quinta-feira Santa, Ceia do Senhor",
        "Sexta-feira Santa, Paixão e Morte do Senhor", "Sábado Santo"];
      tP.nome = santa[dow];
      tP.domingo = domingo;
      tP.rank = dow >= 4 ? R.MAXIMO : R.PRIVILEGIADO;
      if (dow === 4) tP.cor = "w";
      if (dow === 5) tP.cor = "b";
      return T(tP);
    }

    // ── Tempo Pascal ──
    if (n < M.trindade) {
      w = semanaDe(n, M.P);
      var tPa = { tempo: "Tempo Pascal", cor: "w", semana: w, chaves: ["PASC-" + w + "-" + dow] };
      if (w === 1) {
        tPa.nome = domingo ? "Domingo da Ressurreição de Nosso Senhor Jesus Cristo" : dia + " da Oitava da Páscoa";
        tPa.rank = domingo ? R.MAXIMO : R.PRIVILEGIADO;
        tPa.semCom = true; tPa.domingo = domingo;
        return T(tPa);
      }
      if (w === 2 && domingo) return T(Object.assign(tPa, { nome: "Domingo in Albis (Oitava da Páscoa)", rank: R.PRIVILEGIADO, domingo: true }));
      if (n === M.ascensao) return T(Object.assign(tPa, { nome: "Ascensão de Nosso Senhor Jesus Cristo", rank: R.SENHOR_I, semCom: true }));
      if (n === M.ascensao - 1) return T(Object.assign(tPa, { nome: "Vigília da Ascensão", rank: R.FERIA_II, nota: "Terceiro dia das Rogações" }));
      if (n === M.pentecostes - 1) return T(Object.assign(tPa, { nome: "Vigília de Pentecostes", rank: R.PRIVILEGIADO, cor: "r", semCom: true }));
      if (n === M.pentecostes) return T(Object.assign(tPa, { nome: "Domingo de Pentecostes", rank: R.MAXIMO, cor: "r", domingo: true, semCom: true }));
      if (n > M.pentecostes) {
        var temp = (dow === 3 || dow === 5 || dow === 6) ? " (Têmporas de Pentecostes)" : "";
        return T(Object.assign(tPa, { nome: dia + " da Oitava de Pentecostes" + temp, rank: R.PRIVILEGIADO, cor: "r", semCom: true }));
      }
      if (domingo) {
        tPa.nome = w === 7 ? "Domingo depois da Ascensão" : romano(w - 1) + " Domingo depois da Páscoa";
        tPa.rank = R.DOMINGO_II; tPa.domingo = true;
        return T(tPa);
      }
      tPa.rank = R.FERIA_IV;
      if (w === 2) tPa.nome = dia + " depois do Domingo in Albis";
      else if (n > M.ascensao) tPa.nome = dia + " depois da Ascensão";
      else tPa.nome = dia + " da " + romano(w - 1) + " semana depois da Páscoa";
      if (n === M.ascensao - 3 || n === M.ascensao - 2) tPa.nota = "Rogações (Ladainhas Menores)";
      return T(tPa);
    }

    // ── Depois de Pentecostes ──
    w = semanaDe(n, M.trindade);
    var tot = M.totalDomPent;
    var tPe = { tempo: "Tempo depois de Pentecostes", cor: "g", semana: w, chaves: ["PENT-" + w + "-" + dow] };
    if (n === M.trindade) return T(Object.assign(tPe, { nome: "Santíssima Trindade", rank: R.SENHOR_I, cor: "w", domingo: true, nota: "I Domingo depois de Pentecostes", chaves: ["F-TRINDADE", "PENT-1-0"] }));
    if (n === M.corpus) return T(Object.assign(tPe, { nome: "Santíssimo Corpo de Nosso Senhor Jesus Cristo (Corpus Christi)", rank: R.SENHOR_I, cor: "w", chaves: ["F-CORPUS-CHRISTI", "PENT-1-4"] }));
    if (n === M.sagradoCoracao) return T(Object.assign(tPe, { nome: "Sacratíssimo Coração de Jesus", rank: R.SENHOR_I, cor: "w", chaves: ["F-SAGRADO-CORACAO", "PENT-2-5"] }));
    if (n === M.cristoRei) {
      var cr = T(Object.assign(tPe, { nome: "Nosso Senhor Jesus Cristo Rei", rank: R.SENHOR_I, cor: "w", domingo: true, chaves: ["F-CRISTO-REI", "PENT-" + w + "-0"] }));
      cr.comemoracoesTempo = [rotuloDomPent(w, tot)];
      return cr;
    }
    var ultimo = w === tot, retomado = !ultimo && w >= 24;
    if (ultimo) tPe.chaves.push("PENT-24-" + dow, "PENT-ULT-" + dow);
    if (retomado) tPe.chaves.push("EPI-" + (6 - (tot - 1 - w)) + "-" + dow);
    if (domingo) {
      tPe.nome = rotuloDomPent(w, tot);
      tPe.rank = R.DOMINGO_II; tPe.domingo = true;
      if (retomado) tPe.nota = "Missa do " + romano(6 - (tot - 1 - w)) + " Domingo depois da Epifania";
      if (ultimo && w !== 24) tPe.nota = "Missa do XXIV Domingo depois de Pentecostes";
      return T(tPe);
    }
    if (n >= M.temporasSet && n <= M.temporasSet + 3 && (dow === 3 || dow === 5 || dow === 6)) {
      tPe.nome = dia + " das Têmporas de Setembro";
      tPe.rank = R.FERIA_II; tPe.cor = "v";
      tPe.chaves.push("TEMP-SET-" + dow);
      return T(tPe);
    }
    tPe.nome = dia + " da " + (ultimo ? "última" : romano(w)) + " semana depois de Pentecostes";
    tPe.rank = R.FERIA_IV;
    return T(tPe);
  }

  function rotuloDomPent(w, tot) {
    return w === tot ? "Último Domingo depois de Pentecostes" : romano(w) + " Domingo depois de Pentecostes";
  }

  // ───────────── Santoral ─────────────
  function entradaParaCelebracao(e, chave, dataOriginal) {
    var classe = e[0], marca = e[3] || "", r;
    if (marca === "IC") r = R.IMACULADA;
    else if (classe === 1) r = marca === "L" ? R.SENHOR_I_FIXA : R.FESTA_I;
    else if (classe === 2) r = marca === "L" ? R.SENHOR_II : (marca === "V" ? R.FERIA_II : R.FESTA_II);
    else if (classe === 3) r = R.FESTA_III;
    else r = R.COMEMORACAO;
    return {
      origem: "santo", nome: e[2], cor: e[1], rank: r, classeOriginal: classe,
      vigilia: marca === "V", chaves: ["S-" + chave], dataOriginal: dataOriginal
    };
  }

  // Devolve as entradas do santoral que caem na data civil n.
  function santoral(n) {
    var c = deDn(n), lista = [];
    function add(chave) {
      (SANTORAL[chave] || []).forEach(function (e) {
        if (e[3] === "AD") return; // tratado à parte
        lista.push(entradaParaCelebracao(e, chave, chave));
      });
    }
    // Ano bissexto: de 24 de fevereiro em diante as festas correm um dia.
    if (c.m === 2 && bissexto(c.y) && c.d >= 24) {
      if (c.d >= 25) add(mmdd(2, c.d - 1));
    } else {
      add(mmdd(c.m, c.d));
    }
    // Fiéis Defuntos: 2 de novembro, ou 3 se o dia 2 for domingo.
    var fd = dn(c.y, 11, 2), fdDom = deDn(fd).dow === 0;
    if ((n === fd && !fdDom) || (n === fd + 1 && fdDom)) {
      lista.unshift(entradaParaCelebracao(SANTORAL["11-02"][0], "11-02", "11-02"));
      lista[0].rank = R.FESTA_I;
    }
    // Vigílias que caem em domingo são omitidas.
    if (c.dow === 0) lista = lista.filter(function (e) { return !e.vigilia; });
    return lista;
  }

  // ───────────── Precedência ─────────────
  var cacheCal = {};

  function calcularAno(y) {
    if (cacheCal[y]) return cacheCal[y];
    var res = {}, pendentes = [];
    for (var n = dn(y, 1, 1); n <= dn(y, 12, 31); n++) {
      var t = temporal(n);
      var s = santoral(n);
      var cands = [t].concat(s);
      // Festa transferida concorre depois das do próprio dia, em empate.
      if (pendentes.length) {
        var p = Object.assign({}, pendentes[0], { transferida: true });
        cands.push(p);
      }
      var ordenados = cands.slice().sort(function (a, b) {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return (a.transferida ? 1 : 0) - (b.transferida ? 1 : 0);
      });
      var vencedor = ordenados[0];
      if (vencedor.transferida) pendentes.shift();

      var comemoracoes = [];
      var omitidas = [];
      ordenados.slice(1).forEach(function (x) {
        if (x.transferida) return;
        if (x.origem === "santo" && x.classeOriginal === 1) {
          pendentes.push(x);
          pendentes.sort(ordemTransferencia);
          omitidas.push({ nome: x.nome, motivo: "transferida" });
          return;
        }
        if (admiteComemoracao(vencedor, x, t)) comemoracoes.push(x.nome);
      });
      (t.comemoracoesTempo || []).forEach(function (nome) {
        if (vencedor === t || vencedor.rank > R.PRIVILEGIADO || t.domingo) comemoracoes.push(nome);
      });

      res[n] = montar(n, vencedor, t, s, comemoracoes, omitidas);
    }
    cacheCal[y] = res;
    return res;
  }

  // Entre festas transferidas, a de maior dignidade passa à frente:
  // as do Senhor, depois as de Nossa Senhora, depois as demais.
  function ordemTransferencia(a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return (mariana(a) ? 0 : 1) - (mariana(b) ? 0 : 1);
  }
  function mariana(f) {
    return /Virgem Maria/.test(f.nome) && !/^S\. José/.test(f.nome);
  }

  function admiteComemoracao(vencedor, x, t) {
    if (t.semCom || vencedor.semCom) return false;
    if (x.origem === "tempo") {
      // Férias de IV classe não se comemoram; as demais (Advento, Quaresma,
      // Têmporas, vigílias, domingos) sim.
      return !x.naoComemorar && x.rank < R.FERIA_IV;
    }
    if (x.vigilia) return vencedor.rank > R.FESTA_I;
    var diaDomingo = t.domingo;
    if (diaDomingo) return x.classeOriginal === 2;
    if (x.classeOriginal === 3 || x.classeOriginal === 0) return vencedor.rank > R.FESTA_I;
    return true;
  }

  function montar(n, v, t, s, comemoracoes, omitidas) {
    var c = deDn(n);
    var cor = v.cor;
    var classe = classeDoRank(v.rank === R.IMACULADA ? R.FESTA_I : v.rank);
    var tipo;
    if (v.origem === "tempo") {
      if (/^(Santíssim|Sacratíssim|Sagrada|Nosso Senhor|Epifania|Ascensão|Natividade|Oitava do Natal|Comemoração do Batismo)/.test(v.nome)) tipo = "Festa";
      else if (t.domingo) tipo = "Domingo";
      else if (/Vigília/.test(v.nome)) tipo = "Vigília";
      else tipo = "Féria";
    } else {
      tipo = v.vigilia ? "Vigília" : (v.classeOriginal === 0 ? "Comemoração" : "Festa");
    }
    var sabadoMariano = c.dow === 6 && v.rank === R.FERIA_IV && !t.nota &&
      ["Tempo do Natal", "Tempo da Quaresma", "Tempo da Paixão"].indexOf(t.tempo) < 0;
    var chaves = v.chaves.slice();
    if (v !== t) chaves = chaves.concat(t.chaves);
    return {
      data: { ano: c.y, mes: c.m, dia: c.d, diaSemana: c.dow },
      dataExtenso: DIAS_SEMANA[c.dow] + ", " + c.d + " de " + MESES[c.m - 1] + " de " + c.y,
      celebracao: v.nome + (v.transferida ? " (transferida)" : ""),
      tipo: tipo,
      classe: classe,
      classeTexto: classe ? romano(classe) + " classe" : "Comemoração",
      cor: cor,
      corNome: CORES[cor],
      tempo: t.tempo,
      diaDoTempo: t.nome,
      notaTempo: t.nota || v.nota || null,
      vencedorEhTempo: v === t,
      festa: v.origem === "santo" ? { nome: v.nome, chaves: v.chaves } : null,
      comemoracoes: comemoracoes,
      omitidas: omitidas,
      sabadoMariano: sabadoMariano,
      chaves: chaves,
      chavesTempo: t.chaves,
      chavesFesta: v.origem === "santo" ? v.chaves : (v !== t ? v.chaves : [])
    };
  }

  function diaLiturgico(ano, mes, dia) {
    var n = dn(ano, mes, dia);
    return calcularAno(ano)[n];
  }

  var api = {
    diaLiturgico: diaLiturgico,
    pascoa: function (y) { var c = deDn(pascoa(y)); return { ano: c.y, mes: c.m, dia: c.d }; },
    MESES: MESES,
    DIAS_SEMANA: DIAS_SEMANA
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Calendario1962 = api;
})(this);
