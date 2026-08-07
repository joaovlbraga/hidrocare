# HidroCare

**Sistema de Gestão, Monitoramento e Auditoria de Balanço Hídrico para Unidades de Terapia Intensiva (UTI)**

O HidroCare é uma plataforma clínica desenvolvida para digitalizar, padronizar e auditar o processo de registro de balanço hídrico em pacientes críticos. Projetado para substituir controles manuais por uma solução rastreável e orientada à tomada de decisão, o sistema garante precisão matemática e conformidade estrita com os protocolos da enfermagem intensivista.

---

## Funcionalidades e Regras Clínicas

### Balanço Hídrico e Agregações
* **Cálculo de 24 Horas:** Processamento em tempo real do saldo hídrico diário.
* **Saldo Acumulado:** Rastreamento contínuo desde a admissão do paciente.
* **Registros Qualitativos:** Suporte a perdas não mensuráveis em volume (`+`, `++`, `+++`). A arquitetura garante que estas entradas sejam registradas no prontuário físico sem interferir nas operações matemáticas do balanço numérico.

### Fronteira de Plantão (Shift Boundary)
O sistema implementa nativamente a regra operacional de UTIs, tratando o plantão como uma unidade de trabalho independente:
* **Início:** 07:00
* **Encerramento:** 06:59 do dia subsequente.
Isso garante que os eventos e métricas de fechamento sejam alocados no período assistencial correto, independente da virada do calendário.

### Mapeamento de Registros
| Entradas (Ganhos) | Saídas (Perdas) |
| :--- | :--- |
| Medicações | Diurese |
| Nutrição Enteral | Drenos |
| Nutrição Parenteral | SNE / SNG |
| Hidratação Venosa | Fezes |
| Outras Entradas | Outras Saídas |

### Prontuário e Auditoria
A geração de relatórios é otimizada para o prontuário físico e para a segurança jurídica da instituição:
* Layout em formato A4 Paisagem com expansão dinâmica de linhas.
* Prevenção de truncamento para listas complexas de medicamentos.
* Injeção dinâmica da assinatura autenticada do profissional logado no rodapé do documento.

---

## Arquitetura e Stack Tecnológica

O sistema adota uma arquitetura baseada em serviços independentes, com forte tipagem ponta a ponta e separação estrita entre lógica de roteamento e regras de negócio.

| Camada | Tecnologia | Propósito |
| :--- | :--- | :--- |
| **Frontend** | Next.js (App Router) | Framework React, roteamento e renderização |
| | TypeScript, Zod | Tipagem estática e validação de schemas |
| | Tailwind CSS | Estilização (Clinical Light Theme otimizado para UTI) |
| **Backend** | FastAPI, Python 3 | API REST de alta performance |
| | SQLAlchemy, Alembic | ORM e versionamento contínuo de banco de dados |
| | Pydantic | Serialização e validação de dados de entrada/saída |
| **Persistência** | PostgreSQL | Banco de dados relacional |
| **Qualidade (QA)**| Pytest, Vitest, Playwright | Cobertura unitária e testes End-to-End |

---

## Estrutura do Repositório

```text
hidrocare/
├── frontend/
│   ├── app/            # Rotas e páginas (App Router)
│   ├── components/     # Componentes React reutilizáveis
│   ├── hooks/          # Hooks personalizados
│   ├── lib/            # Utilitários e configurações
│   ├── types/          # Definições de tipos TypeScript
│   └── tests/          # Testes unitários (Vitest) e E2E (Playwright)
│
├── backend/
│   ├── app/
│   │   ├── routers/    # Endpoints da API
│   │   ├── models/     # Modelos SQLAlchemy
│   │   ├── schemas/    # Schemas Pydantic
│   │   ├── services/   # Lógica de negócio e cálculos clínicos
│   │   └── database/   # Configuração e sessão do banco
│   ├── alembic/        # Migrações versionadas
│   └── tests/          # Testes automatizados (Pytest)
Guia de Execução Local
Pré-requisitos
Node.js (v18+)

Python (v3.10+)

PostgreSQL em execução

Configuração do Backend
Bash
git clone [https://github.com/SEU_USUARIO/hidrocare.git](https://github.com/SEU_USUARIO/hidrocare.git)
cd hidrocare/backend

# Configurar e ativar ambiente virtual
python -m venv .venv
source .venv/bin/activate    # Linux / macOS
# .venv\Scripts\activate     # Windows

# Instalar dependências e iniciar o servidor
pip install -r requirements.txt
uvicorn app.main:app --reload
A API estará disponível em http://localhost:8000 e a documentação OpenAPI em http://localhost:8000/docs.

Configuração do Frontend
Bash
cd ../frontend

# Instalar dependências e iniciar o servidor
npm install
npm run dev
A interface estará disponível em http://localhost:3000.

Execução de Testes
Para validação da integridade das regras de negócio:

Bash
# Backend (na pasta /backend)
pytest

# Frontend Unitário (na pasta /frontend)
npm run test

# Frontend E2E (na pasta /frontend)
npx playwright test
HidroCare — Precisão matemática para o apoio à decisão clínica.