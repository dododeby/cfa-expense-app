import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json(
                { error: 'Email é obrigatório' },
                { status: 400 }
            )
        }

        console.log('🔵 [CLEANUP_AUTH] Cleaning Auth user for email:', email)

        // List ALL users and find by email
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

        if (listError) {
            console.error('🔴 [CLEANUP_AUTH] Error listing users:', listError)
            return NextResponse.json(
                { error: 'Erro ao listar usuários' },
                { status: 500 }
            )
        }

        const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

        if (!existingUser) {
            console.log('✅ [CLEANUP_AUTH] No Auth user found with this email')
            return NextResponse.json({
                success: true,
                message: 'Nenhum usuário encontrado no Auth com este email',
                cleaned: false
            })
        }

        console.log('⚠️ [CLEANUP_AUTH] Found Auth user:', existingUser.id)

        // Delete the Auth user
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id)

        if (deleteError) {
            console.error('🔴 [CLEANUP_AUTH] Error deleting:', deleteError)
            return NextResponse.json(
                { error: 'Erro ao deletar usuário do Auth: ' + deleteError.message },
                { status: 500 }
            )
        }

        console.log('✅ [CLEANUP_AUTH] Auth user deleted successfully')

        return NextResponse.json({
            success: true,
            message: 'Usuário deletado do Auth com sucesso',
            cleaned: true,
            userId: existingUser.id
        })

    } catch (error) {
        console.error('🔴 [CLEANUP_AUTH] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
