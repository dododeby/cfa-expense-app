
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    const { data, error } = await supabase
        .from('organizations')
        .select('*')

    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Organizations found:', data?.length)
        console.log('Sample:', data?.slice(0, 3))
    }
}

check()
