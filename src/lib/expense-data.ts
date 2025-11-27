import { supabase } from './supabase'

export interface ExpenseData {
    [accountId: string]: {
        total: number;
        finalistica: number;
    }
}

/**
 * Load expense data for current user's organization
 */
export async function loadExpenseData(): Promise<ExpenseData> {
    try {
        const orgId = sessionStorage.getItem('orgId')
        if (!orgId) throw new Error('No organization ID found')

        const { data, error } = await supabase
            .from('expenses')
            .select('account_id, total, finalistica')
            .eq('organization_id', orgId)

        if (error) throw error

        // Convert array to object format
        const expenseData: ExpenseData = {}
        data?.forEach(row => {
            expenseData[row.account_id] = {
                total: parseFloat(row.total) || 0,
                finalistica: parseFloat(row.finalistica) || 0
            }
        })

        return expenseData
    } catch (error: any) {
        console.error('Error loading expense data:', {
            message: error?.message,
            code: error?.code,
            details: error?.details,
            hint: error?.hint,
            fullError: error
        })
        return {}
    }
}

/**
 * Save or update a single expense entry
 */
export async function saveExpenseEntry(
    accountId: string,
    accountName: string,
    total: number,
    finalistica: number
): Promise<void> {
    try {
        const orgId = sessionStorage.getItem('orgId')
        const userId = sessionStorage.getItem('userId')

        if (!orgId || !userId) throw new Error('Missing organization or user ID')

        const { error } = await supabase
            .from('expenses')
            .upsert({
                organization_id: orgId,
                account_id: accountId,
                account_name: accountName,
                total,
                finalistica,
                updated_by: userId,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'organization_id,account_id'
            })

        if (error) throw error
    } catch (error) {
        console.error('Error saving expense entry:', error)
        throw error
    }
}

/**
 * Load consolidated data (CFA only - all organizations)
 */
export async function loadConsolidatedData(): Promise<{ [orgId: string]: ExpenseData }> {
    try {
        const { data, error } = await supabase
            .from('expenses')
            .select('organization_id, account_id, total, finalistica')

        if (error) throw error

        // Group by organization
        const consolidated: { [orgId: string]: ExpenseData } = {}

        data?.forEach(row => {
            if (!consolidated[row.organization_id]) {
                consolidated[row.organization_id] = {}
            }
            consolidated[row.organization_id][row.account_id] = {
                total: parseFloat(row.total) || 0,
                finalistica: parseFloat(row.finalistica) || 0
            }
        })

        return consolidated
    } catch (error) {
        console.error('Error loading consolidated data:', error)
        return {}
    }
}

/**
 * Load data for a specific organization (CFA viewing a CRA)
 */
export async function loadOrganizationData(orgId: string): Promise<ExpenseData> {
    try {
        const { data, error } = await supabase
            .from('expenses')
            .select('account_id, total, finalistica')
            .eq('organization_id', orgId)

        if (error) throw error

        const expenseData: ExpenseData = {}
        data?.forEach(row => {
            expenseData[row.account_id] = {
                total: parseFloat(row.total) || 0,
                finalistica: parseFloat(row.finalistica) || 0
            }
        })

        return expenseData
    } catch (error) {
        console.error('Error loading organization data:', error)
        return {}
    }
}

/**
 * Load all organizations (for mapping IDs to names)
 */
export async function loadOrganizations(): Promise<{ id: string; name: string; type: string }[]> {
    try {
        const { data, error } = await supabase
            .from('organizations')
            .select('id, name, type')
            .order('name')

        if (error) throw error

        return data || []
    } catch (error) {
        console.error('Error loading organizations:', error)
        return []
    }
}
