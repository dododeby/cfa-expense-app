import { supabase } from './supabase'

export interface Message {
    id: string;
    from: string;
    to: string;
    message: string;
    timestamp: string;
    type: 'cra_to_cfa' | 'cfa_to_cras';
    read: boolean;
}

/**
 * Load messages for current user
 */
export async function loadMessages(): Promise<Message[]> {
    try {
        const orgId = sessionStorage.getItem('orgId')
        const orgType = sessionStorage.getItem('orgType')

        if (!orgId) return []

        let query = supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false })

        // CRA vê mensagens do CFA e suas próprias
        if (orgType === 'CRA') {
            query = query.or(`type.eq.cfa_to_cras,and(type.eq.cra_to_cfa,sender_org.eq.${orgId})`)
        }
        // CFA vê todas as mensagens

        const { data, error } = await query

        if (error) throw error

        return data?.map(row => ({
            id: row.id,
            from: row.sender_org,
            to: row.recipient_org || 'all',
            message: row.content,
            timestamp: row.created_at,
            type: row.type as 'cra_to_cfa' | 'cfa_to_cras',
            read: row.read || false
        })) || []
    } catch (error) {
        console.error('Error loading messages:', error)
        return []
    }
}

/**
 * Send a message
 */
export async function sendMessage(message: string, type: 'cra_to_cfa' | 'cfa_to_cras'): Promise<void> {
    try {
        const orgId = sessionStorage.getItem('orgId')
        if (!orgId) throw new Error('No organization ID')

        const { error } = await supabase
            .from('messages')
            .insert({
                sender_org: orgId,
                recipient_org: type === 'cra_to_cfa' ? 'cfa' : 'all', // 'all' for broadcast
                content: message,
                type,
                read: false
            })

        if (error) throw error
    } catch (error) {
        console.error('Error sending message:', error)
        throw error
    }
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('messages')
            .update({ read: true })
            .eq('id', messageId)

        if (error) throw error
    } catch (error) {
        console.error('Error marking message as read:', error)
    }
}
