const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lmmmjtkylmecluvvgxed.supabase.co';
// USANDO SERVICE ROLE PARA BYPASS RLS
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtbW1qdGt5bG1lY2x1dnZneGVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE2ODcyMywiZXhwIjoyMDc5NzQ0NzIzfQ.tYo3xLotrFvQMQQkKXJ3W-FXegMceyPv69M0L7GEUYI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- DIAGNÓSTICO PROFUNDO (SERVICE ROLE) ---');
    
    // 1. Total real na tabela expenses
    const { count: totalExpenses, error: errSum } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true });
    
    if (errSum) {
        console.error('Erro ao contar despesas:', errSum);
    } else {
        console.log(`\n>>> Total REAL de registros na tabela 'expenses': ${totalExpenses}`);
    }

    // 2. Listar organizações e suas contagens
    const { data: orgs, error: orgError } = await supabase.from('organizations').select('id, name').order('name');
    if (orgError) {
        console.error('Erro ao listar organizações:', orgError);
        return;
    }
    
    console.log('\nResumo por Organização:');
    for (const org of orgs || []) {
        const { count, error } = await supabase
            .from('expenses')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);
        
        const { data: latest } = await supabase
            .from('expenses')
            .select('updated_at, total')
            .eq('organization_id', org.id)
            .order('updated_at', { ascending: false })
            .limit(1);

        const lastUpdate = latest?.[0]?.updated_at || 'Nunca';
        console.log(`${org.name.padEnd(25)} (ID: ${org.id}) ${count} registros. Última: ${lastUpdate}`);
    }
}

check();
