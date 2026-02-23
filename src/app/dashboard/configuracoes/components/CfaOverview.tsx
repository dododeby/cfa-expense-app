"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { loadOrganizations } from "@/lib/expense-data"
import { cfaUnlockRectification } from "@/lib/declarations"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, Clock, RotateCcw, Loader2, AlertTriangle } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DeclarationSummary {
    orgId: string
    orgName: string
    status: 'pending' | 'delivered' | 'draft'
    type?: 'original' | 'rectification'
    rectificationCount?: number
    deliveryDate?: string
    receiptNumber?: string
    declarationId?: string
}

export default function CfaOverview() {
    const [loading, setLoading] = useState(true)
    const [summary, setSummary] = useState<DeclarationSummary[]>([])
    const [unlockTarget, setUnlockTarget] = useState<DeclarationSummary | null>(null)
    const [unlocking, setUnlocking] = useState(false)
    const [unlockSuccess, setUnlockSuccess] = useState<string | null>(null)

    const load = async () => {
        setLoading(true)
        // 1. Load All Organizations
        const orgs = await loadOrganizations()

        // 2. Load All Declarations (latest per org)
        const { data: declarations } = await supabase
            .from('declarations')
            .select('*')
            .order('delivery_date', { ascending: false })

        // 3. Process Data — keep only the latest declaration per org
        const latestByOrg = new Map<string, any>()
        declarations?.forEach(d => {
            if (!latestByOrg.has(d.organization_id)) {
                latestByOrg.set(d.organization_id, d)
            }
        })

        const processed: DeclarationSummary[] = orgs
            .filter(org => org.type !== 'CFA') // Show only CRAs
            .map(org => {
                const latestDec = latestByOrg.get(org.id)

                if (latestDec && latestDec.status === 'submitted') {
                    return {
                        orgId: org.id,
                        orgName: org.name,
                        status: 'delivered' as const,
                        type: (latestDec.is_rectification ? 'rectification' : 'original') as 'original' | 'rectification',
                        rectificationCount: latestDec.rectification_count,
                        deliveryDate: latestDec.delivery_date,
                        receiptNumber: latestDec.receipt_number,
                        declarationId: latestDec.id
                    }
                } else if (latestDec && latestDec.status === 'draft') {
                    return {
                        orgId: org.id,
                        orgName: org.name,
                        status: 'draft' as const,
                        type: (latestDec.is_rectification ? 'rectification' : 'original') as 'original' | 'rectification',
                        rectificationCount: latestDec.rectification_count,
                        deliveryDate: latestDec.delivery_date,
                        receiptNumber: latestDec.receipt_number,
                        declarationId: latestDec.id
                    }
                } else {
                    return {
                        orgId: org.id,
                        orgName: org.name,
                        status: 'pending' as const
                    }
                }
            })
            // Sort: delivered first, then draft, then pending
            .sort((a, b) => {
                const order: Record<string, number> = { delivered: 0, draft: 1, pending: 2 }
                return order[a.status] - order[b.status]
            })

        setSummary(processed)
        setLoading(false)
    }

    useEffect(() => {
        load()
    }, [])

    const handleUnlockConfirm = async () => {
        if (!unlockTarget) return
        setUnlocking(true)
        try {
            const success = await cfaUnlockRectification(unlockTarget.orgId)
            if (success) {
                setUnlockSuccess(unlockTarget.orgName)
                setUnlockTarget(null)
                // Reload to reflect new status
                await load()
            }
        } catch (e) {
            console.error('Unlock error:', e)
        } finally {
            setUnlocking(false)
        }
    }

    if (loading) {
        return <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </div>
    }

    const deliveredCount = summary.filter(s => s.status === 'delivered').length
    const pendingCount = summary.filter(s => s.status === 'pending').length
    const draftCount = summary.filter(s => s.status === 'draft').length

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Visão Geral das Entregas (CFA)</CardTitle>
                    <CardDescription>
                        Acompanhamento em tempo real da entrega das declarações pelos Regionais.
                        Use o botão <strong>Liberar Retificação</strong> para permitir que um CRA realize uma nova retificadora mesmo após o prazo.
                    </CardDescription>
                    <div className="flex flex-wrap gap-3 pt-4">
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            {deliveredCount} Entregues
                        </Badge>
                        {draftCount > 0 && (
                            <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
                                {draftCount} Retificação Liberada
                            </Badge>
                        )}
                        <Badge variant="outline" className="text-amber-600 border-amber-200">
                            {pendingCount} Pendentes
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {unlockSuccess && (
                        <div className="mb-4 flex items-center gap-2 p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span>
                                Retificação liberada com sucesso para <strong>{unlockSuccess}</strong>.
                                O CRA poderá retificar e reenviar a declaração.
                            </span>
                            <button
                                className="ml-auto text-blue-400 hover:text-blue-600 text-xs underline"
                                onClick={() => setUnlockSuccess(null)}
                            >
                                Fechar
                            </button>
                        </div>
                    )}

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Regional</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Data da Entrega</TableHead>
                                <TableHead>Recibo</TableHead>
                                <TableHead className="text-right">Ação CFA</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {summary.map((item) => (
                                <TableRow key={item.orgId}>
                                    <TableCell className="font-medium">{item.orgName}</TableCell>
                                    <TableCell>
                                        {item.status === 'delivered' ? (
                                            <div className="flex items-center text-green-600 gap-2">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span>Entregue</span>
                                            </div>
                                        ) : item.status === 'draft' ? (
                                            <div className="flex items-center text-blue-600 gap-2">
                                                <RotateCcw className="h-4 w-4" />
                                                <span>Retificação Liberada</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-amber-600 gap-2">
                                                <Clock className="h-4 w-4" />
                                                <span>Pendente</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {item.status !== 'pending' ? (
                                            item.type === 'rectification' ? (
                                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                                                    Retificadora ({item.rectificationCount})
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-slate-50">Original</Badge>
                                            )
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {item.deliveryDate
                                            ? new Date(item.deliveryDate).toLocaleString('pt-BR')
                                            : '-'}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {item.receiptNumber || '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {/* Show "Liberar Retificação" only if org has a delivered (submitted) declaration */}
                                        {item.status === 'delivered' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-blue-700 border-blue-300 hover:bg-blue-50 hover:border-blue-400"
                                                onClick={() => setUnlockTarget(item)}
                                            >
                                                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                                Liberar Retificação
                                            </Button>
                                        )}
                                        {item.status === 'draft' && (
                                            <span className="text-xs text-blue-500 italic">
                                                Aguardando retificação
                                            </span>
                                        )}
                                        {item.status === 'pending' && (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Confirm Unlock Dialog */}
            <AlertDialog open={!!unlockTarget} onOpenChange={(open) => { if (!open) setUnlockTarget(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Liberar Retificação
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <p>
                                Você está prestes a liberar uma nova retificação para:
                            </p>
                            <p className="font-semibold text-slate-800 text-base">
                                {unlockTarget?.orgName}
                            </p>
                            <p>
                                O status da declaração deste regional será alterado para <strong>Pendente</strong>,
                                permitindo que eles realizem alterações e reenviem a declaração.
                            </p>
                            <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 text-sm mt-2">
                                Esta ação não tem prazo — o regional poderá retificar e reenviar a qualquer momento após a liberação.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={unlocking}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleUnlockConfirm}
                            disabled={unlocking}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {unlocking ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                            Confirmar Liberação
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
