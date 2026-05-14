const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkAllCota() {
    const { data: expenses } = await supabase.from('expenses').select('*').in('account_id', ['1.11.1.5', '1.12.1.5']);
    console.log('Total Cota Parte records in DB:', expenses.length);
    expenses.forEach(e => {
        console.log(`Org: ${e.organization_id}, Value: ${e.total}`);
    });
}
checkAllCota();
