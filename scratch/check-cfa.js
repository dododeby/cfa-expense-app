const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkCFA() {
    const { data: orgs } = await supabase.from('organizations').select('*');
    const cfa = orgs.find(o => o.name === 'CFA');
    
    const { data: expenses } = await supabase.from('expenses').select('*').eq('organization_id', cfa.id);
    const { data: revenues } = await supabase.from('revenues').select('*').eq('organization_id', cfa.id);
    
    console.log('CFA Expenses:', expenses);
    console.log('CFA Revenues:', revenues);
}
checkCFA();
