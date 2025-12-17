import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with SERVICE ROLE permissions to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

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
            return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
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
