
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');

try {
    const data = fs.readFileSync(envPath, 'utf8');
    const lines = data.split('\n');
    lines.forEach(line => {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL') || line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
            console.log(line);
        }
    });
} catch (err) {
    console.error('Error reading .env.local:', err);
}
