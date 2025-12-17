import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
        lastAutoTable: { finalY: number };
    }
}

function generateBestPracticesPDF() {
    const doc = new jsPDF();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Análise Completa de Boas Práticas', 105, yPos, { align: 'center' });

    yPos += 10;
    doc.setFontSize(14);
    doc.text('CFA Expense App', 105, yPos, { align: 'center' });

    yPos += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 105, yPos, { align: 'center' });

    // Executive Summary
    yPos = 50;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Sumário Executivo', 14, yPos);

    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const summary = [
        'Este documento apresenta uma análise abrangente de boas práticas do projeto CFA Expense App,',
        'uma aplicação Next.js desenvolvida para consolidação de dados de despesas e receitas do CFA e',
        '27 CRAs regionais. A análise cobre arquitetura, segurança, performance, qualidade de código,',
        'acessibilidade e manutenibilidade.'
    ];
    summary.forEach(line => {
        doc.text(line, 14, yPos);
        yPos += 5;
    });

    // New Page - Table of Contents
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Índice', 14, yPos);

    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const toc = [
        '1. Visão Geral do Projeto .................................................. 3',
        '2. Arquitetura e Estrutura ................................................ 4',
        '3. Segurança e Autenticação .............................................. 5',
        '4. Qualidade de Código .................................................... 7',
        '5. Performance e Otimização .............................................. 9',
        '6. Acessibilidade ......................................................... 11',
        '7. Manutenibilidade e Escalabilidade .................................... 12',
        '8. Testes e Qualidade ..................................................... 14',
        '9. Documentação ........................................................... 15',
        '10. Recomendações Prioritárias ........................................... 16'
    ];
    toc.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 7;
    });

    // Section 1: Project Overview
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Visão Geral do Projeto', 14, yPos);

    yPos += 10;
    doc.setFontSize(12);
    doc.text('1.1 Tecnologias Principais', 14, yPos);

    yPos += 8;
    doc.autoTable({
        startY: yPos,
        head: [['Tecnologia', 'Versão', 'Propósito']],
        body: [
            ['Next.js', '16.0.4', 'Framework React com SSR/SSG'],
            ['React', '19.2.0', 'Biblioteca UI'],
            ['TypeScript', '^5', 'Tipagem estática'],
            ['Supabase', '^2.85.0', 'Backend-as-a-Service'],
            ['Tailwind CSS', '^4', 'Framework CSS'],
            ['Radix UI', 'Várias', 'Componentes acessíveis'],
            ['jsPDF', '^3.0.4', 'Geração de PDFs'],
            ['Recharts', '^3.5.0', 'Visualização de dados']
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
    });

    yPos = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text('1.2 Estrutura do Projeto', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    const structure = [
        '• /src/app - Páginas e rotas (App Router)',
        '• /src/components - Componentes reutilizáveis',
        '• /src/lib - Utilitários, tipos e lógica de negócio',
        '• /src/hooks - Custom React hooks',
        '• SQL files - Scripts de migração e schema do Supabase'
    ];
    structure.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    // Section 2: Architecture
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Arquitetura e Estrutura', 14, yPos);

    yPos += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2.1 Pontos Fortes', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 128, 0);
    const archStrengths = [
        '✓ Uso do Next.js App Router (arquitetura moderna)',
        '✓ Separação clara entre componentes UI e lógica de negócio',
        '✓ TypeScript configurado com strict mode',
        '✓ Componentes UI baseados em Radix (acessíveis por padrão)',
        '✓ Integração bem estruturada com Supabase'
    ];
    archStrengths.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    yPos += 5;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2.2 Áreas de Melhoria', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 140, 0);
    const archImprovements = [
        '⚠ Falta de camada de abstração para gerenciamento de estado',
        '⚠ Ausência de Context API ou state management library',
        '⚠ Componentes com múltiplas responsabilidades (violação SRP)',
        '⚠ Lógica de negócio misturada com componentes UI'
    ];
    archImprovements.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    yPos += 5;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2.3 Recomendações', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const archRecs = [
        '1. Implementar Context API para gerenciar estado de autenticação',
        '2. Criar custom hooks para lógica de negócio reutilizável',
        '3. Separar componentes grandes em componentes menores e focados',
        '4. Considerar padrão de Repository para acesso a dados'
    ];
    archRecs.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    // Section 3: Security
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Segurança e Autenticação', 14, yPos);

    yPos += 10;
    doc.setFontSize(12);
    doc.text('3.1 Vulnerabilidades Identificadas', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.text('CRÍTICO:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(' Uso excessivo de sessionStorage para dados sensíveis', 35, yPos);

    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.autoTable({
        startY: yPos,
        head: [['Arquivo', 'Ocorrências', 'Dados Armazenados']],
        body: [
            ['dashboard/layout.tsx', '12', 'orgId, orgType, orgName, userId'],
            ['lib/audit-utils.ts', '6', 'orgId, userId, userName'],
            ['lib/expense-data.ts', '3', 'orgId, userId'],
            ['lib/revenue-data.ts', '2', 'orgId'],
            ['Outros arquivos', '27+', 'Vários']
        ],
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38] }
    });

    yPos = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    const securityIssues = [
        'Problemas identificados:',
        '• SessionStorage é vulnerável a XSS attacks',
        '• Dados persistem apenas durante a sessão do navegador',
        '• Não há encriptação dos dados armazenados',
        '• IDs de usuário e organização expostos no client-side',
        '• Falta de validação de tokens JWT no client-side'
    ];
    securityIssues.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    yPos += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('3.2 Configuração do Supabase', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 140, 0);
    const supabaseIssues = [
        '⚠ Chaves de API usando valores placeholder como fallback',
        '⚠ Falta de validação se as variáveis de ambiente estão definidas',
        '⚠ Cliente Supabase criado sem configurações de segurança adicionais'
    ];
    supabaseIssues.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    doc.addPage();
    yPos = 20;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('3.3 Recomendações de Segurança (PRIORITÁRIO)', 14, yPos);

    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const securityRecs = [
        '1. MIGRAR DE SESSIONSTORAGE PARA AUTENTICAÇÃO BASEADA EM JWT',
        '   • Usar Supabase Auth para gerenciar sessões',
        '   • Armazenar tokens em httpOnly cookies',
        '   • Implementar refresh token rotation',
        '',
        '2. IMPLEMENTAR CONTEXT API PARA AUTENTICAÇÃO',
        '   • Criar AuthContext para gerenciar estado de usuário',
        '   • Usar hooks personalizados (useAuth, useUser)',
        '   • Centralizar lógica de autenticação',
        '',
        '3. VALIDAR VARIÁVEIS DE AMBIENTE',
        '   • Remover fallbacks de placeholder',
        '   • Adicionar validação no startup da aplicação',
        '   • Usar bibliotecas como zod para validação',
        '',
        '4. IMPLEMENTAR ROW LEVEL SECURITY (RLS)',
        '   • Garantir que políticas RLS estão ativas',
        '   • Validar que usuários só acessam seus próprios dados',
        '   • Testar políticas com diferentes perfis de usuário',
        '',
        '5. ADICIONAR RATE LIMITING',
        '   • Proteger endpoints de API',
        '   • Implementar throttling em operações sensíveis'
    ];
    securityRecs.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 5;
    });

    // Section 4: Code Quality
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Qualidade de Código', 14, yPos);

    yPos += 10;
    doc.setFontSize(12);
    doc.text('4.1 Análise de Componentes', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Componente: AuditHistory.tsx (274 linhas)', 14, yPos);

    yPos += 8;
    doc.setTextColor(0, 128, 0);
    const auditStrengths = [
        '✓ Tipagem forte com TypeScript',
        '✓ Uso adequado de hooks (useState, useEffect)',
        '✓ Paginação implementada corretamente',
        '✓ Formatação de datas localizada (pt-BR)',
        '✓ Filtros bem estruturados'
    ];
    auditStrengths.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    yPos += 5;
    doc.setTextColor(255, 140, 0);
    const auditIssues = [
        '⚠ Uso de sessionStorage (linhas 76, 84, 85)',
        '⚠ Falta de tratamento de erro robusto',
        '⚠ Console.error sem logging estruturado',
        '⚠ Magic numbers (itemsPerPage = 20, limit = 200)',
        '⚠ Lógica de negócio no componente UI'
    ];
    auditIssues.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.text('Componente: expense-grid.tsx (303 linhas)', 14, yPos);

    yPos += 8;
    doc.setTextColor(0, 128, 0);
    const expenseStrengths = [
        '✓ Componente FormattedNumberInput bem encapsulado',
        '✓ Formatação de moeda localizada',
        '✓ Lógica de auto-save implementada',
        '✓ Suporte a importação/exportação Excel',
        '✓ Cálculos derivados bem estruturados'
    ];
    expenseStrengths.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    yPos += 5;
    doc.setTextColor(255, 140, 0);
    const expenseIssues = [
        '⚠ Componente muito grande (303 linhas)',
        '⚠ Múltiplas responsabilidades (SRP violation)',
        '⚠ Estado local complexo sem gerenciamento centralizado',
        '⚠ Uso de alert() para feedback de usuário',
        '⚠ Mock data hardcoded (handleBIExport)',
        '⚠ Falta de debouncing no auto-save'
    ];
    expenseIssues.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    doc.addPage();
    yPos = 20;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('4.2 Padrões de Código', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.autoTable({
        startY: yPos,
        head: [['Aspecto', 'Status', 'Observação']],
        body: [
            ['Nomenclatura', '✓ Bom', 'Nomes descritivos e consistentes'],
            ['Formatação', '✓ Bom', 'Indentação e espaçamento adequados'],
            ['Comentários', '⚠ Regular', 'Poucos comentários explicativos'],
            ['DRY Principle', '⚠ Regular', 'Alguma duplicação de código'],
            ['SOLID Principles', '✗ Ruim', 'Violações de SRP e DIP'],
            ['Error Handling', '✗ Ruim', 'Tratamento inconsistente'],
            ['Type Safety', '✓ Bom', 'TypeScript strict mode ativo']
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
    });

    yPos = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('4.3 Recomendações de Qualidade', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const qualityRecs = [
        '1. Refatorar componentes grandes (>200 linhas)',
        '2. Extrair lógica de negócio para custom hooks',
        '3. Implementar error boundaries',
        '4. Adicionar logging estruturado (ex: Winston, Pino)',
        '5. Criar constantes para magic numbers',
        '6. Substituir alert() por toast notifications',
        '7. Implementar debouncing/throttling onde apropriado',
        '8. Adicionar JSDoc para funções complexas'
    ];
    qualityRecs.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    // Section 5: Performance
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('5. Performance e Otimização', 14, yPos);

    yPos += 10;
    doc.setFontSize(12);
    doc.text('5.1 Análise de Performance', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 140, 0);
    const perfIssues = [
        'Problemas Identificados:',
        '',
        '⚠ Re-renders desnecessários',
        '  • Falta de useMemo para cálculos complexos',
        '  • Falta de useCallback para funções passadas como props',
        '  • Estado local causando re-renders em cascata',
        '',
        '⚠ Carregamento de dados',
        '  • Queries sem paginação adequada (limit: 200)',
        '  • Falta de cache de dados',
        '  • Ausência de loading states otimizados',
        '',
        '⚠ Bundle size',
        '  • Importação completa de bibliotecas',
        '  • Falta de code splitting',
        '  • Sem análise de bundle configurada'
    ];
    perfIssues.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 5;
    });

    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('5.2 Oportunidades de Otimização', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const perfRecs = [
        '1. REACT OPTIMIZATION',
        '   • Usar React.memo para componentes puros',
        '   • Implementar useMemo para cálculos pesados',
        '   • Usar useCallback para event handlers',
        '   • Implementar virtualization para listas longas',
        '',
        '2. DATA FETCHING',
        '   • Implementar SWR ou React Query para cache',
        '   • Usar Supabase Realtime seletivamente',
        '   • Implementar infinite scroll ao invés de carregar tudo',
        '   • Adicionar prefetching para navegação',
        '',
        '3. NEXT.JS FEATURES',
        '   • Usar Image component para otimização de imagens',
        '   • Implementar dynamic imports para code splitting',
        '   • Configurar ISR (Incremental Static Regeneration)',
        '   • Usar Server Components onde apropriado',
        '',
        '4. BUNDLE OPTIMIZATION',
        '   • Analisar bundle com @next/bundle-analyzer',
        '   • Implementar tree shaking',
        '   • Lazy load componentes pesados'
    ];
    perfRecs.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 5;
    });

    // Section 6: Accessibility
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('6. Acessibilidade', 14, yPos);

    yPos += 10;
    doc.setFontSize(12);
    doc.text('6.1 Pontos Fortes', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 128, 0);
    const a11yStrengths = [
        '✓ Uso de Radix UI (componentes acessíveis por padrão)',
        '✓ Estrutura semântica HTML adequada',
        '✓ Labels associados a inputs',
        '✓ Navegação por teclado funcional em componentes Radix'
    ];
    a11yStrengths.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    yPos += 5;
    doc.setTextColor(255, 140, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('6.2 Áreas de Melhoria', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const a11yIssues = [
        '⚠ Falta de atributos ARIA em componentes customizados',
        '⚠ Ausência de skip links para navegação',
        '⚠ Contraste de cores não validado (WCAG)',
        '⚠ Falta de focus indicators visíveis',
        '⚠ Mensagens de erro sem aria-live regions',
        '⚠ Tabelas sem cabeçalhos apropriados (scope)',
        '⚠ Falta de alternativas textuais para ícones'
    ];
    a11yIssues.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('6.3 Recomendações de Acessibilidade', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const a11yRecs = [
        '1. Adicionar eslint-plugin-jsx-a11y ao projeto',
        '2. Implementar skip navigation links',
        '3. Validar contraste de cores (WCAG AA mínimo)',
        '4. Adicionar aria-label em ícones sem texto',
        '5. Implementar aria-live para notificações',
        '6. Testar com screen readers (NVDA, JAWS)',
        '7. Garantir navegação completa por teclado',
        '8. Adicionar focus-visible styles customizados'
    ];
    a11yRecs.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    // Section 7: Maintainability
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('7. Manutenibilidade e Escalabilidade', 14, yPos);

    yPos += 10;
    doc.setFontSize(12);
    doc.text('7.1 Estrutura de Pastas', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 128, 0);
    doc.text('✓ Estrutura atual é clara e segue convenções Next.js', 14, yPos);

    yPos += 8;
    doc.setTextColor(255, 140, 0);
    const structureIssues = [
        '⚠ Falta de organização por features/domínios',
        '⚠ Componentes UI misturados com componentes de negócio',
        '⚠ Ausência de camada de services/repositories',
        '⚠ Arquivos SQL espalhados sem organização clara'
    ];
    structureIssues.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('7.2 Proposta de Estrutura Melhorada', 14, yPos);

    yPos += 8;
    doc.setFontSize(9);
    doc.setFont('courier', 'normal');
    const proposedStructure = [
        'src/',
        '├── app/                    # Next.js App Router',
        '├── components/',
        '│   ├── ui/                # Componentes base (Radix)',
        '│   ├── features/          # Componentes por feature',
        '│   │   ├── audit/',
        '│   │   ├── expenses/',
        '│   │   └── revenues/',
        '│   └── shared/            # Componentes compartilhados',
        '├── lib/',
        '│   ├── api/               # API clients',
        '│   ├── hooks/             # Custom hooks',
        '│   ├── utils/             # Utilitários',
        '│   ├── types/             # Type definitions',
        '│   └── constants/         # Constantes',
        '├── contexts/              # React Contexts',
        '├── services/              # Business logic',
        '└── database/',
        '    ├── migrations/        # SQL migrations',
        '    └── seeds/             # Seed data'
    ];
    proposedStructure.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 5;
    });

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('7.3 Recomendações de Manutenibilidade', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const maintRecs = [
        '1. Implementar feature-based folder structure',
        '2. Criar barrel exports (index.ts) para módulos',
        '3. Estabelecer convenções de nomenclatura documentadas',
        '4. Implementar path aliases mais específicos (@components, @lib, etc)',
        '5. Criar guia de contribuição (CONTRIBUTING.md)',
        '6. Adicionar pre-commit hooks (Husky + lint-staged)',
        '7. Implementar conventional commits',
        '8. Configurar renovate/dependabot para atualizações'
    ];
    maintRecs.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    // Section 8: Testing
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('8. Testes e Qualidade', 14, yPos);

    yPos += 10;
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    doc.text('8.1 Estado Atual: CRÍTICO', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const testingIssues = [
        '✗ Ausência completa de testes automatizados',
        '✗ Sem framework de testes configurado',
        '✗ Sem testes unitários',
        '✗ Sem testes de integração',
        '✗ Sem testes E2E',
        '✗ Sem CI/CD configurado para rodar testes'
    ];
    testingIssues.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    yPos += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('8.2 Plano de Implementação de Testes', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const testingPlan = [
        'FASE 1: Setup (Prioridade Alta)',
        '• Instalar Vitest para testes unitários',
        '• Configurar React Testing Library',
        '• Instalar Playwright para testes E2E',
        '• Configurar coverage reporting',
        '',
        'FASE 2: Testes Unitários (Prioridade Alta)',
        '• Testar utilitários (formatCurrency, etc)',
        '• Testar custom hooks',
        '• Testar funções de validação',
        '• Meta: >80% coverage em /lib',
        '',
        'FASE 3: Testes de Componentes (Prioridade Média)',
        '• Testar componentes UI isolados',
        '• Testar interações de usuário',
        '• Testar estados de loading/error',
        '• Meta: >70% coverage em /components',
        '',
        'FASE 4: Testes de Integração (Prioridade Média)',
        '• Testar fluxos completos',
        '• Testar integração com Supabase (mocked)',
        '• Testar autenticação',
        '',
        'FASE 5: Testes E2E (Prioridade Baixa)',
        '• Testar jornadas críticas de usuário',
        '• Testar em diferentes navegadores',
        '• Configurar testes em CI/CD'
    ];
    testingPlan.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 5;
    });

    // Section 9: Documentation
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('9. Documentação', 14, yPos);

    yPos += 10;
    doc.setFontSize(12);
    doc.text('9.1 Estado Atual', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 140, 0);
    const docIssues = [
        '⚠ README.md básico (gerado pelo Next.js)',
        '⚠ Falta de documentação de arquitetura',
        '⚠ Ausência de documentação de API',
        '⚠ Sem guia de setup para desenvolvedores',
        '⚠ Falta de documentação de componentes',
        '⚠ Ausência de changelog'
    ];
    docIssues.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 6;
    });

    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('9.2 Documentação Recomendada', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const docRecs = [
        '1. README.md completo',
        '   • Descrição do projeto',
        '   • Requisitos e dependências',
        '   • Instruções de instalação',
        '   • Comandos disponíveis',
        '   • Variáveis de ambiente necessárias',
        '',
        '2. ARCHITECTURE.md',
        '   • Diagrama de arquitetura',
        '   • Decisões técnicas',
        '   • Fluxo de dados',
        '   • Integração com Supabase',
        '',
        '3. CONTRIBUTING.md',
        '   • Guia de contribuição',
        '   • Padrões de código',
        '   • Processo de PR',
        '   • Como rodar testes',
        '',
        '4. API.md',
        '   • Documentação de endpoints',
        '   • Schemas de dados',
        '   • Exemplos de uso',
        '',
        '5. Storybook (opcional)',
        '   • Documentação visual de componentes',
        '   • Casos de uso e variações',
        '   • Props e APIs'
    ];
    docRecs.forEach(item => {
        doc.text(item, 14, yPos);
        yPos += 5;
    });

    // Section 10: Priority Recommendations
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('10. Recomendações Prioritárias', 14, yPos);

    yPos += 10;
    doc.setFontSize(12);
    doc.text('10.1 Ações Imediatas (Próximas 2 semanas)', 14, yPos);

    yPos += 8;
    doc.autoTable({
        startY: yPos,
        head: [['#', 'Ação', 'Impacto', 'Esforço']],
        body: [
            ['1', 'Migrar sessionStorage para Auth Context', 'ALTO', 'MÉDIO'],
            ['2', 'Implementar validação de env vars', 'ALTO', 'BAIXO'],
            ['3', 'Adicionar error boundaries', 'MÉDIO', 'BAIXO'],
            ['4', 'Configurar framework de testes', 'ALTO', 'MÉDIO'],
            ['5', 'Implementar logging estruturado', 'MÉDIO', 'BAIXO']
        ],
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38] }
    });

    yPos = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('10.2 Melhorias de Médio Prazo (1-2 meses)', 14, yPos);

    yPos += 8;
    doc.autoTable({
        startY: yPos,
        head: [['#', 'Ação', 'Impacto', 'Esforço']],
        body: [
            ['6', 'Refatorar componentes grandes', 'MÉDIO', 'ALTO'],
            ['7', 'Implementar React Query/SWR', 'ALTO', 'MÉDIO'],
            ['8', 'Adicionar testes unitários (>80%)', 'ALTO', 'ALTO'],
            ['9', 'Otimizar performance (memoization)', 'MÉDIO', 'MÉDIO'],
            ['10', 'Melhorar acessibilidade (WCAG AA)', 'MÉDIO', 'MÉDIO']
        ],
        theme: 'grid',
        headStyles: { fillColor: [255, 140, 0] }
    });

    yPos = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('10.3 Objetivos de Longo Prazo (3-6 meses)', 14, yPos);

    yPos += 8;
    doc.autoTable({
        startY: yPos,
        head: [['#', 'Ação', 'Impacto', 'Esforço']],
        body: [
            ['11', 'Reestruturar para feature-based', 'MÉDIO', 'ALTO'],
            ['12', 'Implementar testes E2E completos', 'ALTO', 'ALTO'],
            ['13', 'Configurar CI/CD robusto', 'ALTO', 'MÉDIO'],
            ['14', 'Documentação completa', 'MÉDIO', 'MÉDIO'],
            ['15', 'Monitoramento e observabilidade', 'ALTO', 'ALTO']
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
    });

    // Final Page - Summary
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo e Conclusão', 14, yPos);

    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const conclusion = [
        'O projeto CFA Expense App demonstra uma base sólida com tecnologias modernas e uma',
        'arquitetura bem estruturada usando Next.js 16 e TypeScript. A integração com Supabase',
        'está funcional e os componentes UI são construídos sobre Radix UI, garantindo',
        'acessibilidade básica.',
        '',
        'No entanto, foram identificadas áreas críticas que requerem atenção imediata:',
        '',
        '1. SEGURANÇA: O uso extensivo de sessionStorage para dados sensíveis representa',
        '   um risco de segurança significativo. A migração para autenticação baseada em JWT',
        '   com Context API é prioritária.',
        '',
        '2. TESTES: A ausência completa de testes automatizados é preocupante para um sistema',
        '   que lida com dados financeiros. Implementar uma estratégia de testes robusta deve',
        '   ser uma prioridade máxima.',
        '',
        '3. QUALIDADE DE CÓDIGO: Embora o código seja geralmente bem escrito, há violações',
        '   de princípios SOLID e componentes com múltiplas responsabilidades que dificultam',
        '   a manutenção.',
        '',
        '4. PERFORMANCE: Oportunidades significativas de otimização através de memoization,',
        '   code splitting e melhor gerenciamento de estado.',
        '',
        'Seguindo o roadmap de recomendações prioritárias apresentado neste documento,',
        'o projeto pode evoluir para um sistema robusto, seguro, performático e mantível,',
        'adequado para uso em produção com dados sensíveis do CFA e CRAs.',
        '',
        'Score Geral do Projeto: 6.5/10',
        '',
        'Pontuação por Categoria:',
        '• Arquitetura: 7/10',
        '• Segurança: 4/10 ⚠',
        '• Qualidade de Código: 7/10',
        '• Performance: 5/10',
        '• Acessibilidade: 6/10',
        '• Manutenibilidade: 6/10',
        '• Testes: 0/10 ⚠',
        '• Documentação: 3/10'
    ];

    conclusion.forEach(line => {
        doc.text(line, 14, yPos);
        yPos += 5;
    });

    // Save PDF
    const fileName = `CFA_Analise_Boas_Praticas_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    console.log(`PDF gerado com sucesso: ${fileName}`);
    return fileName;
}

// Execute if running directly
if (typeof window !== 'undefined') {
    generateBestPracticesPDF();
}

export { generateBestPracticesPDF };
