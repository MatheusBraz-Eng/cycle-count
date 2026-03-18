# Cycle Count Enginei — pacote pronto para Vercel

## Requisitos
- Node.js 20 ou 22
- Conta na Vercel
- Opcional: GitHub para deploy mais simples

## Rodar localmente
1. Abra a pasta do projeto.
2. Rode `npm install`
3. Rode `npm run dev`
4. Abra `http://localhost:3000`

## Publicar hoje na Vercel (jeito mais rápido)
### Opção 1 — sem GitHub, usando CLI
1. Instale a CLI da Vercel:
   - `npm i -g vercel`
2. Entre na pasta do projeto.
3. Rode `npm install`
4. Rode `vercel`
5. Responda as perguntas:
   - login na Vercel
   - confirmar projeto atual
   - framework: Next.js (a Vercel detecta automaticamente)
6. Ao final, a Vercel entrega a URL.
7. Para subir a versão final de produção:
   - `vercel --prod`

### Opção 2 — com GitHub
1. Suba esta pasta para um repositório.
2. Entre na Vercel.
3. Clique em **Add New Project**.
4. Conecte o repositório.
5. Clique em **Deploy**.

## Passo a passo para funcionar hoje
1. Baixe e extraia o arquivo zip.
2. Abra terminal dentro da pasta.
3. Rode `npm install`.
4. Rode `npm run dev` e teste localmente.
5. Teste estes fluxos:
   - informar badge
   - subir Excel real
   - abrir locations
   - contagem manual
   - ação rápida
   - pareamento entre locations
   - tela Operadores
6. Se estiver tudo ok, rode `vercel --prod`.
7. Compartilhe o link.

## Checklist do piloto de hoje
- Ter 1 Excel real para teste
- Ter 2 badges reais para validação
- Rodar com poucas locations primeiro
- Não usar como sistema oficial sem validação do fluxo

## Observações
- O projeto está preparado para front-end funcional e piloto.
- Ainda não possui backend, banco real nem autenticação corporativa.
- Para produção corporativa, o próximo passo é persistência em banco + login + trilha de auditoria no servidor.
