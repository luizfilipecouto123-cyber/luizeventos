# Meditações de Santo Afonso: o dia litúrgico de 1962

Site estático que:

1. calcula o dia litúrgico de hoje (ou de qualquer data) segundo o **Calendário Romano de 1962** (rubricas de 1960, calendário universal);
2. mostra a **preparação** da oração mental pelo método de Santo Afonso Maria de Ligório;
3. mostra a **meditação do dia**, tirada das [Meditações de Santo Afonso do Rumo à Santidade](https://rumoasantidade.com.br/meditacoes-santo-afonso/);
4. termina com os **afetos, súplicas e resoluções** e a **conclusão** do método.

Não precisa de servidor nem de compilação: basta abrir `index.html` no navegador. Para publicar no GitHub Pages, ative o Pages no repositório e acesse `/meditacoes/`.

## Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | A página: preparação, meditação, afetos e conclusão |
| `css/estilo.css` | Estilo de missal, com tema claro e escuro |
| `js/santoral.js` | Santoral de 1962: festas fixas, classes, cores e comemorações |
| `js/calendario1962.js` | Cálculo do Próprio do Tempo, precedência, comemorações e transferências |
| `js/app.js` | Liga o calendário à página e escolhe a meditação |
| `data/meditacoes.js` | Textos das meditações, indexados pela chave do dia |
| `tools/importar.mjs` | Importa as meditações do Rumo à Santidade para `data/meditacoes.js` |
| `tools/gerar-pagina-unica.mjs` | Gera `dist/meditacoes.html`, a página inteira num só arquivo |

## O calendário

O cálculo cobre:

- a Páscoa (cômputo gregoriano) e todo o ciclo móvel: Advento, Natal, Epifania, Septuagésima, Quaresma, Paixão, Tempo Pascal e o Tempo depois de Pentecostes;
- as Têmporas (Advento, Quaresma, Pentecostes e setembro, depois do 3.º domingo do mês, como em 1960);
- os domingos depois da Epifania retomados no fim do Tempo depois de Pentecostes, e o último domingo antes do Advento;
- as festas móveis: Santíssimo Nome de Jesus, Sagrada Família, Batismo do Senhor, Santíssima Trindade, Corpus Christi, Sagrado Coração e Cristo Rei;
- a tabela de precedência: domingos de I e II classe, festas do Senhor sobre domingos de II classe, a Imaculada Conceição sobre o domingo do Advento, férias da Quaresma sobre festas de III classe, e assim por diante;
- a transferência das festas de I classe impedidas (por exemplo, São José ou a Anunciação na Semana Santa), Fiéis Defuntos em 3 de novembro quando o dia 2 cai em domingo, vigílias omitidas aos domingos e o deslocamento das festas no ano bissexto (S. Matias a 25 de fevereiro).

Só o calendário universal está incluído; festas próprias de dioceses, países ou ordens religiosas não estão.

Para testar no terminal:

```sh
node -e 'const C=require("./js/calendario1962.js"); console.log(C.diaLiturgico(2026,10,2))'
```

## Chaves das meditações

Cada meditação em `data/meditacoes.js` é guardada sob uma chave do dia litúrgico. O site procura primeiro a meditação da festa e depois a do Tempo; quando há as duas, mostra uma aba para cada.

| Chave | Dia |
| --- | --- |
| `ADV-1-0` … `ADV-4-6` | Advento: semana e dia da semana (0 = domingo … 6 = sábado) |
| `D-12-25`, `D-01-01` … | Dias de data fixa do Natal e da Epifania (17 de dezembro a 13 de janeiro) |
| `EPI-2-0` … | Semana e dia depois da Epifania |
| `SEPT-0`, `SEXA-3`, `QUINQ-6` | Semanas da Septuagésima, Sexagésima e Qüinquagésima |
| `QUAD-0-3` … `QUAD-4-6` | Cinzas (semana 0) e semanas da Quaresma |
| `PASS-1-*`, `PASS-2-*` | Semana da Paixão e Semana Santa |
| `PASC-1-0` … `PASC-8-6` | Semanas desde a Páscoa (1 = oitava, 2 = in Albis, 8 = Pentecostes) |
| `PENT-1-0` … `PENT-28-6` | Semanas depois de Pentecostes (1 = Santíssima Trindade) |
| `PENT-24-*`, `PENT-ULT-*` | Também valem para a última semana antes do Advento |
| `S-10-02` … | Festas do santoral, pela data própria (mês-dia) |
| `F-TRINDADE`, `F-CORPUS-CHRISTI`, `F-SAGRADO-CORACAO`, `F-CRISTO-REI`, `F-SAGRADA-FAMILIA`, `F-NOME-JESUS`, `F-BATISMO` | Festas móveis |

## Importar os textos

```sh
node tools/importar.mjs
```

O importador baixa o índice e cada meditação, identifica o dia pelo título e grava `data/meditacoes.js`. O que não conseguir identificar vai para `data/relatorio-importacao.txt`; esses casos se corrigem no objeto `AJUSTES`, no início do script, ligando a URL da meditação à sua chave.
