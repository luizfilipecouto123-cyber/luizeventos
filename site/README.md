# Site da Luiz Eventos

Página única (HTML, CSS e JavaScript sem dependências) com:

- **Abertura** com um varal de lâmpadas animado em canvas (fica parado para quem
  ativou "reduzir movimento" no sistema).
- **Eventos**: casamentos, 15 anos, aniversários, formaturas, corporativos, chás e batizados.
- **Serviços**: os 8 serviços oferecidos.
- **Como funciona**: as 5 etapas, da conversa à desmontagem.
- **Roteiro**: exemplos de cronograma hora a hora para casamento, 15 anos e evento corporativo.
- **Calculadora de festa**: estima salgados, doces, bolo, bebidas, gelo, garçons e mesas
  a partir do número de convidados, da duração e do tipo de cardápio.
- **Pedido de orçamento**: o visitante preenche o formulário e a página monta uma
  mensagem pronta para enviar pelo WhatsApp (ou copiar). Nenhum dado sai da página
  sozinho; o rascunho fica salvo só no navegador do visitante.
- **Perguntas frequentes** e rodapé com contatos.

## Arquivos

| Arquivo | O que é |
| --- | --- |
| `pagina.html` | A fonte. É o arquivo publicado como Artifact no claude.ai. **Edite este.** |
| `build.py` | Gera `index.html` a partir de `pagina.html`. |
| `index.html` | Documento HTML completo, pronto para hospedar (GitHub Pages, Netlify, qualquer servidor). Gerado: não edite à mão. |

Depois de editar `pagina.html`, rode:

```sh
python3 site/build.py
```

## Antes de colocar no ar

1. **Contatos.** No começo do `<script>` de `pagina.html` há um objeto `CONTATO`:

   ```js
   var CONTATO = {
     whatsapp: "",   // só números, com 55 + DDD. Ex.: "5511999998888"
     telefone: "",
     email: "",
     instagram: "",  // com ou sem @
     regiao: ""      // ex.: "Campinas e região"
   };
   ```

   Com `whatsapp` preenchido, o pedido de orçamento ganha o botão **Abrir no WhatsApp**,
   que abre a conversa com a mensagem já escrita. Itens vazios ficam escondidos.

2. **Textos.** Os textos de serviços, etapas, roteiros e perguntas frequentes são um
   rascunho: confira se descrevem o que a Luiz Eventos realmente oferece e ajuste o que
   for preciso. A página não tem depoimentos, números de eventos realizados nem preços,
   para não publicar nada que não seja verdade; se quiser incluir, use dados reais.

3. **Fotos.** Não há fotos de eventos. Se houver fotos reais com autorização dos
   clientes, uma galeria pode entrar entre "Serviços" e "Como funciona".

## Regras da calculadora

Valores-base para uma festa de 4 horas; cada hora a mais ou a menos muda salgados,
bebidas e gelo em cerca de 10% (fator `0,6 + 0,1 × horas`, entre 2 e 10 horas).

| Item | Regra |
| --- | --- |
| Salgados | 15 por adulto (só coquetel) ou 8 (com refeição); criança conta metade; arredondado para o cento |
| Doces | 4 por convidado, arredondado para o cento |
| Bolo | 100 g por convidado |
| Refrigerante e suco | 800 ml por adulto que não bebe álcool, 400 ml por adulto que bebe, 600 ml por criança |
| Água | 500 ml por convidado |
| Cerveja | 1,5 L por adulto que bebe |
| Gelo | 500 g por convidado, em sacos de 5 kg |
| Garçons | 1 para cada 25 convidados (coquetel) ou 15 (refeição servida) |
| Mesas de 8 lugares | assento para 60% dos convidados (coquetel) ou para todos (refeição) |

As regras ficam na função `calcular()` e na lista "Como a conta é feita" da página;
se mudar uma, mude a outra.
