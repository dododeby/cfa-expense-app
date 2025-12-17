"use client"

import { useState, useEffect } from "react"
import allRevenuesData from "@/lib/all-revenues.json"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
// import { Download } from "lucide-react" 
import { FileBarChart } from "lucide-react"
import { loadConsolidatedRevenues, ConsolidatedRevenue } from "@/lib/revenue-data-consolidated"
import { loadOrganizations } from "@/lib/expense-data"
import { exportRevenuesForBI } from "@/lib/excel-utils"

interface RevenueAccount {
    id: string;
    name: string;
    type: string;
}

export default function ConsolidatedRevenuesPage() {
    const [selectedRegional, setSelectedRegional] = useState('consolidado')
    const [consolidatedData, setConsolidatedData] = useState<ConsolidatedRevenue>({})
    const [loading, setLoading] = useState(true)
    const [allOrgs, setAllOrgs] = useState<{ id: string; name: string }[]>([])

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [fullData, setFullData] = useState<{ [orgId: string]: ConsolidatedRevenue }>({})

    const accounts: RevenueAccount[] = allRevenuesData as RevenueAccount[]

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)

            const orgs = await loadOrganizations()
            setAllOrgs(orgs)

            const allData = await loadConsolidatedRevenues()
            setFullData(allData)

            if (selectedRegional === 'consolidado') {
                // Sum all
                const summed: ConsolidatedRevenue = {}
                Object.values(allData).forEach(orgData => {
                    Object.entries(orgData).forEach(([accountId, values]) => {
                        if (!summed[accountId]) {
                            summed[accountId] = { value: 0 }
                        }
                        summed[accountId].value += values.value
                    })
                })
                setConsolidatedData(summed)
            } else {
                setConsolidatedData(allData[selectedRegional] || {})
            }

            setLoading(false)
        }
        loadData()
    }, [selectedRegional])

    const handleBIExport = () => {
        exportRevenuesForBI(fullData, allOrgs)
    }

    // Calculate Totals Metrics
    let totalCorrentes = 0
    let totalCapital = 0
    let totalGeral = 0

    // Only sum Analytic accounts to avoid double counting if we iterate all
    // But our hierarchy logic for display is: Parent = Sum(Children).
    // So for "Total Geral" we can sum Level 1 items ("1" -> Corrente, "2" -> Capital).
    // Or just sum all Analytic items.

    // Let's sum Analytic items for accuracy
    accounts.filter(a => a.type === 'Analítica').forEach(acc => {
        const val = consolidatedData[acc.id]?.value || 0
        totalGeral += val

        if (acc.id.startsWith('1')) {
            totalCorrentes += val
        } else if (acc.id.startsWith('2')) {
            totalCapital += val
        }
    })

    const isConsolidated = selectedRegional === 'consolidado'
    const selectedRegionalName = allOrgs.find(r => r.id === selectedRegional)?.name || 'Consolidado'

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Consolidado de Receitas</h1>
                    <p className="text-slate-500">
                        {isConsolidated ? 'Visão consolidada de todas as receitas' : `Dados de: ${selectedRegionalName}`}
                    </p>
                </div>
                <div className="flex gap-3 items-center">
                    <Select value={selectedRegional} onValueChange={setSelectedRegional}>
                        <SelectTrigger className="w-[300px]">
                            <SelectValue placeholder="Selecione o regional" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="consolidado">Consolidado (Todos)</SelectItem>
                            {allOrgs.map((regional) => (
                                <SelectItem key={regional.id} value={regional.id}>
                                    {regional.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {isConsolidated && (
                        <Button variant="default" size="sm" onClick={handleBIExport} className="bg-blue-600 hover:bg-blue-700">
                            <FileBarChart className="h-4 w-4 mr-2" />
                            Exportar para BI
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-blue-100 bg-blue-50/50">
                    <CardHeader className="pb-2 px-3 pt-3">
                        <CardTitle className="text-xs font-medium text-blue-700">
                            Receitas Correntes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        <div className="text-2xl font-bold text-blue-900">
                            {totalCorrentes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white">
                    <CardHeader className="pb-2 px-3 pt-3">
                        <CardTitle className="text-xs font-medium text-purple-700">
                            Receitas de Capital
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        <div className="text-2xl font-bold text-purple-900">
                            {totalCapital.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-blue-300 bg-blue-50">
                    <CardHeader className="pb-2 px-3 pt-3">
                        <CardTitle className="text-xs font-medium text-blue-900">
                            Total Arrecadado
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        <div className="text-2xl font-bold text-blue-950">
                            {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Grid */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[500px]">Rubrica / Descrição</TableHead>
                                <TableHead className="text-right">Valor Consolidado (R$)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts.map((account) => {
                                const isSynthetic = account.type === 'Sintética'
                                const depth = account.id.split('.').length - 1

                                let val = 0
                                if (isSynthetic) {
                                    // Calculate total from children locally for display based on current dataset
                                    const descendants = accounts.filter(a =>
                                        a.type === 'Analítica' && a.id.startsWith(account.id + '.')
                                    )
                                    val = descendants.reduce((acc, curr) => {
                                        return acc + (consolidatedData[curr.id]?.value || 0)
                                    }, 0)
                                } else {
                                    val = consolidatedData[account.id]?.value || 0
                                }

                                return (
                                    <TableRow key={account.id} className={cn(isSynthetic && "bg-slate-50 font-semibold")}>
                                        <TableCell className={cn("text-slate-700", {
                                            "pl-4": depth === 0,
                                            "pl-8": depth === 1,
                                            "pl-12": depth === 2,
                                            "font-bold": isSynthetic
                                        })}>
                                            {account.name}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className={cn("pr-3", isSynthetic ? "font-bold text-slate-900" : "text-slate-700")}>
                                                {val.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' })}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
