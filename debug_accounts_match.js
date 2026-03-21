const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lmmmjtkylmecluvvgxed.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtbW1qdGt5bG1lY2x1dnZneGVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE2ODcyMywiZXhwIjoyMDc5NzQ0NzIzfQ.tYo3xLotrFvQMQQkKXJ3W-FXegMceyPv69M0L7GEUYI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- COMPARAÇÃO DE CONTAS CRA-PE ---');
    
    // 1. Pegar todas as contas do CRA-PE no banco
    const { data: expenses } = await supabase
        .from('expenses')
        .select('account_id, total')
        .eq('organization_id', 'cra-pe');

    if (!expenses) {
        console.log('Nenhum dado encontrado para cra-pe');
        return;
    }

    const fs = require('fs');
    const allAccounts = JSON.parse(fs.readFileSync('src/lib/all-accounts.json', 'utf8'));
    const accountMap = {};
    allAccounts.forEach(a => accountMap[a.id] = a);

    console.log(`Total de registros no banco para PE: ${expenses.length}`);
    
    let matched = 0;
    let notMatched = 0;
    let notAnalytica = 0;

    expenses.forEach(e => {
        const acc = accountMap[e.account_id];
        if (!acc) {
            notMatched++;
            if (notMatched < 10) console.log(`   [!] Conta não encontrada no JSON: ${e.account_id}`);
        } else if (acc.type !== 'Analítica') {
            notAnalytica++;
            if (notAnalytica < 10) console.log(`   [!] Conta não é Analítica no JSON: ${e.account_id} (${acc.type})`);
        } else {
            matched++;
        }
    });

    console.log(`\nResumo:`);
    console.log(`- Contas correspondentes e analíticas: ${matched}`);
    console.log(`- Contas não encontradas no JSON: ${notMatched}`);
    console.log(`- Contas encontradas mas NÃO são analíticas: ${notAnalytica}`);
}

check();
