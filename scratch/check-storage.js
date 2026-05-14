const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkStorage() {
    const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
    console.log('Buckets:', buckets?.map(b => b.name));
    
    if (buckets && buckets.some(b => b.name === 'excel_imports' || b.name === 'imports' || b.name === 'documents')) {
        const { data: files } = await supabase.storage.from(buckets[0].name).list();
        console.log('Files in first bucket:', files?.length);
    }
}
checkStorage();
