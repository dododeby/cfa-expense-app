import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
    try {
        console.log('🔵 [GET_USERS] Fetching all users...')

        // Query ALL users from all organizations (bypassing RLS)
        const { data: users, error: usersError } = await supabaseAdmin
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })

        if (usersError) {
            console.error('🔴 [GET_USERS] Error loading users:', usersError)
            console.error('🔴 [GET_USERS] Error details:', {
                message: usersError.message,
                code: usersError.code,
                details: usersError.details,
                hint: usersError.hint
            })
            return NextResponse.json({
                error: 'Failed to load users',
                details: usersError.message
            }, { status: 500 })
        }

        console.log(`✅ [GET_USERS] Loaded ${users?.length || 0} users`)

        return NextResponse.json({
            success: true,
            users: users || []
        })

    } catch (error) {
        console.error('🔴 [GET_USERS] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
