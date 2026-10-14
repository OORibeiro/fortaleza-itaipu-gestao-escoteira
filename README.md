# Fortaleza de Itaipu — Financeiro conectado ao Render

## Comece aqui

1. Publique as correções de backend descritas em `LEIA-ME.md` do ZIP separado `correcoes-backend-colega.zip` no repositório ligado ao Render.
2. Confirme que a conta de acesso existe no banco do Render e tem perfil ADMIN, presidente ou FINANCEIRO. A senha no banco deve ser gerada pelo bcrypt do backend.
3. Na pasta deste projeto, com Node.js 22.13 ou superior, execute:

```sh
npm ci
npm run dev
```

Abra `http://localhost:3000` e faça login. Para a janela desktop, use `npm run desktop:dev`.

## O que foi integrado

- Login em `POST /auth/login`, com e-mail e senha digitados pelo usuário.
- Troca obrigatória de senha em `POST /auth/change-password`. Depois da troca, é solicitado novo login para renovar as informações do token.
- Listagem de movimentações em `GET /finances`.
- Criação em `POST /finances`, edição em `PUT /finances/:id` (incluída nas correções) e exclusão em `DELETE /finances/:id`.
- Ramos em `GET /branches`; o formulário envia `branch_id`, usando caixa geral quando não há ramo.
- Mensalidades em `GET /dues?month=YYYY-MM-01`; o mês pode ser selecionado mesmo quando não há registros.
- Pagamento em `PUT /dues/:id/pay`; a receita é criada somente pelo backend. O frontend recarrega finanças e mensalidades após a confirmação.
- Status de atraso baseado em `status_calculado` retornado pelo backend.
- Conversão de valores em reais da API para centavos na interface e normalização das datas.
- Pesquisa independente em Financeiro e Mensalidades, fora do header e disponível no celular; filtros e exportações preservados.
- Paleta de cores do PDF preservada.

O backend retorna ramo, não patrulha, e não aceita fornecedor. A interface foi ajustada para apresentar Ramo / caixa e não oferecer um campo que seria descartado.

O token fica apenas na memória da página. Ao atualizar ou fechar a página, entre novamente. Nenhuma credencial de teste foi incluída no código. Os registros locais antigos não são enviados, apagados ou usados como substitutos das respostas da API.

## Comunicação com a API

O frontend consulta `/api/render/...`, um proxy do próprio projeto que encaminha apenas as rotas permitidas para `https://grupo-escoteiro.onrender.com`. Ele envia o token ao backend, que continua responsável pela autorização. Isso evita depender de mudanças no CORS para rodar o frontend em outra origem. É necessário executar o servidor do projeto; não se trata de HTML estático.

Erros de autenticação exigem novo login; falhas de carregamento são exibidas com opção de tentar novamente, sem mostrar dados fictícios. Em uma falha de rede ao gravar, atualize os dados antes de repetir a operação, pois o servidor pode já tê-la concluído.

## Escopo dos relatórios

Movimentações financeiras usam os filtros de período já disponíveis. A API de mensalidades exige um mês por consulta, portanto os resumos e a parte de mensalidades dos relatórios consideram apenas o mês selecionado no topo. Não representam o histórico completo de mensalidades. A geração de novas mensalidades não foi acrescentada à interface nesta alteração; a rota de geração permanece no backend.

## Publicação necessária

O ZIP recebido do backend importava `dueRoutes`, mas não registrava `/dues`; também não possuía edição de transações. Os arquivos prontos para corrigir isso estão no ZIP separado `correcoes-backend-colega.zip`.

No último teste ao vivo desta entrega, a conta fornecida retornou 401 no login e `/dues` retornou 404. Seu projeto financeiro não contém os arquivos do backend do colega. As alterações locais não publicam automaticamente no Render. A integração autenticada completa só poderá ser validada após a publicação e o ajuste da conta.

## Validação

```sh
npm test
npx tsc --noEmit
npx eslint app components services views types
```

Passaram: TypeScript, ESLint das pastas de interface/integração, seis testes automatizados da integração com API simulada. As correções e os dois testes do backend foram entregues em outro ZIP. Os testes verificam campos, valores, autenticação enviada, erros, pagamento sem receita duplicada e proxy.

A compilação completa e a inspeção visual em navegador não foram validadas neste ambiente, que não tinha o binário nativo Linux de Rolldown nem o navegador de teste. `npm ci` reinstala as dependências para o sistema em que o projeto será executado.
