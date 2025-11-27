
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars
const envPath = path.resolve(__dirname, '.env.local');
let SUPABASE_URL = '';
let SUPABASE_SERVICE_ROLE_KEY = '';

try {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
            SUPABASE_URL = line.split('=')[1].trim().replace(/"/g, '');
        }
        if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
            SUPABASE_SERVICE_ROLE_KEY = line.split('=')[1].trim().replace(/"/g, '');
        }
    });
} catch (e) {
    console.error('Error reading .env.local:', e);
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixUserCFA() {
    console.log('--- Fixing User CFA Link ---');

    // 1. Get CFA Org ID
    const { data: cfaOrg, error: cfaError } = await supabase
        .from('organizations')
        .select('id')
        .eq('type', 'CFA')
        .single();

    if (cfaError) {
        console.error('Error finding CFA org:', cfaError);
        return;
    }
    console.log('CFA Org ID:', cfaOrg.id);

    // 2. Get User ID from auth.users (using admin API)
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error('Error listing auth users:', authError);
        return;
    }

    let targetUser = users.find(u => u.email === 'dododeby@gmail.com');

    if (!targetUser) {
        console.log('User dododeby@gmail.com not found in Auth system. Creating user...');
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: 'dododeby@gmail.com',
            password: 'password123', // Temporary password
            email_confirm: true
        });

        if (createError) {
            console.error('Error creating user:', createError);
            return;
        }
        targetUser = newUser.user;
        console.log('User created with ID:', targetUser.id);
    } else {
        console.log('Found Auth User ID:', targetUser.id);
    }

    // 3. Insert into public.users
    const { error: insertError } = await supabase
        .from('users')
        .upsert({
            id: targetUser.id,
            email: targetUser.email,
            organization_id: cfaOrg.id
        });

    if (insertError) {
        console.error('Error linking user to CFA:', insertError);
    } else {
        console.log('SUCCESS: User dododeby@gmail.com linked to CFA organization.');
    }
}

fixUserCFA();
