import { supabase } from './supabase'

export interface LegislationDocument {
    id: string
    file_name: string
    file_path: string
    description: string
    display_order: number
    uploaded_by: string
    uploaded_at: string
    updated_at: string
}

/**
 * List all legislation documents ordered by display_order
 */
export async function listDocuments(): Promise<LegislationDocument[]> {
    try {
        const { data, error } = await supabase
            .from('legislation_documents')
            .select('*')
            .order('display_order', { ascending: true })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error listing documents:', error)
        return []
    }
}

/**
 * Upload a document to Supabase Storage and create database record
 */
export async function uploadDocument(
    file: File,
    description: string,
    uploadedBy: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Validate file type
        if (file.type !== 'application/pdf') {
            return { success: false, error: 'Apenas arquivos PDF são permitidos' }
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            return { success: false, error: 'Arquivo muito grande. Máximo: 10MB' }
        }

        // Generate unique file path
        const timestamp = Date.now()
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filePath = `${timestamp}_${sanitizedFileName}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('legislation')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            })

        if (uploadError) throw uploadError

        // Get the highest display_order
        const { data: maxOrderData } = await supabase
            .from('legislation_documents')
            .select('display_order')
            .order('display_order', { ascending: false })
            .limit(1)

        const nextOrder = maxOrderData && maxOrderData.length > 0
            ? maxOrderData[0].display_order + 1
            : 0

        // Create database record
        const { error: dbError } = await supabase
            .from('legislation_documents')
            .insert([{
                file_name: file.name,
                file_path: filePath,
                description: description || '',
                display_order: nextOrder,
                uploaded_by: uploadedBy
            }])

        if (dbError) {
            // Rollback: delete uploaded file
            await supabase.storage.from('legislation').remove([filePath])
            throw dbError
        }

        return { success: true }
    } catch (error: any) {
        console.error('Error uploading document:', error)
        return { success: false, error: error.message || 'Erro ao fazer upload' }
    }
}

/**
 * Delete a document from storage and database
 */
export async function deleteDocument(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Get document info
        const { data: doc, error: fetchError } = await supabase
            .from('legislation_documents')
            .select('file_path')
            .eq('id', id)
            .single()

        if (fetchError) throw fetchError
        if (!doc) return { success: false, error: 'Documento não encontrado' }

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('legislation')
            .remove([doc.file_path])

        if (storageError) throw storageError

        // Delete from database
        const { error: dbError } = await supabase
            .from('legislation_documents')
            .delete()
            .eq('id', id)

        if (dbError) throw dbError

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting document:', error)
        return { success: false, error: error.message || 'Erro ao excluir documento' }
    }
}

/**
 * Reorder documents
 */
export async function reorderDocuments(
    newOrder: { id: string; order: number }[]
): Promise<{ success: boolean; error?: string }> {
    try {
        // Update each document's display_order
        const updates = newOrder.map(({ id, order }) =>
            supabase
                .from('legislation_documents')
                .update({ display_order: order, updated_at: new Date().toISOString() })
                .eq('id', id)
        )

        await Promise.all(updates)

        return { success: true }
    } catch (error: any) {
        console.error('Error reordering documents:', error)
        return { success: false, error: error.message || 'Erro ao reordenar documentos' }
    }
}

/**
 * Get public URL for a document
 */
export function getDocumentUrl(filePath: string): string {
    const { data } = supabase.storage
        .from('legislation')
        .getPublicUrl(filePath)

    return data.publicUrl
}
