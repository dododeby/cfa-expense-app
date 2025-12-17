import { supabase } from './supabase'

export interface RevenueEntry {
    id?: string;
    account_id: string;
    organization_id: string;
    value: number;
    year?: number;
    month?: number;
}

export interface RevenueData {
    [accountId: string]: {
        value: number;
    }
}

export async function loadRevenueData(): Promise<RevenueData> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return {}

    // Get user's org
    const orgId = sessionStorage.getItem('orgId')
    if (!orgId) return {}

    const { data, error } = await supabase
        .from('revenues')
        .select('account_id, value')
        .eq('organization_id', orgId)

    if (error) {
        console.error('Error loading revenues:', error)
        return {}
    }

    const result: RevenueData = {}
    data.forEach((item: any) => {
        result[item.account_id] = { value: item.value }
    })

    return result
}

export async function saveRevenueEntry(accountId: string, value: number) {
    const orgId = sessionStorage.getItem('orgId')
    if (!orgId) return

    // Upsert logic
    // We need to match on organization_id and account_id
    // But Supabase upsert needs a primary key or unique constraint.
    // If revenues table has (organization_id, account_id) unique, we can upsert.
    // Otherwise we select then update/insert.

    // Efficient way: Check if exists
    const { data: existing } = await supabase
        .from('revenues')
        .select('id')
        .eq('organization_id', orgId)
        .eq('account_id', accountId)
        .single()

    if (existing) {
        await supabase
            .from('revenues')
            .update({ value, updated_at: new Date() })
            .eq('id', existing.id)
    } else {
        await supabase
            .from('revenues')
            .insert({
                organization_id: orgId,
                account_id: accountId,
                value
            })
    }
}
