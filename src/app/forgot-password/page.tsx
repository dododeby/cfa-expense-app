"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, KeyRound, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (!email) {
            setError("Por favor, informe seu e-mail")
            return
        }

        setLoading(true)

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `https://cfa-consolida.vercel.app/auth/callback?type=recovery`
            })

            if (resetError) {
                console.error("Reset error:", resetError)
                setError(`Erro: ${resetError.message || "Falha ao enviar e-mail"}`)
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
                            <Mail className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-green-900">E-mail Enviado!</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-slate-700">
                            Enviamos um link para redefinição de senha para:
                        </p>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-green-800 font-medium">{email}</p>
                        </div>
                        <p className="text-sm text-slate-600">
                            Verifique sua caixa de entrada e siga as instruções para criar uma nova senha.
                        </p>
                        <Button
                            onClick={() => router.push('/')}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            Voltar para Login
                        </Button>
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
                        <KeyRound className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-blue-900">Esqueci/Mudar Senha</CardTitle>
                    <p className="text-slate-600 text-sm mt-2">
                        Informe seu e-mail para receber instruções de recuperação
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                E-mail
                            </label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="w-full"
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6"
                        >
                            {loading ? "Enviando..." : "Enviar Link de Recuperação"}
                        </Button>

                        {/* Back to Login */}
                        <div className="text-center pt-2">
                            <Link
                                href="/"
                                className="text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Voltar para Login
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
