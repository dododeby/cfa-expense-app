const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const accounts = JSON.parse(fs.readFileSync('src/lib/all-accounts.json', 'utf8'));
const accountIds = new Set(accounts.map(a => a.id));

async function checkMismatch() {
    const { data, error } = await supabase.from('expenses').select('account_id, account_name, total');
    if (error) {
        console.error(error);
        return;
    }
    
    const mismatches = {};
    data.forEach(row => {
        if (!accountIds.has(row.account_id)) {
            if (!mismatches[row.account_id]) {
                mismatches[row.account_id] = { name: row.account_name, count: 0, total: 0 };
            }
            mismatches[row.account_id].count++;
            mismatches[row.account_id].total += row.total;
        }
    });
    
    console.log("Accounts in DB but not in all-accounts.json:");
    console.log(mismatches);
}

checkMismatch();
