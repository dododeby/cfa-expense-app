const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkOldestId() {
    const { data: expenses } = await supabase.from('expenses').select('*').like('account_id', '1.10.3.%');
    
    console.log('Found expenses with 1.10.3.x:', expenses ? expenses.length : 0);
    if (expenses && expenses.length > 0) {
        expenses.slice(0, 5).forEach(e => console.log(e.organization_id, e.account_id, e.account_name, e.total));
    }
}
checkOldestId();
