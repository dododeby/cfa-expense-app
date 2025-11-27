
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Read .env.local manually
const envPath = path.join(process.cwd(), '.env.local')
let supabaseUrl = ''
let supabaseKey = ''

try {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const lines = envContent.split('\n')
    for (const line of lines) {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
            supabaseUrl = line.split('=')[1].trim().replace(/"/g, '')
        }
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
            supabaseKey = line.split('=')[1].trim().replace(/"/g, '')
        }
    }
} catch (e) {
    console.error('Error reading .env.local', e)
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const organizations = [
    { name: 'CFA', type: 'CFA', estado: 'DF' },
    { name: 'CRA-AC', type: 'CRA', estado: 'AC' },
    { name: 'CRA-AL', type: 'CRA', estado: 'AL' },
    { name: 'CRA-AM', type: 'CRA', estado: 'AM' },
    { name: 'CRA-AP', type: 'CRA', estado: 'AP' },
    { name: 'CRA-BA', type: 'CRA', estado: 'BA' },
    { name: 'CRA-CE', type: 'CRA', estado: 'CE' },
    { name: 'CRA-DF', type: 'CRA', estado: 'DF' },
    { name: 'CRA-ES', type: 'CRA', estado: 'ES' },
    { name: 'CRA-GO', type: 'CRA', estado: 'GO' },
    { name: 'CRA-MA', type: 'CRA', estado: 'MA' },
    { name: 'CRA-MG', type: 'CRA', estado: 'MG' },
    { name: 'CRA-MS', type: 'CRA', estado: 'MS' },
    { name: 'CRA-MT', type: 'CRA', estado: 'MT' },
    { name: 'CRA-PA', type: 'CRA', estado: 'PA' },
    { name: 'CRA-PB', type: 'CRA', estado: 'PB' },
    { name: 'CRA-PE', type: 'CRA', estado: 'PE' },
    { name: 'CRA-PI', type: 'CRA', estado: 'PI' },
    { name: 'CRA-PR', type: 'CRA', estado: 'PR' },
    { name: 'CRA-RJ', type: 'CRA', estado: 'RJ' },
    { name: 'CRA-RN', type: 'CRA', estado: 'RN' },
    { name: 'CRA-RO', type: 'CRA', estado: 'RO' },
    { name: 'CRA-RR', type: 'CRA', estado: 'RR' },
    { name: 'CRA-RS', type: 'CRA', estado: 'RS' },
    { name: 'CRA-SC', type: 'CRA', estado: 'SC' },
    { name: 'CRA-SE', type: 'CRA', estado: 'SE' },
    { name: 'CRA-SP', type: 'CRA', estado: 'SP' },
    { name: 'CRA-TO', type: 'CRA', estado: 'TO' }
]

async function seed() {
    console.log('Seeding organizations...')

    for (const org of organizations) {
        const { error } = await supabase
            .from('organizations')
            .upsert(org, { onConflict: 'name' })

        if (error) {
            console.error(`Error inserting ${org.name}:`, error.message)
        } else {
            console.log(`Inserted/Updated ${org.name}`)
        }
    }

    console.log('Done!')
}

seed()
