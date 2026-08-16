# Redesign editorial clínico — HidroCare

## Objetivo

Modernizar todo o frontend do HidroCare para uma experiência profissional de HealthTech, inspirada na clareza editorial do OpenAI Cookbook. O resultado deve parecer um produto hospitalar maduro: preciso, calmo, legível e seguro — sem ornamentos ou padrões visuais genéricos.

## Escopo e limites

Abrange login, dashboard, registros hídricos, pacientes, usuários e navegação compartilhada. Não altera FastAPI, PostgreSQL, regras de negócio, API, JWT, RBAC, arquivos `.env` ou quaisquer credenciais.

## Direção visual

- Fundo: azul-neutro muito claro; superfícies brancas com borda discreta, não sombras pesadas.
- Marca e ação: azul profundo hospitalar. Texto principal em azul-marinho quase preto.
- Semântica clínica: verde para estável, âmbar para atenção e vermelho para crítico. Estados serão acompanhados por texto e ícones, nunca apenas cor.
- Tipografia: hierarquia editorial (títulos fortes, corpo confortável, rótulos compactos), com espaçamento amplo e alinhamentos precisos.
- Geometria: raios moderados, linhas finas e uma grade de espaçamento consistente. Sem gradientes chamativos, glassmorphism ou cards decorativos em excesso.

## App shell

No desktop, haverá uma barra lateral clara e estreita com a marca, navegação por ícone e texto, e área de sessão no rodapé. O conteúdo terá cabeçalho contextual com título, descrição e ação principal. Em telas pequenas, a navegação se torna um cabeçalho compacto e acessível.

Perfis clínicos visualizarão Dashboard e Registros. Administradores também visualizarão Pacientes e Usuários. A proteção real permanece no backend; a interface apenas reduz ruído e evita oferecer ações indisponíveis.

## Páginas

### Login

Uma tela de acesso serena, com bloco de autenticação alinhado à esquerda em desktop, identidade visual sutil e área de suporte com mensagem de privacidade. Campos terão feedback de erro próximo ao controle e botão de ação claro.

### Dashboard

O topo apresentará o contexto do plantão e uma faixa enxuta de indicadores. O gráfico de evolução será o foco visual principal. A priorização de pacientes será uma lista clínica organizada por risco, com saldo, leito e status facilmente escaneáveis. Dados fictícios e integrações existentes permanecem inalterados.

### Registro hídrico

O fluxo será uma sequência de blocos: paciente, natureza do lançamento, detalhes de volume/horário e observações. Ganhos e perdas usarão controles distintos com descrição e cor semântica discreta. Uma confirmação clara será exibida após o salvamento.

### Pacientes e usuários

Formulários administrativos terão cabeçalho, contexto da operação, campos agrupados e avisos de permissão/segurança. As ações administrativas serão visualmente distintas das assistenciais, sem criar barreiras desnecessárias.

## Componentes e comportamento

- Tokens de cor, tipografia, espaçamento, borda e elevação centralizados no CSS global/Tailwind.
- Componentes reutilizáveis para navegação, cabeçalho de página, métricas, status, superfícies, campos e mensagens.
- Estados de foco, carregamento, vazio, sucesso e erro consistentes.
- Resposta móvel prioriza ações e leitura; gráficos e listas preservam legibilidade sem rolagem horizontal não intencional.

## Critérios de aceite

1. Todas as telas usam o mesmo sistema visual e permanecem responsivas.
2. Operações existentes continuam chamando as mesmas rotas e enviando os mesmos dados.
3. Nenhuma credencial, variável de ambiente ou arquivo de backend é alterado.
4. Navegação e formulários podem ser usados por teclado e mantêm contraste suficiente.
5. O resultado transmite software hospitalar profissional, com edição visual intencional e sem aparência de template genérico.
