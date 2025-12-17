import { supabase } from './supabase'

export interface ConsolidatedRevenue {
    [accountId: string]: {
        value: number;
    }
}

export async function loadConsolidatedRevenues(): Promise<{ [orgId: string]: ConsolidatedRevenue }> {
    const { data, error } = await supabase
        .from('revenues')
        .select('organization_id, account_id, value')

    if (error) {
        console.error('Error loading consolidated revenues:', error)
        return {}
    }

    const result: { [orgId: string]: ConsolidatedRevenue } = {}

    data.forEach((item: any) => {
        if (!result[item.organization_id]) {
            result[item.organization_id] = {}
        }

        // Sum values if duplicates exist (shouldn't for unique entries, but good for safety)
        if (!result[item.organization_id][item.account_id]) {
            result[item.organization_id][item.account_id] = { value: 0 }
        }

        result[item.organization_id][item.account_id].value += item.value
    })

    return result
}
