const { createClient } = require('@supabase/supabase-js');

// Read env variables from .env.local
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkDatabase() {
    const { data: orgs } = await supabase.from('organizations').select('*');
    console.log('Organizations:', orgs[0]);

    const { data: expenses } = await supabase.from('expenses').select('*').limit(5);
    console.log('\nExpenses sample:', expenses);
    
    // Check if there are any Cota Parte in expenses that we missed
    const { data: allExpenses } = await supabase.from('expenses').select('*');
    
    const missingCRAs = ['CRA-AC', 'CRA-AP', 'CRA-DF', 'CRA-MA', 'CRA-MS', 'CRA-MT', 'CRA-PB', 'CRA-PE', 'CRA-PI', 'CRA-RJ', 'CRA-RS', 'CRA-SE'];
    
    for (const cra of missingCRAs) {
        const org = orgs.find(o => o.name === cra);
        if (org) {
            const orgExpenses = allExpenses.filter(e => e.organization_id === org.id);
            const cota = orgExpenses.filter(e => e.account_id.includes('1.11') || e.account_id.includes('1.12') || (e.account_name || '').toLowerCase().includes('cota'));
            if (cota.length > 0) {
                console.log(`Found Cota Parte for ${cra}:`, cota);
            } else {
                console.log(`NO Cota Parte found in DB for ${cra}. Total expenses: ${orgExpenses.length}`);
            }
        }
    }
}

checkDatabase();
