"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { loadOrganizations } from "@/lib/expense-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react"

interface Organization {
    id: string
    name: string
}

interface DeclarationSummary {
    orgId: string
    orgName: string
    status: 'pending' | 'delivered'
    type?: 'original' | 'rectification'
    rectificationCount?: number
    deliveryDate?: string
    receiptNumber?: string
}

export default function CfaOverview() {
    const [loading, setLoading] = useState(true)
    const [summary, setSummary] = useState<DeclarationSummary[]>([])

    useEffect(() => {
        const load = async () => {
            // 1. Load All Organizations
            const orgs = await loadOrganizations()

            // 2. Load All Declarations (latest per org)
            const { data: declarations } = await supabase
                .from('declarations')
                .select('*')
                .order('delivery_date', { ascending: false })

            // 3. Process Data
            const processed: DeclarationSummary[] = orgs
                .filter(org => org.id !== 'CFA') // Exclude CFA itself if desired, or keep it. User said "todos os status dos cras"
                .map(org => {
                    // Find latest declaration for this org
                    const latestDec = declarations?.find(d => d.organization_id === org.id)

                    if (latestDec) {
                        return {
                            orgId: org.id,
                            orgName: org.name,
                            status: 'delivered',
                            type: latestDec.is_rectification ? 'rectification' : 'original',
                            rectificationCount: latestDec.rectification_count,
                            deliveryDate: latestDec.delivery_date,
                            receiptNumber: latestDec.receipt_number
                        }
                    } else {
                        return {
                            orgId: org.id,
                            orgName: org.name,
                            status: 'pending'
                        }
                    }
                })

            setSummary(processed)
            setLoading(false)
        }
        load()
    }, [])

    if (loading) {
        return <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </div>
    }

    const deliveredCount = summary.filter(s => s.status === 'delivered').length
    const pendingCount = summary.filter(s => s.status === 'pending').length

    return (
        <Card>
            <CardHeader>
                <CardTitle>Visão Geral das Entregas (CFA)</CardTitle>
                <CardDescription>
                    Acompanhamento em tempo real da entrega das declarações pelos Regionais.
                </CardDescription>
                <div className="flex gap-4 pt-4">
                    <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">{deliveredCount} Entregues</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-amber-600 border-amber-200">{pendingCount} Pendentes</Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Regional</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Data da Entrega</TableHead>
                            <TableHead>Recibo</TableHead>
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
                                    ) : (
                                        <div className="flex items-center text-amber-600 gap-2">
                                            <Clock className="h-4 w-4" />
                                            <span>Pendente</span>
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {item.status === 'delivered' ? (
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
                                    {item.status === 'delivered' && item.deliveryDate
                                        ? new Date(item.deliveryDate).toLocaleString('pt-BR')
                                        : '-'}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                    {item.receiptNumber || '-'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
