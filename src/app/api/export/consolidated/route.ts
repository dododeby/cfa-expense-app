import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with SERVICE ROLE permissions to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

export async function GET() {
    try {
        // Query ALL expenses from all organizations (bypassing RLS)
        const { data: expenses, error: expensesError } = await supabaseAdmin
            .from('expenses')
            .select('organization_id, account_id, account_name, total, finalistica')

        if (expensesError) {
            console.error('Error loading expenses:', expensesError)
            return NextResponse.json({ error: 'Failed to load expenses' }, { status: 500 })
        }

        // Query ALL organizations
        const { data: organizations, error: orgsError } = await supabaseAdmin
            .from('organizations')
            .select('id, name, type')
            .order('name')

        if (orgsError) {
            console.error('Error loading organizations:', orgsError)
            return NextResponse.json({ error: 'Failed to load organizations' }, { status: 500 })
        }

        // Group expenses by organization
        const consolidatedData: { [orgId: string]: any } = {}

        expenses?.forEach(row => {
            if (!consolidatedData[row.organization_id]) {
                consolidatedData[row.organization_id] = {}
            }
            consolidatedData[row.organization_id][row.account_id] = {
                total: parseFloat(row.total) || 0,
                finalistica: parseFloat(row.finalistica) || 0
            }
        })

        return NextResponse.json({
            success: true,
            data: consolidatedData,
            organizations: organizations || []
        })
    } catch (error) {
        console.error('Error in consolidated export API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
