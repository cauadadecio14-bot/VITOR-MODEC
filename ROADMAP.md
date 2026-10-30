# Roadmap — Consulta de Materiais Marinha (MODEC)

Objetivo: o time de Marinha a bordo abre **um link**, filtra por **nome** ou **código** e vê apenas **PR, PO, Quantidade e Status**. A planilha *Follow up* é atualizada regularmente por você.

## Como o Power BI inspirou o desenho
| Conceito no Power BI | Equivalente aqui |
|---|---|
| Fonte de dados (Excel) | Planilha *Follow up* (aba **Marinha**) |
| Power Query (limpeza) | `normalizar.js`: remove espaços invisíveis, padroniza status (Complet → Concluído etc.), ignora linhas vazias |
| Segmentação (slicer) de Nome / Código | Seletor **Nome do material | Código** com busca e lista suspensa |
| Visual de tabela | Tabela PR · PO · Quantidade · Status (vira cartões no celular) |
| Atualizar / Publicar | `admin.html` → `data.js` → link público |

## Fases

### Fase 1 — Núcleo (✅ entregue)
- [x] Estudo da planilha e regras de limpeza de dados
- [x] Filtro por nome e por código (autocompletar, teclado e toque)
- [x] Resultado só com PR, PO, Quantidade e Status (badges coloridos)
- [x] Identidade visual MODEC: azul escuro, branco e vermelho; logo no topo
- [x] Layout responsivo (celular a bordo)

### Fase 2 — Importação da planilha (✅ entregue)
- [x] `admin.html`: selecionar o .xlsx, ver resumo por status e avisos de dados
- [x] Gerar `data.js` (dados do link oficial) e **HTML único** offline para e-mail/WhatsApp
- [x] Alternativa por terminal: `node gerar-dados.js planilha.xlsx`

### Fase 3 — Publicação do link (a fazer, ~15 min)
- [ ] Colocar o logo oficial em `assets/logo-modec.png` (PNG branco/transparente, ~40 px de altura)
- [ ] Ativar GitHub Pages no repositório → link `…/modec-materiais/`
- [ ] Rotina: importar planilha em `admin.html` → substituir `data.js` no GitHub → link atualizado

### Fase 4 — Melhorias sugeridas (a validar com você)
- [ ] Exibir ETA (data prevista) — hoje fora porque o pedido foi só PR/PO/Qtd/Status
- [ ] Corrigir datas suspeitas na planilha (ex.: ano 3036 no KIT; LIMP)
- [ ] Automação: subir o .xlsx no GitHub e uma Action gerar o `data.js` sozinha
- [ ] Proteger o link com senha/SSO (se necessário — hoje o link é público para quem o tiver)
- [ ] Segunda aba **Sheet1** (Reservas) como consulta adicional

## Pontos de atenção encontrados na planilha
- Status em inglês e variados (`Complet`, `awaiting delivry`, `In B13g`…) → traduzidos automaticamente.
- Código 610000160155 aparece em **dois materiais diferentes** (Flare Signal e Holofote); a busca mostra ambos separados.
- PO vazia em itens “awaiting PO” é normal e aparece como “—”.
- Alguns nomes já vêm truncados na planilha de origem.
