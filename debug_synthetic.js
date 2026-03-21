const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lmmmjtkylmecluvvgxed.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtbW1qdGt5bG1lY2x1dnZneGVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE2ODcyMywiZXhwIjoyMDc5NzQ0NzIzfQ.tYo3xLotrFvQMQQkKXJ3W-FXegMceyPv69M0L7GEUYI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- VERIFICANDO DADOS EM CONTAS SINTÉTICAS ---');
    
    // 1. Pegar o mapeamento de contas para saber quem é sintética
    const fs = require('fs');
    const allAccounts = JSON.parse(fs.readFileSync('src/lib/all-accounts.json', 'utf8'));
    const syntheticIds = new Set(allAccounts.filter(a => a.type === 'Sintética').map(a => a.id));

    // 2. Pegar todas as despesas
    const { data: expenses } = await supabase.from('expenses').select('organization_id, account_id, total');
    
    const results = {};

    expenses?.forEach(exp => {
        if (syntheticIds.has(exp.account_id)) {
            if (!results[exp.organization_id]) results[exp.organization_id] = { sum: 0, count: 0 };
            results[exp.organization_id].sum += parseFloat(exp.total || 0);
            results[exp.organization_id].count++;
        }
    });

    if (Object.keys(results).length === 0) {
        console.log('Nenhum dado encontrado em contas sintéticas. Ótimo!');
    } else {
        console.log('Atenção! Foram encontrados dados em contas SINTÉTICAS (serão ignorados pelo Dashboard):');
        for (const [org, data] of Object.entries(results)) {
            console.log(`- ${org}: R$ ${data.sum.toLocaleString('pt-BR')} (${data.count} registros)`);
        }
    }
}

check();
