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
        console.log('🔵 [APPROVE] Starting approval process...')
        const { requestId, email, fullName, cpf, craId } = await request.json()

        console.log('🔵 [APPROVE] Received data:', { requestId, email, fullName, cpf, craId })

        if (!requestId || !email || !fullName || !craId) {
            console.log('🔴 [APPROVE] Missing required fields')
            return NextResponse.json(
                { error: 'Dados incompletos' },
                { status: 400 }
            )
        }

        // Verify the request exists and is pending
        console.log('🔵 [APPROVE] Fetching registration request from DB...')
        const { data: registrationRequest, error: fetchError } = await supabaseAdmin
            .from('user_registration_requests')
            .select('*')
            .eq('id', requestId)
            .eq('status', 'pending')
            .single()

        if (fetchError || !registrationRequest) {
            console.log('🔴 [APPROVE] Request not found or already processed:', fetchError)
            return NextResponse.json(
                { error: 'Solicitação não encontrada ou já processada' },
                { status: 404 }
            )
        }

        console.log('✅ [APPROVE] Registration request found:', registrationRequest)

        // Check if user already exists in Auth (from previous deletion that may have failed)
        console.log('🔵 [APPROVE] Checking for existing Auth user with this email...')

        try {
            // Try to get user by email - more reliable than listing all users
            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
            const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

            if (existingUser) {
                console.log('⚠️ [APPROVE] Found existing Auth user (ID: ' + existingUser.id + '), deleting it first...')

                // Delete from users table FIRST to avoid FK constraint
                console.log('🔵 [APPROVE] Deleting from users table...')
                await supabaseAdmin.from('users').delete().eq('id', existingUser.id)
                console.log('✅ [APPROVE] Deleted from users table')

                // Now delete from Auth
                const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id)

                if (deleteError) {
                    console.error('🔴 [APPROVE] Error deleting existing user:', deleteError)
                    // Try to continue anyway
                } else {
                    console.log('✅ [APPROVE] Existing Auth user deleted successfully')
                    // Wait a moment for deletion to propagate
                    await new Promise(resolve => setTimeout(resolve, 500))
                }
            } else {
                console.log('✅ [APPROVE] No existing Auth user found with this email')
            }
        } catch (cleanupError) {
            console.error('⚠️ [APPROVE] Error during Auth cleanup (will try to continue):', cleanupError)
        }

        // Check for other requests with same email/cpf to clean them up
        console.log('🔵 [APPROVE] Cleaning up old requests...')
        const { error: cleanupError } = await supabaseAdmin
            .from('user_registration_requests')
            .delete()
            .or(`email.eq.${email},cpf.eq.${cpf}`)
            .neq('id', requestId) // Don't delete the current request

        if (cleanupError) {
            console.log('⚠️ [APPROVE] Error processing cleanup (non-critical):', cleanupError)
        }

        // Create user with temporary default password
        const defaultPassword = 'CFA@2025temp'
        console.log('🔵 [APPROVE] Creating auth user with temporary password...')

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: defaultPassword,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                cpf: cpf,
                password_change_required: true,
                organization_id: craId // Add metadata directly
            }
        })

        if (authError) {
            console.error('🔴 [APPROVE] Auth creation error:', authError)
            return NextResponse.json(
                { error: `Erro ao criar usuário: ${authError.message}` },
                { status: 500 }
            )
        }

        console.log('✅ [APPROVE] Auth user created:', authData.user.id)

        // Insert or update user profile (upsert to handle reapproval)
        console.log('🔵 [APPROVE] Creating/updating user profile...')
        const { error: profileError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: authData.user.id, // FIXED: was using undefined authUserId
                email: email,
                full_name: fullName,
                organization_id: craId,
                role: 'user',
                status: 'active'
            }, {
                onConflict: 'id'
            })

        if (profileError) {
            console.error('🔴 [APPROVE] Profile creation error - FULL DETAILS:', {
                message: profileError.message,
                code: profileError.code,
                details: profileError.details,
                hint: profileError.hint
            })
            // Rollback: delete the auth user
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
            return NextResponse.json(
                { error: `Erro ao criar perfil do usuário: ${profileError.message}` },
                { status: 500 }
            )
        }

        console.log('✅ [APPROVE] User profile created')

        // Update registration request status
        console.log('🔵 [APPROVE] Updating registration request status...')
        const { error: updateError } = await supabaseAdmin
            .from('user_registration_requests')
            .update({
                status: 'approved',
                reviewed_at: new Date().toISOString()
            })
            .eq('id', requestId)

        if (updateError) {
            console.error('🔴 [APPROVE] Update error:', updateError)
        } else {
            console.log('✅ [APPROVE] Registration request updated to approved')
        }

        // Automatically send password reset email
        console.log('🔵 [APPROVE] Sending automatic password reset email...')

        // We use resetPasswordForEmail which actually sends the email
        // Get origin from request to support both localhost and production
        const origin = request.nextUrl.origin
        const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
            redirectTo: `${origin}/auth/callback?type=recovery`
        })

        if (resetError) {
            console.error('🔴 [APPROVE] Error investigating password reset email:', resetError)
            // Don't fail the approval, just log the error
        } else {
            console.log('✅ [APPROVE] Password reset email sent successfully')
        }

        // Log the approval action for audit trail
        console.log('🔵 [APPROVE] Recording audit log...')
        const cookieStore = await cookies()
        const authCookie = cookieStore.get('sb-access-token')

        // Get current user info for audit log
        const { data: { user: currentUser } } = await supabaseAdmin.auth.getUser(
            authCookie?.value || ''
        )

        if (currentUser) {
            await supabaseAdmin.from('user_actions_log').insert({
                action_type: 'approve',
                target_user_id: authData.user.id,
                target_user_email: email,
                target_user_name: fullName,
                performed_by_id: currentUser.id,
                performed_by_email: currentUser.email || 'unknown',
                details: {
                    cra: craId,
                    cpf: cpf
                }
            })
            console.log('✅ [APPROVE] Audit log recorded')
        }

        console.log('🎉 [APPROVE] Approval process completed successfully!')
        return NextResponse.json({
            success: true,
            message: `Usuário ${fullName} aprovado com sucesso! Email de redefinição de senha enviado.`
        })

    } catch (error) {
        console.error('🔴 [APPROVE] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
