import { supabase } from './supabase'

export interface ResponsibleData {
    unitResponsibleName: string
    unitResponsibleCraNumber: string
    dataResponsibleName: string
    dataResponsibleRole: string
    dataResponsibleDocType: 'CRC' | 'CRA' | 'CPF' | 'Outro'
    dataResponsibleDocNumber: string
    cnpj?: string // Add CNPJ field
}

/**
 * Load responsible persons data for an organization
 */
export async function loadResponsibleData(orgId: string): Promise<ResponsibleData | null> {
    try {
        // Parallel fetch: Responsible Persons + Organization CNPJ
        const [respResult, orgResult] = await Promise.all([
            supabase
                .from('responsible_persons')
                .select('*')
                .eq('organization_id', orgId)
                .single(),
            supabase
                .from('organizations')
                .select('cnpj')
                .eq('id', orgId)
                .single()
        ])

        const { data, error } = respResult
        const { data: orgData } = orgResult

        // Initialize default or fetched data
        const result: ResponsibleData = {
            unitResponsibleName: '',
            unitResponsibleCraNumber: '',
            dataResponsibleName: '',
            dataResponsibleRole: '',
            dataResponsibleDocType: 'CRC',
            dataResponsibleDocNumber: '',
            cnpj: orgData?.cnpj || ''
        }

        if (data) {
            result.unitResponsibleName = data.unit_responsible_name
            result.unitResponsibleCraNumber = data.unit_responsible_cra_number
            result.dataResponsibleName = data.data_responsible_name
            result.dataResponsibleRole = data.data_responsible_role
            result.dataResponsibleDocType = data.data_responsible_doc_type
            result.dataResponsibleDocNumber = data.data_responsible_doc_number
        }

        return result

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

        // 1. Update Organization CNPJ
        if (data.cnpj !== undefined) {
            const { error: orgError } = await supabase
                .from('organizations')
                .update({ cnpj: data.cnpj })
                .eq('id', orgId)

            if (orgError) throw orgError
        }

        // 2. Upsert Responsible Persons
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
        console.error('Error saving responsible data:', JSON.stringify(error, null, 2))
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
            console.error('Error logging action:', JSON.stringify(error, null, 2))
        }
    } catch (error) {
        console.error('Error in logAction:', error)
    }
}
