# HidroCare

Sistema clínico para gestão, monitoramento e auditoria de balanço hídrico em Unidades de
Terapia Intensiva (UTI).

A ideia surgiu de um problema bem concreto: o controle de balanço hídrico em UTI ainda é feito,
em muitos lugares, em papel ou em planilhas soltas — processo sujeito a erro de soma, difícil de
auditar e sem rastreabilidade. O HidroCare digitaliza esse fluxo mantendo a lógica clínica real
usada pela enfermagem intensivista, com precisão matemática no cálculo e histórico auditável de
cada lançamento.

## Funcionalidades e regras clínicas

**Balanço hídrico e agregações**
- Cálculo do saldo hídrico em tempo real, por período de 24h.
- Saldo acumulado desde a admissão do paciente.
- Suporte a registros qualitativos de perdas não mensuráveis em volume (`+`, `++`, `+++`), que
  entram no prontuário sem interferir no cálculo numérico do balanço.

**Fronteira de plantão (shift boundary)**

UTIs não fecham o dia às 00:00 — o plantão é a unidade real de trabalho. O sistema trata isso
nativamente: o plantão começa às 07:00 e vai até 06:59 do dia seguinte, então os lançamentos e
fechamentos ficam sempre no período assistencial correto, independente da virada do calendário.

**Mapeamento de registros**

| Entradas (ganhos)   | Saídas (perdas) |
| -------------------- | ---------------- |
| Medicações            | Diurese          |
| Nutrição enteral      | Drenos           |
| Nutrição parenteral   | SNE / SNG        |
| Hidratação venosa     | Fezes            |
| Outras entradas       | Outras saídas    |

**Prontuário e auditoria**
- Relatório em A4 paisagem com expansão dinâmica de linhas (sem truncar listas longas de
  medicamentos).
- Assinatura do profissional autenticado é anexada automaticamente ao rodapé do documento
  gerado, para dar rastreabilidade jurídica ao registro.

## Stack

| Camada | Tecnologia | Uso |
| ------ | ---------- | --- |
| Frontend | Next.js (App Router), TypeScript, Zod | Interface, roteamento e validação de formulários |
| Frontend | Tailwind CSS | Estilização (tema claro, pensado para leitura rápida em ambiente de UTI) |
| Backend | FastAPI (Python 3) | API REST |
| Backend | SQLAlchemy + Alembic | ORM e versionamento de schema do banco |
| Backend | Pydantic | Validação e serialização de entrada/saída |
| Banco | PostgreSQL | Persistência relacional |
| Testes | Pytest, Vitest, Playwright | Testes unitários (back e front) e end-to-end |

## Segurança

Alguns pontos que valem registrar, já que é um sistema que lida com dados clínicos:

- **Autenticação:** login baseado em JWT. Sem token válido, os endpoints protegidos da API
  rejeitam a requisição.
- **Validação de entrada em duas camadas:** o frontend valida com Zod antes de enviar, e o
  backend valida de novo com Pydantic — nunca confio só na validação do cliente.
- **Consultas parametrizadas:** todo acesso ao banco passa pelo SQLAlchemy (ORM), o que evita
  concatenar SQL manualmente e reduz a superfície pra SQL injection.
- **Segredos fora do repositório:** credenciais de banco e chave de assinatura do JWT ficam em
  variáveis de ambiente, nunca versionadas no código.

Isso não é uma auditoria de segurança formal, é um projeto pessoal em evolução — mas é assim que
tento tratar dados sensíveis desde o início, não como algo pra adicionar depois.

## Estrutura do repositório

```
hidrocare/
├── frontend/
│   ├── app/            # Rotas e páginas (App Router)
│   ├── components/     # Componentes React reutilizáveis
│   ├── hooks/          # Hooks personalizados
│   ├── lib/            # Utilitários e configurações
│   ├── types/          # Tipos TypeScript
│   └── tests/          # Testes (Vitest e Playwright)
│
├── backend/
│   ├── app/
│   │   ├── routers/    # Endpoints da API
│   │   ├── models/     # Modelos SQLAlchemy
│   │   ├── schemas/    # Schemas Pydantic
│   │   ├── services/   # Regras de negócio e cálculos clínicos
│   │   └── database/   # Configuração e sessão do banco
│   ├── alembic/        # Migrations versionadas
│   └── tests/          # Testes automatizados (Pytest)
```

## Roadmap / próximos passos

- [ ] Cobertura de testes para os casos de borda do cálculo de plantão
- [ ] Auditoria formal de segurança (dependências, headers HTTP, rate limiting)
- [ ] Deploy com CI/CD (GitHub Actions)

---

Projeto pessoal, aberto a feedback e sugestões via issues.
