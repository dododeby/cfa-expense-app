"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react"

interface AuditEntry {
    id: string
    created_at: string
    action_type: string
    user_id: string
    user_name: string
    account_name: string
    action_details: any
}

const ACTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    // Data updates
    expense_update: { label: "Despesa Atualizada", color: "bg-blue-100 text-blue-800" },
    revenue_update: { label: "Receita Atualizada", color: "bg-cyan-100 text-cyan-800" },

    // Communication
    message_sent: { label: "Mensagem Enviada", color: "bg-green-100 text-green-800" },
    message_read: { label: "Mensagem Lida", color: "bg-slate-100 text-slate-800" },

    // Configuration
    responsible_update: { label: "Responsáveis Atualizados", color: "bg-purple-100 text-purple-800" },

    // Reports
    report_generated: { label: "Relatório Gerado", color: "bg-orange-100 text-orange-800" },
    pdf_generated: { label: "PDF Gerado", color: "bg-orange-100 text-orange-800" },

    // User Management (CFA)
    user_approved: { label: "Usuário Aprovado", color: "bg-emerald-100 text-emerald-800" },
    user_suspended: { label: "Usuário Suspenso", color: "bg-yellow-100 text-yellow-800" },
    user_deleted: { label: "Usuário Excluído", color: "bg-red-100 text-red-800" },
    user_reactivated: { label: "Usuário Reativado", color: "bg-teal-100 text-teal-800" },

    // Legislation (CFA)
    legislation_uploaded: { label: "Legislação Adicionada", color: "bg-indigo-100 text-indigo-800" },
    legislation_deleted: { label: "Legislação Removida", color: "bg-rose-100 text-rose-800" },

    // System
    login: { label: "Login", color: "bg-indigo-100 text-indigo-800" },
    logout: { label: "Logout", color: "bg-slate-100 text-slate-800" },
    other: { label: "Outra Ação", color: "bg-gray-100 text-gray-800" }
}

export default function AuditHistory() {
    const [loading, setLoading] = useState(true)
    const [entries, setEntries] = useState<AuditEntry[]>([])
    const [filterType, setFilterType] = useState<string>('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [orgType, setOrgType] = useState<string>('')
    const itemsPerPage = 20

    useEffect(() => {
        const type = sessionStorage.getItem('orgType') || ''
        setOrgType(type)
        loadAuditLog()
    }, [filterType])

    const loadAuditLog = async () => {
        setLoading(true)
        try {
            const orgId = sessionStorage.getItem('orgId')
            const orgType = sessionStorage.getItem('orgType')
            if (!orgId) return

            let query = supabase
                .from('audit_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200) // Increased limit for better history

            // CFA sees all logs, CRAs see only their organization
            if (orgType !== 'CFA') {
                query = query.eq('organization_id', orgId)
            }

            if (filterType !== 'all') {
                query = query.eq('action_type', filterType)
            }

            const { data, error } = await query

            if (error) throw error

            setEntries(data || [])
        } catch (error) {
            console.error('Error loading audit log:', error)
        } finally {
            setLoading(false)
        }
    }

    const paginatedEntries = entries.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const totalPages = Math.ceil(entries.length / itemsPerPage)

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getDetailsText = (entry: AuditEntry) => {
        const details = entry.action_details || {}

        switch (entry.action_type) {
            case 'user_approved':
            case 'user_suspended':
            case 'user_deleted':
            case 'user_reactivated':
                return details.targetUserName || details.userName || 'Usuário'

            case 'report_generated':
            case 'pdf_generated':
                return details.reportType || details.type || 'Relatório'

            case 'legislation_uploaded':
            case 'legislation_deleted':
                return details.fileName || details.documentName || 'Documento'

            case 'expense_update':
            case 'revenue_update':
                return entry.account_name || 'Conta'

            case 'message_sent':
                return details.recipient || 'Mensagem'

            default:
                return entry.account_name || 'N/A'
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle>Histórico de Alterações</CardTitle>
                        <CardDescription>
                            Registro completo de todas as ações realizadas no sistema
                            {orgType === 'CFA' && ' (todas as organizações)'}
                        </CardDescription>
                    </div>

                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Filtrar por tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Ações</SelectItem>
                            <SelectItem value="expense_update">Despesas</SelectItem>
                            <SelectItem value="revenue_update">Receitas</SelectItem>
                            <SelectItem value="message_sent">Mensagens Enviadas</SelectItem>
                            <SelectItem value="message_read">Mensagens Lidas</SelectItem>
                            <SelectItem value="responsible_update">Responsáveis</SelectItem>
                            <SelectItem value="report_generated">Relatórios</SelectItem>
                            <SelectItem value="user_approved">Aprovações</SelectItem>
                            <SelectItem value="user_suspended">Suspensões</SelectItem>
                            <SelectItem value="user_deleted">Exclusões</SelectItem>
                            <SelectItem value="legislation_uploaded">Legislação</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        Nenhum registro encontrado
                    </div>
                ) : (
                    <>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data/Hora</TableHead>
                                        <TableHead>Usuário</TableHead>
                                        <TableHead>Tipo de Ação</TableHead>
                                        <TableHead>Detalhes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedEntries.map((entry) => {
                                        const typeInfo = ACTION_TYPE_LABELS[entry.action_type] || ACTION_TYPE_LABELS.other
                                        return (
                                            <TableRow key={entry.id}>
                                                <TableCell className="text-sm">
                                                    {formatDate(entry.created_at)}
                                                </TableCell>
                                                <TableCell className="text-sm font-medium">
                                                    {entry.user_name || 'Sistema'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={typeInfo.color}>
                                                        {typeInfo.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-600">
                                                    {getDetailsText(entry)}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                                <p className="text-sm text-slate-600">
                                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, entries.length)} de {entries.length} registros
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
