# Balanço Hídrico Hospitalar

Base full-stack para registro e acompanhamento de balanço hídrico hospitalar.

## Estrutura

- `backend/`: API FastAPI, PostgreSQL, JWT e RBAC.
- `frontend/`: Next.js, Tailwind e componentes no padrão shadcn/ui.

## Execução local

1. Crie um banco PostgreSQL chamado `balanco_hidrico`.
2. Copie `backend/.env.example` para `backend/.env` e informe as variáveis.
3. No backend: `pip install -r requirements.txt` e `uvicorn app.main:app --reload`.
4. No frontend: `npm install` e `npm run dev`.

> Para produção, use migrações Alembic, HTTPS, segredo JWT armazenado em cofre e auditoria de acessos.
