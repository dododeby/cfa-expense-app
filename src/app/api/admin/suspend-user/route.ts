import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Initialize Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

export async function POST(request: NextRequest) {
    try {
        const { userId, suspend } = await request.json()

        if (!userId || suspend === undefined) {
            return NextResponse.json(
                { error: 'Dados incompletos' },
                { status: 400 }
            )
        }

        console.log(`🔵 [SUSPEND] ${suspend ? 'Suspending' : 'Reactivating'} user:`, userId)

        // Update user status in database
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                status: suspend ? 'suspended' : 'active',
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)

        if (updateError) {
            console.error('🔴 [SUSPEND] Error updating user status:', updateError)
            return NextResponse.json(
                { error: `Erro ao atualizar status: ${updateError.message} - ${updateError.details || ''}` },
                { status: 500 }
            )
        }

        console.log(`✅ [SUSPEND] User ${suspend ? 'suspended' : 'reactivated'} successfully`)

        // Get user info for audit log
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('email, full_name')
            .eq('id', userId)
            .single()

        // Log the action for audit trail
        const cookieStore = await cookies()
        const authCookie = cookieStore.get('sb-access-token')
        const { data: { user: currentUser } } = await supabaseAdmin.auth.getUser(
            authCookie?.value || ''
        )

        if (currentUser && userData) {
            await supabaseAdmin.from('user_actions_log').insert({
                action_type: suspend ? 'suspend' : 'reactivate',
                target_user_id: userId,
                target_user_email: userData.email,
                target_user_name: userData.full_name,
                performed_by_id: currentUser.id,
                performed_by_email: currentUser.email || 'unknown',
                details: {}
            })
        }

        return NextResponse.json({
            success: true,
            message: suspend ? 'Usuário suspenso com sucesso' : 'Usuário reativado com sucesso'
        })

    } catch (error) {
        console.error('🔴 [SUSPEND] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
