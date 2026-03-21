const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lmmmjtkylmecluvvgxed.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtbW1qdGt5bG1lY2x1dnZneGVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE2ODcyMywiZXhwIjoyMDc5NzQ0NzIzfQ.tYo3xLotrFvQMQQkKXJ3W-FXegMceyPv69M0L7GEUYI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- DIAGNÓSTICO DE ID (MAIÚSCULA/MINÚSCULA/ESPAÇOS) ---');
    
    // 1. IDs na tabela organizations
    const { data: orgs } = await supabase.from('organizations').select('id, name');
    
    // 2. IDs na tabela expenses (agrupados)
    const { data: expIds } = await supabase.from('expenses').select('organization_id');
    const expensesOrgs = [...new Set(expIds.map(e => e.organization_id))];

    console.log('\nIDs na tabela ORGANIZATIONS:');
    orgs.forEach(o => console.log(`'${o.id}' (${o.name})`));

    console.log('\nIDs (organization_id) presentes na tabela EXPENSES:');
    expensesOrgs.forEach(id => {
       const match = orgs.find(o => o.id === id);
       const status = match ? '✓ MATCH!' : '✗ SEM CORRESPONDÊNCIA NA TABLE ORGS!';
       console.log(`'${id}' --> ${status}`);
    });
}

check();
