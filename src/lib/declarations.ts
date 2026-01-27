import { supabase } from './supabase'

export interface Declaration {
    id: string
    organization_id: string
    organization_name: string
    receipt_number: string
    delivery_date: string
    is_rectification: boolean
    rectification_count: number
    total_revenue: number
    total_expense: number
    total_finalistica: number
    total_apoio: number
    snapshot: any
    responsible_unit_name?: string
    responsible_unit_cra?: string
    responsible_data_name?: string
    responsible_data_role?: string
    responsible_data_doc_type?: string
    responsible_data_doc_number?: string
}

export async function loadDeclaration(): Promise<Declaration | null> {
    const orgId = sessionStorage.getItem('orgId')
    if (!orgId) return null

    const { data, error } = await supabase
        .from('declarations')
        .select('*')
        .eq('organization_id', orgId)
        .order('delivery_date', { ascending: false })
        .limit(1)
        .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error loading declaration:', error)
    }

    return data
}

export async function submitDeclaration(
    totals: { revenue: number; expense: number; finalistica: number; apoio: number },
    snapshot: any,
    responsible: {
        unitName: string,
        unitCra: string,
        dataName: string,
        dataRole: string,
        dataDocType?: string,
        dataDocNumber?: string
    },
    isRectification: boolean = false
): Promise<Declaration | null> {
    const orgId = sessionStorage.getItem('orgId')
    const orgName = sessionStorage.getItem('orgName')
    if (!orgId || !orgName) return null

    // Enforce Deadline
    const deadline = new Date('2026-03-31T23:59:59')
    if (new Date() > deadline) {
        throw new Error('Prazo encerrado.')
    }

    // Generate simplified receipt number (hash-based or sequential if possible, here using hash/random for demo)
    // In production, this might be a database sequence
    const getReceiptNumber = () => {
        const prefix = new Date().getFullYear()
        const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
        // const hash = Math.abs(orgName.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0))
        return `${prefix}.${random}`
    }

    // Check previous declaration for rectification count
    let rectCount = 0
    if (isRectification) {
        const last = await loadDeclaration()
        if (last) {
            rectCount = (last.rectification_count || 0) + 1
        }
    }

    const { data, error } = await supabase
        .from('declarations')
        .insert({
            organization_id: orgId,
            organization_name: orgName,
            receipt_number: getReceiptNumber(),
            is_rectification: isRectification,
            rectification_count: rectCount,
            total_revenue: totals.revenue,
            total_expense: totals.expense,
            total_finalistica: totals.finalistica,
            total_apoio: totals.apoio,
            snapshot: snapshot,

            responsible_unit_name: responsible.unitName,
            responsible_unit_cra: responsible.unitCra,
            responsible_data_name: responsible.dataName,
            responsible_data_role: responsible.dataRole,
            responsible_data_doc_type: responsible.dataDocType,
            responsible_data_doc_number: responsible.dataDocNumber,

            delivery_date: new Date().toISOString()
        })
        .select()
        .single()

    if (error) {
        console.error('Error submitting declaration:', error)
        throw error
    }

    return data
}
