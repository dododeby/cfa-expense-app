import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
    try {
        console.log('🔵 [DIAGNOSTIC] Running diagnostic check...')

        const diagnosticReport: any = {
            timestamp: new Date().toISOString(),
            environment: {
                NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
                SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
            },
            checks: {}
        }

        // Check if Service Role Key is placeholder
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'placeholder') {
            diagnosticReport.checks.serviceKey = {
                status: 'FAILED',
                message: 'SUPABASE_SERVICE_ROLE_KEY is missing or using placeholder value'
            }
            console.error('🔴 [DIAGNOSTIC] Service Role Key check FAILED')
            return NextResponse.json({
                success: false,
                error: 'Missing Service Role Key',
                report: diagnosticReport
            }, { status: 500 })
        }

        diagnosticReport.checks.serviceKey = {
            status: 'PASSED',
            message: 'Service Role Key is configured'
        }

        // Test database connection
        console.log('🔵 [DIAGNOSTIC] Testing database connection...')
        const { data: orgs, error: orgsError } = await supabaseAdmin
            .from('organizations')
            .select('id, name')
            .limit(1)

        if (orgsError) {
            diagnosticReport.checks.databaseConnection = {
                status: 'FAILED',
                message: 'Database query failed',
                error: orgsError.message,
                code: orgsError.code
            }
            console.error('🔴 [DIAGNOSTIC] Database connection FAILED:', orgsError)
            return NextResponse.json({
                success: false,
                error: 'Database connection failed',
                report: diagnosticReport
            }, { status: 500 })
        }

        diagnosticReport.checks.databaseConnection = {
            status: 'PASSED',
            message: 'Successfully queried database',
            sampleData: orgs?.[0] || null
        }

        // Test user_registration_requests table
        console.log('🔵 [DIAGNOSTIC] Testing user_registration_requests table...')
        const { data: requests, error: requestsError } = await supabaseAdmin
            .from('user_registration_requests')
            .select('id, status')
            .limit(1)

        if (requestsError) {
            diagnosticReport.checks.registrationTable = {
                status: 'FAILED',
                message: 'Cannot access user_registration_requests table',
                error: requestsError.message,
                code: requestsError.code
            }
            console.error('🔴 [DIAGNOSTIC] Registration table check FAILED:', requestsError)
        } else {
            diagnosticReport.checks.registrationTable = {
                status: 'PASSED',
                message: 'user_registration_requests table accessible'
            }
        }

        // Test users table
        console.log('🔵 [DIAGNOSTIC] Testing users table...')
        const { data: users, error: usersError } = await supabaseAdmin
            .from('users')
            .select('id, email')
            .limit(1)

        if (usersError) {
            diagnosticReport.checks.usersTable = {
                status: 'FAILED',
                message: 'Cannot access users table',
                error: usersError.message,
                code: usersError.code
            }
            console.error('🔴 [DIAGNOSTIC] Users table check FAILED:', usersError)
        } else {
            diagnosticReport.checks.usersTable = {
                status: 'PASSED',
                message: 'users table accessible',
                userCount: users?.length || 0
            }
        }

        console.log('✅ [DIAGNOSTIC] All checks completed')

        return NextResponse.json({
            success: true,
            message: 'Diagnostic completed successfully',
            report: diagnosticReport
        })

    } catch (error) {
        console.error('🔴 [DIAGNOSTIC] Unexpected error:', error)
        return NextResponse.json({
            success: false,
            error: 'Diagnostic failed with unexpected error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}
