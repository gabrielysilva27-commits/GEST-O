# LEAD Gestão

Plataforma de gestão operacional com acesso restrito por login, dashboard executivo e módulos para tarefas, checklists, segurança, treinamentos, chamados, relatórios, notificações e histórico.

O projeto foi construído com:

- frontend em `HTML`, `CSS` e `JavaScript` puro;
- API REST em `PowerShell` com `HttpListener`;
- persistência local em `JSON`;
- base inicial vazia, preservando apenas o acesso administrativo da Gabriely;
- testes automatizados em `PowerShell`.

## Acesso inicial

- Usuário administrador: `Gabriely`
- Senha: `gaby0739`

Esse perfil é `admin` e tem acesso total para edição.

## Estrutura do projeto

```text
.
|-- public/
|   |-- index.html
|   `-- assets/
|       |-- css/styles.css
|       |-- js/
|       |   |-- api.js
|       |   |-- app.js
|       |   |-- state.js
|       |   `-- modules/index.js
|       |-- lead-logo-clean.png
|       `-- lead-mark-clean.png
|-- server/
|   |-- server.ps1
|   |-- data/
|   `-- lib/
|       |-- Auth.ps1
|       |-- Data.ps1
|       `-- Responses.ps1
|-- tests/run-tests.ps1
|-- start.ps1
`-- README.md
```

## Como executar

Abra um terminal PowerShell na pasta do projeto e rode:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

Depois acesse:

```text
http://localhost:8080
```

Na primeira execução, o arquivo `server/data/database.json` é criado ou atualizado automaticamente com a estrutura atual da plataforma.

## Testes

Para validar a aplicação:

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\run-tests.ps1
```

Os testes cobrem:

- healthcheck da API;
- login por usuário e senha;
- sessão autenticada;
- carregamento do dashboard;
- criação e leitura de tarefas;
- atualização de notificações;
- bloqueio de permissão para operador;
- exportação CSV;
- entrega da tela inicial com a marca LEAD.

## Observações

- Toda funcionalidade operacional fica disponível apenas após autenticação.
- O frontend segue a identidade visual da marca LEAD fornecida na imagem de referência.
- A base antiga é migrada automaticamente para o formato com `username` quando necessário.

## Publicação no Cloudflare

Este repositório publica exclusivamente no Worker Cloudflare `lead-gestao`. A configuração está em `wrangler.jsonc` e o comando de compilação é `pnpm build`. Não use o Worker `workstation-armazem`: ele pertence a outro projeto, a Workstation Armazém.

A integração GitHub–Cloudflare foi configurada em 27/08/2026. Commits no ramo `main` devem atualizar somente o endereço do LEAD.
