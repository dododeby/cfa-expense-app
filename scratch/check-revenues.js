const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkRevenues() {
    const { data: orgs } = await supabase.from('organizations').select('*');
    const { data: revenues } = await supabase.from('revenues').select('*');
    
    console.log('Total revenues in DB:', revenues ? revenues.length : 0);
    if (!revenues || revenues.length === 0) return;
    
    const missingCRAs = ['CRA-AC', 'CRA-AP', 'CRA-DF', 'CRA-MA', 'CRA-MS', 'CRA-MT', 'CRA-PA', 'CRA-PB', 'CRA-PE', 'CRA-PI', 'CRA-RJ', 'CRA-RS', 'CRA-SE'];
    
    for (const cra of missingCRAs) {
        const org = orgs.find(o => o.name === cra);
        if (org) {
            const orgRevs = revenues.filter(r => r.organization_id === org.id);
            const cota = orgRevs.filter(r => (r.account_name || '').toLowerCase().includes('cota') || r.account_id.includes('cota'));
            
            console.log(`${cra}: Total revenues = ${orgRevs.length}, Cota Parte revenues = ${cota.length}`);
            if (cota.length > 0) {
                console.log(cota);
            }
        }
    }
}
checkRevenues();
