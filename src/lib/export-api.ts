import { ExpenseData } from './expense-data'

/**
 * Load consolidated data using server-side API (bypasses RLS)
 * Used for exports where CFA needs to see all organization data
 */
export async function loadConsolidatedDataForExport(): Promise<{
    data: { [orgId: string]: ExpenseData },
    organizations: { id: string; name: string; type: string }[]
}> {
    try {
        const response = await fetch('/api/export/consolidated')

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`)
        }

        const result = await response.json()

        if (!result.success) {
            throw new Error(result.error || 'Unknown error')
        }

        return {
            data: result.data || {},
            organizations: result.organizations || []
        }
    } catch (error) {
        console.error('Error loading consolidated data for export:', error)
        return {
            data: {},
            organizations: []
        }
    }
}
