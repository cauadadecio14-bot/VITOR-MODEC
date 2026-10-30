# Consulta de Materiais — Marinha (MODEC)

- `index.html` — link para a equipe (busca por nome/código → PR, PO, Quantidade, Status)
- `admin.html` — importar a planilha atualizada e gerar `data.js`
- `data.js` — dados atuais (substitua a cada atualização)
- `gerar-dados.js` — alternativa por terminal: `node gerar-dados.js planilha.xlsx`
- `assets/logo-modec.png` — coloque aqui o logo oficial (opcional; sem ele aparece o texto MODEC)
- `ROADMAP.md` — plano por fases

## Links
- Equipe (Marinha): https://controledemateriaismodec.pages.dev
- Atualização (restrito, com login): https://controledemateriaismodec.pages.dev/admin.html

Hospedagem: Cloudflare Pages ligado a este repositório (branch `main`, sem build, pasta raiz). Cada publicação no botão "Atualizar dados" grava `data.js` aqui e o site atualiza em ~1 minuto.

Funciona também abrindo `index.html` direto no computador.
