# Cores atualizadas conforme o PDF

- Verde Escoteiro: `#1A4524` — navegação, marca e botões primários.
- Azul Oceano: `#2980B9` — receitas, gráficos de receitas e ações secundárias.
- Terracota Forte: `#D35400` — despesas e alertas de erro.
- Amarelo Alerta: `#F1C40F` — avisos e destaques.
- Cinza Neve: `#F5F5F7` — fundo geral e janela desktop.
- Carvão: `#1D1D1F` — texto principal.

Os tons suaves de superfícies e bordas derivam das cores oficiais. Layout, fontes e funcionalidades foram preservados.

Arquivos alterados: `app/globals.css` e `electron/main.cjs`.

## Executar

O ZIP contém o código-fonte e o arquivo de dependências travadas, sem node_modules ou caches gerados. Na pasta do projeto:

```sh
npm ci
npm run dev
```

Para a versão desktop:

```sh
npm run desktop:dev
```

Validação: TypeScript (`tsc --noEmit`) aprovado e renderização estática dos componentes aprovada. A execução completa e a inspeção visual no navegador não foram concluídas neste ambiente: o pacote original não contém o binário Linux de Rolldown e o navegador de teste não está instalado.
