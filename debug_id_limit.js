const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lmmmjtkylmecluvvgxed.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtbW1qdGt5bG1lY2x1dnZneGVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE2ODcyMywiZXhwIjoyMDc5NzQ0NzIzfQ.tYo3xLotrFvQMQQkKXJ3W-FXegMceyPv69M0L7GEUYI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- DIAGNÓSTICO DE ID (COM ALTO LIMIT) ---');
    
    // 1. Pegar IDs das Organizações
    const { data: orgs } = await supabase.from('organizations').select('id, name');
    
    // 2. Pegar TODOS os organization_id na tabela expenses
    const { data: expRows, error } = await supabase
        .from('expenses')
        .select('organization_id')
        .limit(50000); // GARANTIA DE LER TUDO

    if (error) console.error('Erro:', error);

    const expensesOrgs = [...new Set(expRows.map(e => e.organization_id))];

    console.log(`Total de organizações com despesas no banco: ${expensesOrgs.length}`);
    console.log(`IDs das Organizações no banco com despesas: [${expensesOrgs.join(', ')}]`);

    // Verificação específica para PE
    const hasPE = expensesOrgs.includes('cra-pe');
    console.log(`\nCRA-PE (id: 'cra-pe') está presente na tabela de despesas? ${hasPE ? 'SIM' : 'NÃO'}`);
    
    // Se não estiver, listar quais IDs de cra-* estão lá
    if (!hasPE) {
       console.log('Filtro por cra-*: ', expensesOrgs.filter(id => id.startsWith('cra-')));
    }
}

check();
