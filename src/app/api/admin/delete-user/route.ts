import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
    try {
        const { userId, userEmail } = await request.json()

        if (!userId) {
            return NextResponse.json(
                { error: 'Dados incompletos' },
                { status: 400 }
            )
        }

        console.log('🔵 [DELETE] Deleting user:', userId, userEmail)

        // Get user info BEFORE deleting for audit log
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('email, full_name')
            .eq('id', userId)
            .single()

        // Prevent deleting the protected admin user
        if (userData?.email === 'cfa@admin.com') {
            console.log('🔴 [DELETE] Attempted to delete protected admin user')
            return NextResponse.json(
                { error: 'O usuário cfa@admin.com não pode ser excluído' },
                { status: 403 }
            )
        }

        // Log the deletion action BEFORE actually deleting
        const cookieStore = await cookies()
        const authCookie = cookieStore.get('sb-access-token')
        const { data: { user: currentUser } } = await supabaseAdmin.auth.getUser(
            authCookie?.value || ''
        )

        if (currentUser && userData) {
            await supabaseAdmin.from('user_actions_log').insert({
                action_type: 'delete',
                target_user_id: userId,
                target_user_email: userData.email,
                target_user_name: userData.full_name,
                performed_by_id: currentUser.id,
                performed_by_email: currentUser.email || 'unknown',
                details: {}
            })
            console.log('✅ [DELETE] Audit log recorded')
        }

        // Delete user from database (maintains expenses/revenues data - Opção B)
        console.log('🔵 [DELETE] Removing user from all tables...')

        // Get user's organization_id before deleting
        const { data: userOrgData } = await supabaseAdmin
            .from('users')
            .select('organization_id')
            .eq('id', userId)
            .single()

        // Delete from responsible_persons table using organization_id
        if (userOrgData?.organization_id) {
            console.log('🔵 [DELETE] Cleaning up responsible_persons...')
            await supabaseAdmin
                .from('responsible_persons')
                .delete()
                .eq('organization_id', userOrgData.organization_id)

            console.log('✅ [DELETE] Responsible persons cleaned up')
        }

        // Delete any registration requests with this email
        // This allows the email to be reused for new registrations
        console.log('🔵 [DELETE] Cleaning up registration requests...')
        await supabaseAdmin
            .from('user_registration_requests')
            .delete()
            .eq('email', userEmail)

        console.log('✅ [DELETE] Registration requests cleaned up')

        // Delete user profile
        const { error: profileError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', userId)

        if (profileError) {
            console.error('🔴 [DELETE] Error deleting user profile:', profileError)
            return NextResponse.json(
                { error: 'Erro ao deletar perfil do usuário' },
                { status: 500 }
            )
        }

        console.log('✅ [DELETE] User profile deleted from database')

        // Delete user from Supabase Auth
        console.log('🔵 [DELETE] Removing user from authentication...')
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (authError) {
            console.error('🔴 [DELETE] Error deleting auth user:', authError)
            // Continue anyway - profile already deleted
        } else {
            console.log('✅ [DELETE] User removed from authentication')
        }

        console.log('🎉 [DELETE] User deletion completed successfully!')
        console.log('📝 [DELETE] Note: User data (expenses/revenues) was preserved for audit purposes')
        console.log('✅ [DELETE] Email can now be reused for new registrations')

        return NextResponse.json({
            success: true,
            message: 'Usuário excluído com sucesso. Dados de despesas/receitas foram preservados. Email disponível para reutilização.'
        })

    } catch (error) {
        console.error('🔴 [DELETE] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
