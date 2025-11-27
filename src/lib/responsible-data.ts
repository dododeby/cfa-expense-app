import { supabase } from './supabase'

export interface ResponsibleData {
    unitResponsibleName: string
    unitResponsibleCraNumber: string
    dataResponsibleName: string
    dataResponsibleRole: string
    dataResponsibleDocType: 'CRC' | 'CRA' | 'CPF' | 'Outro'
    dataResponsibleDocNumber: string
}

/**
 * Load responsible persons data for an organization
 */
export async function loadResponsibleData(orgId: string): Promise<ResponsibleData | null> {
    try {
        const { data, error } = await supabase
            .from('responsible_persons')
            .select('*')
            .eq('organization_id', orgId)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                // No data found - return null
                return null
            }
            throw error
        }

        return {
            unitResponsibleName: data.unit_responsible_name,
            unitResponsibleCraNumber: data.unit_responsible_cra_number,
            dataResponsibleName: data.data_responsible_name,
            dataResponsibleRole: data.data_responsible_role,
            dataResponsibleDocType: data.data_responsible_doc_type,
            dataResponsibleDocNumber: data.data_responsible_doc_number
        }
    } catch (error) {
        console.error('Error loading responsible data:', error)
        return null
    }
}

/**
 * Save or update responsible persons data for an organization
 */
export async function saveResponsibleData(
    orgId: string,
    data: ResponsibleData
): Promise<void> {
    try {
        const userId = sessionStorage.getItem('userId')
        if (!userId) throw new Error('No user ID found')

        const { error } = await supabase
            .from('responsible_persons')
            .upsert({
                organization_id: orgId,
                unit_responsible_name: data.unitResponsibleName,
                unit_responsible_cra_number: data.unitResponsibleCraNumber,
                data_responsible_name: data.dataResponsibleName,
                data_responsible_role: data.dataResponsibleRole,
                data_responsible_doc_type: data.dataResponsibleDocType,
                data_responsible_doc_number: data.dataResponsibleDocNumber,
                updated_by: userId,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'organization_id'
            })

        if (error) throw error

        // Log the action
        await logAction('responsible_update', {
            organization_id: orgId,
            updated_fields: Object.keys(data)
        })
    } catch (error) {
        console.error('Error saving responsible data:', error)
        throw error
    }
}

/**
 * Log an action to the audit log
 */
export async function logAction(
    actionType: 'expense_update' | 'message_sent' | 'message_read' | 'responsible_update' | 'pdf_generated' | 'login' | 'logout' | 'other',
    details: Record<string, any>
): Promise<void> {
    try {
        const userId = sessionStorage.getItem('userId')
        const orgId = sessionStorage.getItem('orgId')

        if (!userId || !orgId) return

        const { error } = await supabase
            .from('audit_log')
            .insert({
                organization_id: orgId,
                user_id: userId,
                action_type: actionType,
                action_details: details,
                account_id: details.account_id || '',
                account_name: details.account_name || '',
                field: details.field || 'N/A',
                previous_value: details.previous_value || 0,
                new_value: details.new_value || 0
            })

        if (error) {
            console.error('Error logging action:', error)
        }
    } catch (error) {
        console.error('Error in logAction:', error)
    }
}
