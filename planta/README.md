# Planta Interativa — Diretiva Patrimonial

Planta baixa interativa dos ambientes, desenhada **em escala real** a partir dos croquis.
Abra `planta/index.html` direto no navegador (não precisa de servidor).

## Ambientes

| Aba | Ambiente | Mesas |
|---|---|---|
| 1 | Piso Superior — salão principal | 25 |
| 2 | Piso Inferior — Jurídico + Patrimonial | 9 (5 + 4) |
| 3 | Piso Inferior — Contabilidade | 13 |

Total: **47 estações**.

## Padrão adotado

- Mesa: **120 × 60 cm**
- Separador entre mesas de frente uma para a outra: **10 cm**
- Ilha 3+3 (piso superior): 360 × 130 cm
- Todas as coordenadas do código estão em **centímetros**, com origem no canto
  superior esquerdo da face interna das paredes.

## O que dá para fazer

- **Nomear mesas** — clique na mesa e preencha "Nome da mesa".
- **Setores editáveis** — o bloco "Setores" cria, renomeia, recolore e exclui.
  O número ao lado de cada um mostra quantas mesas e pessoas o usam; ao excluir,
  quem apontava para ele volta a ficar sem setor. Dá para criar um setor novo sem
  sair do painel da mesa, pela opção "＋ Criar setor…" do seletor.
- **Arrastar pessoas** — segure um nome na lista lateral e solte em cima da mesa.
  Arrastar de uma mesa para outra **troca** os dois ocupantes. Arrastar de volta
  para a lista "Sem mesa" libera a estação.
- **Editar pessoa** — clique no nome na lista (nome, cargo, setor e situação).
- **Situação** — Disponível · **Em ligação** (farol âmbar piscando) · Ausente.
- **Zoom e pan** — roda do mouse, botões +/− ou teclas `+`, `−`, `0`.
- **Imprimir / PDF** — o botão Imprimir esconde a interface e imprime só a planta.
- **Backup** — Exportar abre o conteúdo em texto para copiar; Importar aceita o
  texto colado. Fora de um iframe aparecem também os botões de baixar/abrir `.json`.

Tudo é salvo automaticamente no `localStorage` do navegador — ou seja, **por
aparelho**. O que se preenche no computador não aparece no celular; use
Exportar/Importar para levar de um para o outro.

## Por que não usamos confirm/alert/prompt

Quando a página roda dentro de um iframe com `sandbox` (visualizador de artifact,
embed), o navegador **bloqueia** `confirm()`, `alert()` e `prompt()`: eles voltam
sem perguntar nada, e qualquer `if (confirm(...))` vira um botão que não faz nada.
Downloads iniciados pela página (`<a download>`, inclusive com `blob:`) também são
ignorados. Por isso existe o `ui.dialogo.js` e o backup por copiar/colar.

## Estrutura dos arquivos

```
planta/
├── index.html            marcação da página
├── css/
│   ├── base.css          variáveis da marca, layout, botões
│   ├── planta.css        aparência do desenho (SVG) + regras de impressão
│   └── painel.css        barra lateral, chips e o "fantasma" do arrasto
└── js/
    ├── data.pisos.js     GEOMETRIA — é aqui que se mexe no layout
    ├── store.js          estado + persistência (localStorage)
    ├── render.plan.js    desenha o SVG
    ├── dragdrop.js       arrastar/soltar (mouse e toque) + pan/zoom
    ├── ui.dialogo.js     avisos, confirmações e formulários próprios
    ├── ui.setores.js     gerenciador de setores
    ├── ui.painel.js      barra lateral e detalhe da mesa
    └── app.js            abas de ambiente, barra de ferramentas, backup, init
```

## Como mexer no layout

Tudo fica em `js/data.pisos.js`. Para uma ilha de bancada use o helper `ilha()`:

```js
// prefixo, rótulo, números de cima, números de baixo, x inicial, y do topo
juntar(acc, ilha('S', 'Mesa', [4, 5, 6], [1, 2, 3], 400, 1025));
```

Ele já posiciona as duas fileiras, aplica o separador de 10 cm e vira as cadeiras
para o lado certo. Mesas soltas usam `mesaH()` (deitada) ou `mesaV()` (em pé).

Cada piso ainda aceita: `salas`, `armarios`, `pistas`, `paredes`, `portas`,
`janelas`, `escadas`, `zonas` e `cotasDetalhe`.

## Observações sobre a leitura dos croquis

- Os três croquis foram desenhados com a folha girada; as plantas aqui já estão
  na orientação de leitura (numeração na posição correta).
- Os dois ambientes do piso inferior foram desenhados em folhas separadas, sem
  indicação de como se conectam — por isso estão em abas separadas, e não numa
  planta única.
- As dimensões gerais das salas foram estimadas a partir do módulo das mesas
  (120 cm), já que os croquis não trazem cotas.
