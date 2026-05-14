const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkNullId() {
    const { data: expenses } = await supabase.from('expenses').select('*');
    const weird = expenses.filter(e => !e.account_id || !e.account_name || e.account_id.trim() === '');
    console.log('Expenses with weird/missing ID or Name:', weird.length);
    if (weird.length > 0) {
        console.log(weird.slice(0, 10));
    }
}
checkNullId();
