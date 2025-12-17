"use client"

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function AuthCallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code')
            const type = searchParams.get('type') // 'recovery', 'signup', etc.
            const next = searchParams.get('next') || '/dashboard'

            const urlError = searchParams.get('error')
            const errorDescription = searchParams.get('error_description')
            const errorCode = searchParams.get('error_code')

            // Handle errors directly from URL
            if (urlError || errorDescription || errorCode) {
                const errorMsg = errorDescription || 'Erro na autenticação'
                setError(errorMsg)

                // If it's a recovery flow error, redirect to reset-password with error
                if (type === 'recovery') {
                    router.push(`/reset-password?error=${urlError || ''}&error_description=${encodeURIComponent(errorDescription || '')}&error_code=${errorCode || ''}`)
                }
                return
            }

            if (code) {
                try {
                    const { error } = await supabase.auth.exchangeCodeForSession(code)
                    if (error) throw error

                    // If recovery, redirect to reset password page
                    if (type === 'recovery') {
                        router.push('/reset-password')
                    } else {
                        router.push(next)
                    }
                } catch (err: any) {
                    console.error('Callback error:', err)
                    setError(err.message || 'Erro ao processar login')

                    if (type === 'recovery') {
                        router.push(`/reset-password?error=exchange_error&error_description=${encodeURIComponent(err.message)}`)
                    }
                }
            } else {
                // If no code, check if we have a session (hash based implicit flow support)
                // or just redirect
                const { data: { session } } = await supabase.auth.getSession()
                if (session) {
                    if (type === 'recovery') {
                        router.push('/reset-password')
                    } else {
                        router.push(next)
                    }
                } else {
                    router.push('/')
                }
            }
        }

        handleCallback()
    }, [searchParams, router])

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <div className="bg-red-50 text-red-800 p-4 rounded-md max-w-md w-full text-center border border-red-200">
                    <h3 className="font-bold mb-2">Erro na Autenticação</h3>
                    <p>{error}</p>
                    <button
                        className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md text-sm font-medium transition-colors"
                        onClick={() => router.push('/')}
                    >
                        Voltar ao Início
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center flex-col gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-slate-600 font-medium">Verificando segurança...</span>
        </div>
    )
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center flex-col gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-slate-600 font-medium">Carregando autenticação...</span>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    )
}
