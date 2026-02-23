"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, BarChart3, Printer, Lock, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function RelatoriosPage() {
    const router = useRouter()
    const [orgType, setOrgType] = useState('')
    const [hasDeclaration, setHasDeclaration] = useState(false)
    const [loadingStatus, setLoadingStatus] = useState(true)

    useEffect(() => {
        const init = async () => {
            setOrgType(sessionStorage.getItem('orgType') || '')
            const orgId = sessionStorage.getItem('orgId') || ''

            if (orgId) {
                const { data } = await supabase
                    .from('declarations')
                    .select('id')
                    .eq('organization_id', orgId)
                    .order('delivery_date', { ascending: false })
                    .limit(1)
                    .single()

                setHasDeclaration(!!data)
            }
            setLoadingStatus(false)
        }
        init()
    }, [])

    const handlePrintFormal = (type: string) => {
        router.push(`/dashboard/relatorios/imprimir/${type}`)
    }

    const handlePrintDashboard = (type: string) => {
        router.push(`/dashboard/dashboards/${type}?print=true`)
    }

    // Recibo disponível se: CFA ou já entregou a declaração
    const isCFA = orgType === 'CFA'
    const reciboDisponivel = isCFA || hasDeclaration

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Relatórios e Impressões</h1>
                <p className="text-slate-500 mt-1">
                    Central de emissão de relatórios oficiais e impressões de painéis gerenciais.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Seção 1: Relatórios Formais */}
                <Card className="border-l-4 border-l-blue-600">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                            Relatórios Formais (PDF)
                        </CardTitle>
                        <CardDescription>
                            Relatórios oficiais com cabeçalho do sistema, CNPJ, logo do CFA/CRA e campo para assinatura dos responsáveis. Ideal para prestação de contas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <Button
                            variant="outline"
                            className="justify-start h-14"
                            onClick={() => handlePrintFormal('receitas')}
                        >
                            <Printer className="mr-4 h-5 w-5 text-slate-500" />
                            <div className="text-left">
                                <div className="font-semibold text-slate-700">Relatório de Receitas</div>
                                <div className="text-xs text-slate-500">Detalhado por conta contábil</div>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            className="justify-start h-14"
                            onClick={() => handlePrintFormal('despesas')}
                        >
                            <Printer className="mr-4 h-5 w-5 text-slate-500" />
                            <div className="text-left">
                                <div className="font-semibold text-slate-700">Relatório de Despesas</div>
                                <div className="text-xs text-slate-500">Detalhado por natureza de despesa</div>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            className="justify-start h-14"
                            onClick={() => handlePrintFormal('comparativo')}
                        >
                            <Printer className="mr-4 h-5 w-5 text-slate-500" />
                            <div className="text-left">
                                <div className="font-semibold text-slate-700">Relatório Comparativo</div>
                                <div className="text-xs text-slate-500">Receitas x Despesas</div>
                            </div>
                        </Button>

                        {/* Recibo de Entrega — condicional ao status */}
                        {loadingStatus ? (
                            <div className="h-14 rounded-md border border-slate-200 bg-slate-50 flex items-center px-4 text-sm text-slate-400 animate-pulse">
                                Verificando status...
                            </div>
                        ) : reciboDisponivel ? (
                            <Button
                                variant="outline"
                                className="justify-start h-14 border-green-300 hover:border-green-400 hover:bg-green-50"
                                onClick={() => handlePrintFormal('recibo')}
                            >
                                <div className="flex items-center gap-4 w-full">
                                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                    <div className="text-left">
                                        <div className="font-semibold text-slate-700">Recibo de Entrega</div>
                                        <div className="text-xs text-green-600 font-medium">
                                            Declaração entregue — Comprovante disponível
                                        </div>
                                    </div>
                                </div>
                            </Button>
                        ) : (
                            <div className="h-14 rounded-md border border-slate-200 bg-slate-50/80 flex items-center px-4 gap-4 cursor-not-allowed">
                                <Lock className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                <div className="text-left">
                                    <div className="font-semibold text-slate-400">Recibo de Entrega</div>
                                    <div className="text-xs text-slate-400">
                                        Disponível somente após a entrega da declaração
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Seção 2: Impressão de Dashboards */}
                <Card className="border-l-4 border-l-emerald-600">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-emerald-600" />
                            Impressão de Painéis (Dashboards)
                        </CardTitle>
                        <CardDescription>
                            Versão para impressão dos gráficos e indicadores gerenciais. Sem formatação oficial, ideal para reuniões internas e acompanhamento visual.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <Button
                            variant="outline"
                            className="justify-start h-14 hover:border-emerald-200 hover:bg-emerald-50"
                            onClick={() => handlePrintDashboard('receitas')}
                        >
                            <Printer className="mr-4 h-5 w-5 text-emerald-600" />
                            <div className="text-left">
                                <div className="font-semibold text-slate-700">Painel de Receitas</div>
                                <div className="text-xs text-slate-500">Gráficos de arrecadação</div>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            className="justify-start h-14 hover:border-emerald-200 hover:bg-emerald-50"
                            onClick={() => handlePrintDashboard('despesas')}
                        >
                            <Printer className="mr-4 h-5 w-5 text-emerald-600" />
                            <div className="text-left">
                                <div className="font-semibold text-slate-700">Painel de Despesas</div>
                                <div className="text-xs text-slate-500">Gráficos de execução de despesa</div>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            className="justify-start h-14 hover:border-emerald-200 hover:bg-emerald-50"
                            onClick={() => handlePrintDashboard('comparativo')}
                        >
                            <Printer className="mr-4 h-5 w-5 text-emerald-600" />
                            <div className="text-left">
                                <div className="font-semibold text-slate-700">Painel Comparativo</div>
                                <div className="text-xs text-slate-500">Visão geral do resultado</div>
                            </div>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
