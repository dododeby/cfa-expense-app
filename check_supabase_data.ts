// Script to check Supabase data for all organizations
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkOrganizationsData() {
    console.log('Checking data in Supabase...\n')

    // Get all organizations
    const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name')

    if (orgsError) {
        console.error('Error loading organizations:', orgsError)
        return
    }

    console.log(`Found ${orgs?.length} organizations\n`)

    // For each organization, count expenses
    for (const org of orgs || []) {
        const { data: expenses, error: expError } = await supabase
            .from('expenses')
            .select('account_id, total, finalistica')
            .eq('organization_id', org.id)

        if (expError) {
            console.error(`Error loading expenses for ${org.name}:`, expError)
            continue
        }

        const count = expenses?.length || 0
        const totalSum = expenses?.reduce((sum, e) => sum + parseFloat(e.total || '0'), 0) || 0

        const status = count > 0 ? '✓ HAS DATA' : '✗ EMPTY'
        console.log(`${org.name.padEnd(30)} ${status.padEnd(15)} (${count} records, total: ${totalSum.toFixed(2)})`)
    }
}

checkOrganizationsData()
