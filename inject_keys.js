
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const debugScriptPath = path.join(__dirname, 'debug_crace.js');

try {
    const envData = fs.readFileSync(envPath, 'utf8');
    let url = '';
    let key = '';

    envData.split('\n').forEach(line => {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
            url = line.split('=')[1].trim().replace(/"/g, '');
        }
        if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
            key = line.split('=')[1].trim().replace(/"/g, '');
        }
    });

    if (!url || !key) {
        console.error('Could not find keys in .env.local');
        process.exit(1);
    }

    let debugScript = fs.readFileSync(debugScriptPath, 'utf8');

    // Replace the process.env lines with actual values
    debugScript = debugScript.replace(
        'const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL',
        `const supabaseUrl = "${url}"`
    );
    debugScript = debugScript.replace(
        'const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY',
        `const supabaseKey = "${key}"`
    );

    fs.writeFileSync(debugScriptPath, debugScript);
    console.log('Keys injected successfully into debug_crace.js');

} catch (err) {
    console.error('Error:', err);
}
