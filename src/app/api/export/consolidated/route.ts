import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
    try {
        // Query ALL expenses from all organizations (bypassing RLS)
        let expenses: any[] = [];
        let start = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabaseAdmin
                .from('expenses')
                .select('organization_id, account_id, account_name, total, finalistica')
                .range(start, start + step - 1);

            if (error) {
                console.error('Error loading expenses:', error);
                return NextResponse.json({ error: 'Failed to load expenses' }, { status: 500 });
            }

            if (data && data.length > 0) {
                expenses = [...expenses, ...data];
                start += step;
                if (data.length < step) hasMore = false;
            } else {
                hasMore = false;
            }
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
                finalistica: parseFloat(row.finalistica) || 0,
                name: row.account_name
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
