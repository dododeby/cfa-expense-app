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
    account_name: string
    action_details: any
}

const ACTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    expense_update: { label: "Despesa Atualizada", color: "bg-blue-100 text-blue-800" },
    message_sent: { label: "Mensagem Enviada", color: "bg-green-100 text-green-800" },
    message_read: { label: "Mensagem Lida", color: "bg-slate-100 text-slate-800" },
    responsible_update: { label: "Responsáveis Atualizados", color: "bg-purple-100 text-purple-800" },
    pdf_generated: { label: "PDF Gerado", color: "bg-orange-100 text-orange-800" },
    login: { label: "Login", color: "bg-indigo-100 text-indigo-800" },
    logout: { label: "Logout", color: "bg-slate-100 text-slate-800" },
    other: { label: "Outra Ação", color: "bg-gray-100 text-gray-800" }
}

export default function AuditHistory() {
    const [loading, setLoading] = useState(true)
    const [entries, setEntries] = useState<AuditEntry[]>([])
    const [filterType, setFilterType] = useState<string>('all')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 20

    useEffect(() => {
        loadAuditLog()
    }, [filterType])

    const loadAuditLog = async () => {
        setLoading(true)
        try {
            const orgId = sessionStorage.getItem('orgId')
            if (!orgId) return

            let query = supabase
                .from('audit_log')
                .select('*')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false })
                .limit(100) // Limit to last 100 entries

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

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle>Histórico de Alterações</CardTitle>
                        <CardDescription>
                            Registro completo de todas as ações realizadas no sistema
                        </CardDescription>
                    </div>

                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filtrar por tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Ações</SelectItem>
                            <SelectItem value="expense_update">Despesas</SelectItem>
                            <SelectItem value="message_sent">Mensagens Enviadas</SelectItem>
                            <SelectItem value="message_read">Mensagens Lidas</SelectItem>
                            <SelectItem value="responsible_update">Responsáveis</SelectItem>
                            <SelectItem value="pdf_generated">PDFs Gerados</SelectItem>
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
                                                <TableCell>
                                                    <Badge className={typeInfo.color}>
                                                        {typeInfo.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-600">
                                                    {entry.account_name || 'N/A'}
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
