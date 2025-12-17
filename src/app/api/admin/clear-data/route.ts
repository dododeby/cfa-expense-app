import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with SERVICE ROLE permissions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

export async function POST() {
    try {
        console.log('🗑️  Iniciando limpeza de dados...')

        // Delete ALL expenses
        const { error: expensesError } = await supabaseAdmin
            .from('expenses')
            .delete()
            .neq('organization_id', 'impossible-value') // Delete all rows

        if (expensesError) {
            console.error('Erro ao deletar expenses:', expensesError)
            return NextResponse.json({
                success: false,
                error: 'Falha ao deletar despesas: ' + expensesError.message
            }, { status: 500 })
        }

        // Delete ALL revenues
        const { error: revenuesError } = await supabaseAdmin
            .from('revenues')
            .delete()
            .neq('organization_id', 'impossible-value') // Delete all rows

        if (revenuesError) {
            console.error('Erro ao deletar revenues:', revenuesError)
            return NextResponse.json({
                success: false,
                error: 'Falha ao deletar receitas: ' + revenuesError.message
            }, { status: 500 })
        }

        console.log('✅ Todos os dados foram deletados com sucesso!')

        return NextResponse.json({
            success: true,
            message: 'Todos os dados de despesas e receitas foram removidos com sucesso.'
        })
    } catch (error) {
        console.error('Erro ao limpar dados:', error)
        return NextResponse.json({
            success: false,
            error: 'Erro interno do servidor'
        }, { status: 500 })
    }
}
