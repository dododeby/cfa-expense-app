import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key to bypass RLS
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
        const { fullName, cpf, email, craId } = await request.json()

        if (!fullName || !cpf || !email || !craId) {
            return NextResponse.json(
                { error: 'Dados incompletos' },
                { status: 400 }
            )
        }

        console.log('🔵 [REGISTER] Processing registration for:', email)

        const cleanedCpf = cpf.replace(/\D/g, '')
        const cleanedEmail = email.toLowerCase()

        // Delete any previous registration requests (bypasses RLS)
        console.log('🔵 [REGISTER] Cleaning up old requests...')
        await supabaseAdmin
            .from('user_registration_requests')
            .delete()
            .eq('email', cleanedEmail)

        await supabaseAdmin
            .from('user_registration_requests')
            .delete()
            .eq('cpf', cleanedCpf)

        console.log('✅ [REGISTER] Old requests cleaned up')

        // Insert new registration request
        console.log('🔵 [REGISTER] Inserting new request...')
        const { error: insertError } = await supabaseAdmin
            .from('user_registration_requests')
            .insert({
                full_name: fullName,
                cpf: cleanedCpf,
                email: cleanedEmail,
                requested_cra_id: craId,
                status: 'pending'
            })

        if (insertError) {
            console.error('🔴 [REGISTER] Insert error:', insertError)
            return NextResponse.json(
                { error: 'Erro ao enviar solicitação' },
                { status: 500 }
            )
        }

        console.log('✅ [REGISTER] Registration request created successfully')

        return NextResponse.json({
            success: true,
            message: 'Solicitação enviada com sucesso'
        })

    } catch (error) {
        console.error('🔴 [REGISTER] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
