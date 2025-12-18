"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { logAuditAction } from "@/lib/audit-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, XCircle, Clock, Loader2, Building2, User, Mail, CreditCard, MoreVertical } from "lucide-react"
import { useRouter } from "next/navigation"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface RegistrationRequest {
    id: string
    full_name: string
    cpf: string
    email: string
    requested_cra_id: string
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
    reviewed_at: string | null
}

interface User {
    id: string
    email: string
    full_name: string
    organization_id: string
    role: string
    status?: string
    created_at: string
}

export default function CadastrosPage() {
    const router = useRouter()
    const [requests, setRequests] = useState<RegistrationRequest[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)
    const [error, setError] = useState("")

    useEffect(() => {
        loadRequests()
        loadUsers()
    }, [])

    const loadRequests = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('user_registration_requests')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            setError("Erro ao carregar solicitações")
            console.error(error)
        } else {
            setRequests(data || [])
        }
        setLoading(false)
    }

    const loadUsers = async () => {
        try {
            const response = await fetch('/api/admin/get-users')
            const result = await response.json()

            if (!response.ok) {
                console.error('Error loading users:', result.error)
                return
            }

            setUsers(result.users || [])
        } catch (error) {
            console.error('Error loading users:', error)
        }
    }

    const handleSuspend = async (user: User) => {
        const action = user.status === 'suspended' ? 'reativar' : 'suspender'
        if (!confirm(`Deseja ${action} o usuário ${user.full_name}?`)) return

        setProcessing(user.id)
        try {
            const response = await fetch('/api/admin/suspend-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    suspend: user.status !== 'suspended'
                })
            })

            const result = await response.json()

            if (!response.ok) {
                setError(result.error || 'Erro ao atualizar usuário')
                setProcessing(null)
                return
            }

            // Log audit action
            await logAuditAction({
                actionType: user.status !== 'suspended' ? 'user_suspended' : 'user_reactivated',
                actionDetails: { targetUserName: user.full_name, targetUserEmail: user.email }
            })

            alert(result.message)
            loadUsers()
        } catch (err) {
            setError('Erro ao processar solicitação')
        } finally {
            setProcessing(null)
        }
    }

    const handleDelete = async (user: User) => {
        if (!confirm(`ATENÇÃO: Deseja excluir permanentemente o usuário ${user.full_name}?\n\nOs dados de despesas/receitas criados por este usuário serão PRESERVADOS.`)) return

        setProcessing(user.id)
        try {
            const response = await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    userEmail: user.email
                })
            })

            const result = await response.json()

            if (!response.ok) {
                setError(result.error || 'Erro ao excluir usuário')
                setProcessing(null)
                return
            }

            // Log audit action
            await logAuditAction({
                actionType: 'user_deleted',
                actionDetails: { targetUserName: user.full_name, targetUserEmail: user.email }
            })

            alert(result.message)
            loadUsers()
        } catch (err) {
            setError('Erro ao processar solicitação')
        } finally {
            setProcessing(null)
        }
    }

    const handleApprove = async (request: RegistrationRequest) => {
        console.log('🟦 [CLIENT] handleApprove called for:', request.full_name)

        if (!confirm(`Aprovar cadastro de ${request.full_name}?`)) {
            console.log('🟨 [CLIENT] User cancelled approval')
            return
        }

        console.log('🟦 [CLIENT] Setting processing state...')
        setProcessing(request.id)
        setError("")

        try {
            console.log('🟦 [CLIENT] Making fetch request to API...')
            const response = await fetch('/api/admin/approve-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: request.id,
                    email: request.email,
                    fullName: request.full_name,
                    cpf: request.cpf,
                    craId: request.requested_cra_id
                })
            })

            console.log('🟦 [CLIENT] Received response, status:', response.status)
            const result = await response.json()
            console.log('🟦 [CLIENT] Response data:', result)

            if (!response.ok) {
                console.log('🔴 [CLIENT] Response not OK:', result.error)
                setError(result.error || "Erro ao aprovar cadastro")
                setProcessing(null)
                return
            }

            console.log('✅ [CLIENT] Approval successful!')

            // Log audit action
            await logAuditAction({
                actionType: 'user_approved',
                actionDetails: { targetUserName: request.full_name, targetUserEmail: request.email, craId: request.requested_cra_id }
            })

            alert(`Cadastro aprovado!\n\nUm e-mail de redefinição de senha foi enviado para ${request.email}.`)
            loadRequests()
        } catch (err) {
            console.error('🔴 [CLIENT] Exception caught:', err)
            setError("Erro ao processar solicitação")
        } finally {
            console.log('🟦 [CLIENT] Clearing processing state')
            setProcessing(null)
        }
    }

    const handleReject = async (request: RegistrationRequest) => {
        const reason = prompt(`Rejeitar cadastro de ${request.full_name}?\n\nMotivo (opcional):`)
        if (reason === null) return // User cancelled

        setProcessing(request.id)
        setError("")

        try {
            const response = await fetch('/api/admin/reject-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: request.id,
                    reason: reason || "Não especificado"
                })
            })

            const result = await response.json()

            if (!response.ok) {
                setError(result.error || "Erro ao rejeitar cadastro")
                setProcessing(null)
                return
            }

            alert("Cadastro rejeitado")
            loadRequests()
        } catch (err) {
            setError("Erro ao processar solicitação")
        } finally {
            setProcessing(null)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatCPF = (cpf: string) => {
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            approved: 'bg-green-100 text-green-800 border-green-200',
            rejected: 'bg-red-100 text-red-800 border-red-200'
        }
        const labels = {
            pending: 'Pendente',
            approved: 'Aprovado',
            rejected: 'Rejeitado'
        }
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
                {labels[status as keyof typeof labels]}
            </span>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    const pendingRequests = requests.filter(r => r.status === 'pending')

    return (
        <div className="p-6 space-y-6">
            <Card className="border-blue-200">
                <CardHeader>
                    <CardTitle className="text-2xl text-blue-900 flex items-center gap-2">
                        <User className="h-6 w-6" />
                        Gerenciar Cadastros
                    </CardTitle>
                    <p className="text-slate-600 text-sm mt-2">
                        Aprovar ou rejeitar solicitações de cadastro de usuários
                    </p>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {/* Pending Requests */}
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-yellow-600" />
                            Solicitações Pendentes ({pendingRequests.length})
                        </h3>
                        {pendingRequests.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Nenhuma solicitação pendente
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>CPF</TableHead>
                                            <TableHead>E-mail</TableHead>
                                            <TableHead>CRA</TableHead>
                                            <TableHead>Data</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingRequests.map(request => (
                                            <TableRow key={request.id}>
                                                <TableCell className="font-medium">{request.full_name}</TableCell>
                                                <TableCell className="font-mono text-sm">{formatCPF(request.cpf)}</TableCell>
                                                <TableCell>{request.email}</TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center gap-1 text-sm">
                                                        <Building2 className="h-3 w-3" />
                                                        {request.requested_cra_id.toUpperCase()}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-600">
                                                    {formatDate(request.created_at)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleApprove(request)}
                                                            disabled={processing === request.id}
                                                            className="bg-green-600 hover:bg-green-700 text-white"
                                                        >
                                                            {processing === request.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                                    Aprovar
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleReject(request)}
                                                            disabled={processing === request.id}
                                                            className="border-red-300 text-red-700 hover:bg-red-50"
                                                        >
                                                            <XCircle className="h-4 w-4 mr-1" />
                                                            Rejeitar
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>

                    {/* Active Users */}
                    {users.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <User className="h-5 w-5 text-blue-600" />
                                Usuários Ativos ({users.length})
                            </h3>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>CRA</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Data Criação</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.map(user => (
                                            <TableRow key={user.id} className={user.status === 'suspended' ? 'bg-red-50' : ''}>
                                                <TableCell className="font-medium">{user.full_name}</TableCell>
                                                <TableCell>{user.email}</TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center gap-1 text-sm">
                                                        <Building2 className="h-3 w-3" />
                                                        {user.organization_id.toUpperCase()}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {user.status === 'suspended' ? (
                                                        <span className="px-3 py-1 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">
                                                            Suspenso
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                                                            Ativo
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-600">
                                                    {formatDate(user.created_at)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {user.email === 'cfa@admin.com' ? (
                                                                <DropdownMenuItem disabled className="text-slate-400">
                                                                    Usuário protegido
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleSuspend(user)}
                                                                        disabled={processing === user.id}
                                                                        className="cursor-pointer"
                                                                    >
                                                                        {user.status === 'suspended' ? (
                                                                            <>
                                                                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                                                                Reativar
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <XCircle className="mr-2 h-4 w-4 text-orange-600" />
                                                                                Suspender
                                                                            </>
                                                                        )}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDelete(user)}
                                                                        disabled={processing === user.id}
                                                                        className="cursor-pointer text-red-600 focus:text-red-600"
                                                                    >
                                                                        <XCircle className="mr-2 h-4 w-4" />
                                                                        Excluir
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )
                    }
                </CardContent >
            </Card >
        </div >
    )
}
