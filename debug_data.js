const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lmmmjtkylmecluvvgxed.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtbW1qdGt5bG1lY2x1dnZneGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNjg3MjMsImV4cCI6MjA3OTc0NDcyM30.cW4gRbYPIz_rqagtHpOf23X-BKpIiOBnQap9Mp8Aj5Q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- DIAGNÓSTICO DE DADOS ---');
    
    // 1. Total de registros na tabela expenses com contagem exata
    const { count: totalExpenses, error: errSum } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true });
    
    if (errSum) {
        console.error('Erro ao contar despesas:', errSum);
    } else {
        console.log(`\n>>> Total de registros na tabela 'expenses': ${totalExpenses}`);
    }

    // 2. Listar organizações e suas contagens
    const { data: orgs, error: orgError } = await supabase.from('organizations').select('id, name').order('name');
    if (orgError) {
        console.error('Erro ao listar organizações:', orgError);
        return;
    }
    
    console.log('\nResumo por Organização:');
    for (const org of orgs || []) {
        // Obter número exato de despesas
        const { count, error } = await supabase
            .from('expenses')
            .select('account_id', { count: 'exact', head: true })
            .eq('organization_id', org.id);
        
        // Obter última atualização
        const { data: firstRow } = await supabase
            .from('expenses')
            .select('updated_at, total')
            .eq('organization_id', org.id)
            .order('updated_at', { ascending: false })
            .limit(1);

        const lastUpdate = firstRow?.[0]?.updated_at || 'Nunca';
        const totalSample = firstRow?.[0]?.total || 0;
        console.log(`${org.name.padEnd(25)} (ID: ${org.id.slice(0,8)}...) ${count} registros. Úl. Update: ${lastUpdate}`);
    }
}

check();
