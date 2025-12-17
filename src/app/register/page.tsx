"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Building2, User, CreditCard, Mail, Lock, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        fullName: "",
        cpf: "",
        email: "",
        craId: ""
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    // List of CRAs
    const cras = [
        { id: 'cra-ac', name: 'CRA-AC' }, { id: 'cra-al', name: 'CRA-AL' },
        { id: 'cra-am', name: 'CRA-AM' }, { id: 'cra-ap', name: 'CRA-AP' },
        { id: 'cra-ba', name: 'CRA-BA' }, { id: 'cra-ce', name: 'CRA-CE' },
        { id: 'cra-df', name: 'CRA-DF' }, { id: 'cra-es', name: 'CRA-ES' },
        { id: 'cra-go', name: 'CRA-GO' }, { id: 'cra-ma', name: 'CRA-MA' },
        { id: 'cra-mg', name: 'CRA-MG' }, { id: 'cra-ms', name: 'CRA-MS' },
        { id: 'cra-mt', name: 'CRA-MT' }, { id: 'cra-pa', name: 'CRA-PA' },
        { id: 'cra-pb', name: 'CRA-PB' }, { id: 'cra-pe', name: 'CRA-PE' },
        { id: 'cra-pi', name: 'CRA-PI' }, { id: 'cra-pr', name: 'CRA-PR' },
        { id: 'cra-rj', name: 'CRA-RJ' }, { id: 'cra-rn', name: 'CRA-RN' },
        { id: 'cra-ro', name: 'CRA-RO' }, { id: 'cra-rr', name: 'CRA-RR' },
        { id: 'cra-rs', name: 'CRA-RS' }, { id: 'cra-sc', name: 'CRA-SC' },
        { id: 'cra-se', name: 'CRA-SE' }, { id: 'cra-sp', name: 'CRA-SP' },
        { id: 'cra-to', name: 'CRA-TO' }
    ]

    const validateCPF = (cpf: string) => {
        const cleaned = cpf.replace(/\D/g, '')
        return cleaned.length === 11
    }

    const formatCPF = (value: string) => {
        const cleaned = value.replace(/\D/g, '')
        if (cleaned.length <= 11) {
            return cleaned
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        }
        return value
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        // Validation
        if (!formData.fullName || !formData.cpf || !formData.email || !formData.craId) {
            setError("Por favor, preencha todos os campos")
            return
        }

        if (!validateCPF(formData.cpf)) {
            setError("CPF inválido. Deve conter 11 dígitos")
            return
        }

        setLoading(true)

        try {
            // Call server-side API to bypass RLS
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fullName: formData.fullName,
                    cpf: formData.cpf.replace(/\D/g, ''),
                    email: formData.email.toLowerCase(),
                    craId: formData.craId
                })
            })

            const result = await response.json()

            if (!response.ok) {
                setError(result.error || "Erro ao enviar solicitação. Tente novamente.")
                setLoading(false)
                return
            }

            setSuccess(true)
        } catch (err) {
            console.error("Unexpected error:", err)
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
                            <UserPlus className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-green-900">Cadastro Concluído!</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-slate-700 text-lg">
                            Sua solicitação foi enviada com sucesso.
                        </p>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-green-800 font-medium">
                                Aguardando validação do CFA
                            </p>
                            <p className="text-sm text-green-700 mt-2">
                                Após a aprovação do CFA, você receberá um e-mail com um link seguro para definir sua senha e completar seu cadastro no sistema.
                            </p>
                        </div>
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
                        <UserPlus className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-blue-900">Registrar um novo membro</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* CRA Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                CRA
                            </label>
                            <Select
                                value={formData.craId}
                                onValueChange={(value) => setFormData({ ...formData, craId: value })}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecione o CRA" />
                                </SelectTrigger>
                                <SelectContent>
                                    {cras.map(cra => (
                                        <SelectItem key={cra.id} value={cra.id}>{cra.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Full Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Nome completo
                            </label>
                            <Input
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                placeholder="Seu nome completo"
                                className="w-full"
                            />
                        </div>

                        {/* CPF */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                CPF
                            </label>
                            <Input
                                type="text"
                                value={formData.cpf}
                                onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                                placeholder="000.000.000-00"
                                maxLength={14}
                                className="w-full"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Email
                            </label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="seu@email.com"
                                className="w-full"
                            />
                        </div>

                        {/* Info about password */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                                <strong>Nota:</strong> Após a aprovação do cadastro pelo CFA, você receberá um e-mail com instruções para definir sua senha.
                            </p>
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
                            {loading ? "Enviando..." : "Registrar"}
                        </Button>

                        {/* Links */}
                        <div className="text-center space-y-2 pt-2">
                            <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 block">
                                Já sou um membro
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div >
    )
}
