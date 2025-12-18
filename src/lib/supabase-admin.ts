import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'

// Validate environment variables
if (!process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseServiceKey === 'placeholder') {
    console.error('🔴 [SUPABASE-ADMIN] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set!')
    console.error('🔴 [SUPABASE-ADMIN] Admin operations will fail. Please set this environment variable in Vercel.')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl === 'https://placeholder.supabase.co') {
    console.error('🔴 [SUPABASE-ADMIN] CRITICAL: NEXT_PUBLIC_SUPABASE_URL is not set!')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})
