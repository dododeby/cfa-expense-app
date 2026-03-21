import { supabase } from './supabase'

export interface ConsolidatedRevenue {
    [accountId: string]: {
        value: number;
    }
}

export async function loadConsolidatedRevenues(): Promise<{ [orgId: string]: ConsolidatedRevenue }> {
    try {
        let allData: any[] = []
        let hasMore = true
        const PAGE_SIZE = 1000

        while (hasMore) {
            const { data, error } = await supabase
                .from('revenues')
                .select('organization_id, account_id, value')
                .range(allData.length, allData.length + PAGE_SIZE - 1)

            if (error) throw error
            
            if (data && data.length > 0) {
                allData = [...allData, ...data]
                if (data.length < PAGE_SIZE) {
                    hasMore = false
                }
            } else {
                hasMore = false
            }
        }

        const result: { [orgId: string]: ConsolidatedRevenue } = {}

        allData.forEach((item: any) => {
            if (!result[item.organization_id]) {
                result[item.organization_id] = {}
            }

            if (!result[item.organization_id][item.account_id]) {
                result[item.organization_id][item.account_id] = { value: 0 }
            }

            result[item.organization_id][item.account_id].value += item.value
        })

        return result
    } catch (error) {
        console.error('Error loading consolidated revenues:', error)
        return {}
    }
}
