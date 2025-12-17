"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function ResetPasswordPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [linkError, setLinkError] = useState<string | null>(null)

    // Check for errors in URL (from Supabase callback)
    useEffect(() => {
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        const errorCode = searchParams.get('error_code')

        if (errorParam || errorCode) {
            if (errorCode === 'otp_expired') {
                setLinkError('O link de recuperação expirou. Por favor, solicite um novo link.')
            } else if (errorDescription) {
                setLinkError(decodeURIComponent(errorDescription.replace(/\+/g, ' ')))
            } else {
                setLinkError('Link inválido. Por favor, solicite um novo link de recuperação.')
            }
        }
    }, [searchParams])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        // Validation
        if (!newPassword || !confirmPassword) {
            setError("Por favor, preencha todos os campos")
            return
        }

        if (newPassword.length < 6) {
            setError("A senha deve ter no mínimo 6 caracteres")
            return
        }

        if (newPassword !== confirmPassword) {
            setError("As senhas não coincidem")
            return
        }

        setLoading(true)

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (updateError) {
                setError("Erro ao atualizar senha. Tente novamente.")
                setLoading(false)
                return
            }

            setSuccess(true)
        } catch (err) {
            setError("Erro inesperado. Tente novamente.")
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
                <Card className="w-full max-w-md border-green-200 bg-white shadow-xl">
                    <CardHeader className="text-center pb-4">
                        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-green-900">Senha Alterada!</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-slate-700 text-lg">
                            Sua senha foi atualizada com sucesso.
                        </p>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-green-800 font-medium">
                                Você já pode fazer login com a nova senha
                            </p>
                        </div>
                        <Button
                            onClick={() => router.push('/')}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            Ir para Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Show error state if link is invalid/expired  
    if (linkError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
                <Card className="w-full max-w-md border-red-200 bg-white shadow-xl">
                    <CardHeader className="text-center pb-4">
                        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-red-900">Link Inválido ou Expirado</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800 text-sm">
                                {linkError}
                            </p>
                        </div>
                        <p className="text-slate-700">
                            Os links de recuperação expiram após um período de tempo por questões de segurança.
                        </p>
                        <div className="space-y-2">
                            <Button
                                onClick={() => router.push('/forgot-password')}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                                Solicitar Novo Link
                            </Button>
                            <Button
                                onClick={() => router.push('/')}
                                variant="outline"
                                className="w-full"
                            >
                                Voltar para Login
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
            <Card className="w-full max-w-md border-blue-200 bg-white shadow-xl">
                <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                        <Lock className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-blue-900">Redefinir Senha</CardTitle>
                    <p className="text-slate-600 text-sm mt-2">
                        Digite sua nova senha
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* New Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                Nova Senha
                            </label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    className="w-full pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                Confirmar Senha
                            </label>
                            <div className="relative">
                                <Input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repita sua senha"
                                    className="w-full pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        {/* Info Box */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                                <strong>Dica:</strong> Escolha uma senha forte com pelo menos 6 caracteres.
                            </p>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6"
                        >
                            {loading ? "Atualizando..." : "Atualizar Senha"}
                        </Button>

                        {/* Links */}
                        <div className="text-center pt-2">
                            <Link href="/" className="text-sm text-blue-600 hover:text-blue-700">
                                Voltar para Login
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
