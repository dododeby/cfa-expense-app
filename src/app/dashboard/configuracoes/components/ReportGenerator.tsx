"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileDown, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { loadResponsibleData, type ResponsibleData } from "@/lib/responsible-data"
import {
    generateExpenseReportPDF,
    generateConsolidatedExpenseReportPDF,
    generateDashboardPDF
} from "@/lib/pdf-generator"

export default function ReportGenerator() {
    const { toast } = useToast()
    const [generating, setGenerating] = useState<string | null>(null)
    const [responsibleData, setResponsibleData] = useState<ResponsibleData | null>(null)
    const [orgType, setOrgType] = useState<string>('')
    const [orgName, setOrgName] = useState<string>('')
    const [orgId, setOrgId] = useState<string>('')
    const isCFA = orgType === 'CFA'

    useEffect(() => {
        // Load session data on client side only
        setOrgType(sessionStorage.getItem('orgType') || '')
        setOrgName(sessionStorage.getItem('orgName') || '')
        setOrgId(sessionStorage.getItem('orgId') || '')
    }, [])

    useEffect(() => {
        const loadData = async () => {
            if (!orgId) return
            const data = await loadResponsibleData(orgId)
            setResponsibleData(data)
        }
        loadData()
    }, [orgId])

    const handleGenerateReport = async (type: 'expense' | 'dashboard' | 'consolidated-expense' | 'consolidated-dashboard') => {
        setGenerating(type)

        try {
            if (!orgId || !orgName) {
                throw new Error('Dados da organização não encontrados')
            }

            switch (type) {
                case 'expense':
                    await generateExpenseReportPDF(orgId, orgName, responsibleData)
                    break
                case 'dashboard':
                    await generateDashboardPDF(orgName, false)
                    break
                case 'consolidated-expense':
                    await generateConsolidatedExpenseReportPDF(responsibleData)
                    break
                case 'consolidated-dashboard':
                    await generateDashboardPDF('CFA + CRAs', true)
                    break
            }

            toast({
                title: "Relatório gerado!",
                description: "O download foi iniciado.",
            })
        } catch (error) {
            console.error('Error generating report:', error)
            toast({
                title: "Erro ao gerar relatório",
                description: "Não foi possível gerar o PDF. Tente novamente.",
                variant: "destructive"
            })
        } finally {
            setGenerating(null)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Geração de Relatórios</CardTitle>
                <CardDescription>
                    Gere relatórios em PDF com os dados da sua organização
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Relatórios para CRAs */}
                    {!isCFA && (
                        <>
                            <Button
                                variant="outline"
                                className="h-auto flex-col items-start p-4"
                                onClick={() => handleGenerateReport('expense')}
                                disabled={generating !== null}
                            >
                                {generating === 'expense' ? (
                                    <Loader2 className="h-5 w-5 animate-spin mb-2" />
                                ) : (
                                    <FileDown className="h-5 w-5 mb-2" />
                                )}
                                <div className="text-left">
                                    <div className="font-semibold">Relatório de Despesas</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Planilha preenchida com dados do CRA
                                    </div>
                                </div>
                            </Button>

                            <Button
                                variant="outline"
                                className="h-auto flex-col items-start p-4"
                                onClick={() => handleGenerateReport('dashboard')}
                                disabled={generating !== null}
                            >
                                {generating === 'dashboard' ? (
                                    <Loader2 className="h-5 w-5 animate-spin mb-2" />
                                ) : (
                                    <FileDown className="h-5 w-5 mb-2" />
                                )}
                                <div className="text-left">
                                    <div className="font-semibold">Dashboard em PDF</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Resumo visual do CRA
                                    </div>
                                </div>
                            </Button>
                        </>
                    )}

                    {/* Relatórios para CFA */}
                    {isCFA && (
                        <>
                            {/* Relatórios do próprio CFA */}
                            <Button
                                variant="outline"
                                className="h-auto flex-col items-start p-4"
                                onClick={() => handleGenerateReport('expense')}
                                disabled={generating !== null}
                            >
                                {generating === 'expense' ? (
                                    <Loader2 className="h-5 w-5 animate-spin mb-2" />
                                ) : (
                                    <FileDown className="h-5 w-5 mb-2" />
                                )}
                                <div className="text-left">
                                    <div className="font-semibold">Despesas CFA</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Relatório de despesas do CFA
                                    </div>
                                </div>
                            </Button>

                            <Button
                                variant="outline"
                                className="h-auto flex-col items-start p-4"
                                onClick={() => handleGenerateReport('dashboard')}
                                disabled={generating !== null}
                            >
                                {generating === 'dashboard' ? (
                                    <Loader2 className="h-5 w-5 animate-spin mb-2" />
                                ) : (
                                    <FileDown className="h-5 w-5 mb-2" />
                                )}
                                <div className="text-left">
                                    <div className="font-semibold">Dashboard CFA</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Dashboard do CFA
                                    </div>
                                </div>
                            </Button>

                            {/* Relatórios consolidados */}
                            <Button
                                variant="outline"
                                className="h-auto flex-col items-start p-4 border-blue-200 bg-blue-50"
                                onClick={() => handleGenerateReport('consolidated-expense')}
                                disabled={generating !== null}
                            >
                                {generating === 'consolidated-expense' ? (
                                    <Loader2 className="h-5 w-5 animate-spin mb-2" />
                                ) : (
                                    <FileDown className="h-5 w-5 mb-2 text-blue-600" />
                                )}
                                <div className="text-left">
                                    <div className="font-semibold text-blue-900">Despesas Consolidadas</div>
                                    <div className="text-xs text-blue-700 mt-1">
                                        Planilha CFA + todos os CRAs
                                    </div>
                                </div>
                            </Button>

                            <Button
                                variant="outline"
                                className="h-auto flex-col items-start p-4 border-blue-200 bg-blue-50"
                                onClick={() => handleGenerateReport('consolidated-dashboard')}
                                disabled={generating !== null}
                            >
                                {generating === 'consolidated-dashboard' ? (
                                    <Loader2 className="h-5 w-5 animate-spin mb-2" />
                                ) : (
                                    <FileDown className="h-5 w-5 mb-2 text-blue-600" />
                                )}
                                <div className="text-left">
                                    <div className="font-semibold text-blue-900">Dashboard Consolidado</div>
                                    <div className="text-xs text-blue-700 mt-1">
                                        Gráficos comparativos CFA + CRAs
                                    </div>
                                </div>
                            </Button>
                        </>
                    )}
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                    * Os relatórios incluirão cabeçalho com dados da unidade e rodapé com informações dos responsáveis
                </p>
            </CardContent>
        </Card>
    )
}
