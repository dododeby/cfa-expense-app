"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, BarChart3, Printer } from "lucide-react"
import { useRouter } from "next/navigation"

export default function RelatoriosPage() {
    const router = useRouter()
    const [orgType, setOrgType] = useState('')

    useEffect(() => {
        setOrgType(sessionStorage.getItem('orgType') || '')
    }, [])

    const handlePrintFormal = (type: string) => {
        // Navigate to the printable view
        router.push(`/dashboard/relatorios/imprimir/${type}`)
    }

    const handlePrintDashboard = (type: string) => {
        // Navigate to dashboard with print intent (could be query param or specific print page)
        // For now, mapping to existing dashboards which user requested to just be "like the dashboard tab"
        router.push(`/dashboard/dashboards/${type}?print=true`)
    }

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

                        <Button
                            variant="outline"
                            className="justify-start h-14"
                            onClick={() => handlePrintFormal('recibo')}
                        >
                            <Printer className="mr-4 h-5 w-5 text-slate-500" />
                            <div className="text-left">
                                <div className="font-semibold text-slate-700">Recibo de Entrega</div>
                                <div className="text-xs text-slate-500">Comprovante de envio anual</div>
                            </div>
                        </Button>
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
