import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key
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
        const { requestId, reason } = await request.json()

        if (!requestId) {
            return NextResponse.json(
                { error: 'ID da solicitação não fornecido' },
                { status: 400 }
            )
        }

        // Update registration request status to rejected
        const { error: updateError } = await supabaseAdmin
            .from('user_registration_requests')
            .update({
                status: 'rejected',
                reviewed_at: new Date().toISOString(),
                rejection_reason: reason || 'Não especificado'
            })
            .eq('id', requestId)
            .eq('status', 'pending') // Only update if still pending

        if (updateError) {
            console.error('Rejection error:', updateError)
            return NextResponse.json(
                { error: 'Erro ao rejeitar solicitação' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Solicitação rejeitada com sucesso'
        })

    } catch (error) {
        console.error('Rejection error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
