const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lmmmjtkylmecluvvgxed.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtbW1qdGt5bG1lY2x1dnZneGVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE2ODcyMywiZXhwIjoyMDc5NzQ0NzIzfQ.tYo3xLotrFvQMQQkKXJ3W-FXegMceyPv69M0L7GEUYI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: orgs } = await supabase.from('organizations').select('id, name').order('name');
    
    console.log('--- VALORES FINANCEIROS NO BANCO (SERVICE ROLE) ---');
    for (const org of orgs || []) {
        const { data: expenses } = await supabase
            .from('expenses')
            .select('total, account_id')
            .eq('organization_id', org.id);
        
        let sum = 0;
        expenses?.forEach(e => sum += parseFloat(e.total || 0));
        
        if (sum > 0 || org.name.includes('PE')) {
           console.log(`${org.name.padEnd(25)}: R$ ${sum.toLocaleString('pt-BR')} (${expenses?.length} registros)`);
           // Mostrar as 3 primeiras contas de exemplo para ver o formato do account_id
           if (org.name.includes('PE') && expenses?.length > 0) {
               console.log(`   Exemplo de contas: ${expenses.slice(0,3).map(e => e.account_id).join(', ')}`);
           }
        }
    }
}

check();
