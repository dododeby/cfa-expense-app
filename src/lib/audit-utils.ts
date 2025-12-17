import { supabase } from './supabase'

export interface AuditEntry {
    id: string;
    timestamp: string;
    user: string;
    accountId: string;
    accountName: string;
    field: 'total' | 'finalistica';
    previousValue: number;
    newValue: number;
    isRecovery?: boolean;
}

/**
 * Get all audit entries from Supabase
 */
export const getAuditHistory = async (): Promise<AuditEntry[]> => {
    try {
        const orgId = sessionStorage.getItem('orgId')
        if (!orgId) return []

        const { data, error } = await supabase
            .from('audit_log')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return data?.map(row => ({
            id: row.id,
            timestamp: row.created_at,
            user: orgId,
            accountId: row.account_id,
            accountName: row.account_name,
            field: row.field as 'total' | 'finalistica',
            previousValue: parseFloat(row.previous_value) || 0,
            newValue: parseFloat(row.new_value) || 0,
            isRecovery: row.is_recovery || false
        })) || []
    } catch (error) {
        console.error('Error loading audit history:', error)
        return []
    }
}

/**
 * Add a new audit entry to Supabase
 */
export const addAuditEntry = async (entry: Omit<AuditEntry, 'id' | 'timestamp' | 'user'>): Promise<void> => {
    try {
        const orgId = sessionStorage.getItem('orgId')
        const userId = sessionStorage.getItem('userId')

        if (!orgId || !userId) return

        const { error } = await supabase
            .from('audit_log')
            .insert({
                organization_id: orgId,
                user_id: userId,
                account_id: entry.accountId,
                account_name: entry.accountName,
                field: entry.field,
                previous_value: entry.previousValue,
                new_value: entry.newValue,
                is_recovery: entry.isRecovery || false
            })

        if (error) throw error
    } catch (error) {
        console.error('Error adding audit entry:', error)
    }
}

/**
 * Get audit history for a specific account
 */
export const getAccountHistory = async (accountId: string): Promise<AuditEntry[]> => {
    const history = await getAuditHistory()
    return history.filter(entry => entry.accountId === accountId)
}

/**
 * Get data snapshot from a specific date
 */
export const getDataSnapshotFromDate = async (targetDate: Date): Promise<{ [accountId: string]: { total: number; finalistica: number } }> => {
    try {
        const orgId = sessionStorage.getItem('orgId')
        if (!orgId) return {}

        const endOfDay = new Date(targetDate)
        endOfDay.setHours(23, 59, 59, 999)

        const { data, error } = await supabase
            .from('audit_log')
            .select('*')
            .eq('organization_id', orgId)
            .lte('created_at', endOfDay.toISOString())
            .order('created_at', { ascending: true })

        if (error) throw error

        const snapshot: { [accountId: string]: { total: number; finalistica: number } } = {}

        data?.forEach(row => {
            if (!snapshot[row.account_id]) {
                snapshot[row.account_id] = { total: 0, finalistica: 0 }
            }
            snapshot[row.account_id][row.field as 'total' | 'finalistica'] = parseFloat(row.new_value) || 0
        })

        return snapshot
    } catch (error) {
        console.error('Error getting snapshot:', error)
        return {}
    }
}

/**
 * Get yesterday's data snapshot
 */
export const getYesterdaySnapshot = async (): Promise<{ [accountId: string]: { total: number; finalistica: number } }> => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return getDataSnapshotFromDate(yesterday)
}

/**
 * Perform daily recovery
 */
export const performDailyRecovery = async (
    currentData: { [accountId: string]: { total: number; finalistica: number } },
    accountsMap: Map<string, { id: string; name: string }>
): Promise<{ [accountId: string]: { total: number; finalistica: number } }> => {
    const yesterdayData = await getYesterdaySnapshot()

    const allAccountIds = new Set([
        ...Object.keys(currentData),
        ...Object.keys(yesterdayData)
    ])

    for (const accountId of allAccountIds) {
        const currentTotal = currentData[accountId]?.total || 0
        const currentFinalistica = currentData[accountId]?.finalistica || 0
        const yesterdayTotal = yesterdayData[accountId]?.total || 0
        const yesterdayFinalistica = yesterdayData[accountId]?.finalistica || 0

        const account = accountsMap.get(accountId)
        if (!account) continue

        if (currentTotal !== yesterdayTotal) {
            await addAuditEntry({
                accountId,
                accountName: account.name,
                field: 'total',
                previousValue: currentTotal,
                newValue: yesterdayTotal,
                isRecovery: true
            })
        }

        if (currentFinalistica !== yesterdayFinalistica) {
            await addAuditEntry({
                accountId,
                accountName: account.name,
                field: 'finalistica',
                previousValue: currentFinalistica,
                newValue: yesterdayFinalistica,
                isRecovery: true
            })
        }
    }

    return yesterdayData
}

/**
 * Export audit history to CSV
 */
export const exportAuditHistoryToCSV = async (): Promise<void> => {
    const history = await getAuditHistory()

    if (history.length === 0) {
        alert('Nenhum histórico para exportar')
        return
    }

    const headers = ['Data/Hora', 'Usuário', 'Conta', 'Campo', 'Valor Anterior', 'Valor Novo', 'Tipo']
    const rows = history.map(entry => [
        new Date(entry.timestamp).toLocaleString('pt-BR'),
        entry.user.toUpperCase(),
        entry.accountName,
        entry.field === 'total' ? 'Total' : 'Atividade Finalística',
        entry.previousValue.toFixed(2),
        entry.newValue.toFixed(2),
        entry.isRecovery ? 'Recovery' : 'Alteração Manual'
    ])

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `historico_alteracoes_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

/**
 * Generic audit logging function for all action types
 */
export const logAuditAction = async (params: {
    actionType: string
    actionDetails?: any
    accountId?: string
    accountName?: string
    targetUserId?: string
    targetUserName?: string
}): Promise<void> => {
    try {
        const orgId = sessionStorage.getItem('orgId')
        const userId = sessionStorage.getItem('userId')
        const userName = sessionStorage.getItem('userName') || sessionStorage.getItem('orgName') || 'Sistema'

        if (!orgId || !userId) {
            console.warn('Missing orgId or userId for audit logging')
            return
        }

        const { error } = await supabase.from('audit_log').insert({
            organization_id: orgId,
            user_id: userId,
            user_name: userName,
            action_type: params.actionType,
            action_details: params.actionDetails || {},
            account_id: params.accountId,
            account_name: params.accountName
        })

        if (error) throw error
    } catch (error) {
        console.error('Error logging audit action:', error)
    }
}
