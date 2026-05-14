const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkTables() {
    const { data: tables, error } = await supabase.rpc('get_tables');
    if (error) {
        // If RPC doesn't exist, we can't easily list tables. 
        // Let's try querying standard tables we know or guess:
        const tablesToTry = ['cota_parte', 'cota_partes', 'cotas', 'transfers', 'declarations', 'revenues', 'expenses'];
        for (const t of tablesToTry) {
            const { data } = await supabase.from(t).select('count', { count: 'exact', head: true });
            console.log(`Table ${t}: exists? ${data !== null}`);
        }
    } else {
        console.log(tables);
    }
}
checkTables();
