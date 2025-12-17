"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!email || !password) {
            setError("Preencha email e senha")
            return
        }

        setLoading(true)

        try {
            // Autenticar com Supabase
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (authError) throw authError

            // Buscar dados do usuário
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('organization_id, status, organizations(id, name, type, estado)')
                .eq('id', authData.user.id)
                .single()

            if (userError) throw userError

            // Verificar se usuário está suspenso
            if (userData.status === 'suspended') {
                await supabase.auth.signOut()
                throw new Error('Sua conta está suspensa. Entre em contato com o CFA.')
            }

            if (userError) throw userError

            // Armazenar informações na sessão
            const org = userData.organizations as any
            sessionStorage.setItem('userId', authData.user.id)
            sessionStorage.setItem('userEmail', authData.user.email || '')
            sessionStorage.setItem('orgType', org.type)
            sessionStorage.setItem('orgId', org.id)
            sessionStorage.setItem('orgName', org.name)

            // Redirecionar para dashboard
            router.push('/dashboard')
        } catch (err: any) {
            console.error('Login error:', err)
            setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        {/* Logo */}
                        <div className="flex justify-center">
                            <img
                                src="/logo-cfa.png"
                                alt="CFA - Conselho Federal de Administração"
                                className="h-20 w-auto"
                            />
                        </div>
                        <div className="text-sm text-slate-500 font-medium mt-2">
                            Sistema de Consolidação das Contas Públicas CFA/CRA's<br />DN TCU 216/2025
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                autoComplete="email"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••"
                                autoComplete="current-password"
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
                            disabled={loading}
                        >
                            {loading ? "Entrando..." : "Entrar"}
                        </Button>
                    </form>

                    {/* Links */}
                    <div className="space-y-2 text-center text-sm">
                        <a
                            href="/forgot-password"
                            className="text-blue-600 hover:text-blue-700 block"
                        >
                            Esqueci/Mudar Senha
                        </a>
                        <a
                            href="/register"
                            className="text-blue-600 hover:text-blue-700 block font-medium"
                        >
                            Solicitar Cadastro
                        </a>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-xs text-slate-500 pt-4">
                        Acesso restrito aos Conselhos Federal e Regionais<br />de Administração
                    </div>
                </div>
            </div>
        </div>
    )
}
