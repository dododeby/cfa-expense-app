"use client"

import { useState, useEffect } from "react"
import allAccountsData from "@/lib/all-accounts.json"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { FileBarChart, Download } from "lucide-react"
import { exportForBI, exportToExcel } from "@/lib/excel-utils"
import { loadConsolidatedData, loadOrganizationData, loadOrganizations } from "@/lib/expense-data"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from "recharts"

interface Account {
    id: string;
    group: string;
    subgroup: string;
    type: string;
    name: string;
}

interface ExpenseData {
    [accountId: string]: {
        total: number;
        finalistica: number;
    }
}

export default function ConsolidadoPage() {
    const [selectedRegional, setSelectedRegional] = useState('consolidado')
    const [consolidatedData, setConsolidatedData] = useState<ExpenseData>({})
    const [loading, setLoading] = useState(true)
    const [fullData, setFullData] = useState<{ [orgId: string]: ExpenseData }>({})
    const [allOrgs, setAllOrgs] = useState<{ id: string; name: string }[]>([])



    const accounts: Account[] = allAccountsData as Account[]

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)

            // Always load organizations for mapping
            const orgs = await loadOrganizations()
            setAllOrgs(orgs)

            if (selectedRegional === 'consolidado') {
                // Load all organizations data
                const allData = await loadConsolidatedData()
                setFullData(allData)

                // Sum all organizations' data for the view
                const summed: ExpenseData = {}
                Object.values(allData).forEach(orgData => {
                    Object.entries(orgData).forEach(([accountId, values]) => {
                        if (!summed[accountId]) {
                            summed[accountId] = { total: 0, finalistica: 0 }
                        }
                        summed[accountId].total += values.total
                        summed[accountId].finalistica += values.finalistica
                    })
                })

                setConsolidatedData(summed)
            } else {
                // Load specific organization data
                const data = await loadOrganizationData(selectedRegional)
                setConsolidatedData(data)
            }

            setLoading(false)
        }

        loadData()
    }, [selectedRegional])

    // Group accounts by "Grupo"
    const groupedAccounts = accounts.reduce((acc, account) => {
        if (!acc[account.group]) {
            acc[account.group] = []
        }
        acc[account.group].push(account)
        return acc
    }, {} as Record<string, Account[]>)

    const groups = Object.keys(groupedAccounts).filter(g => g && g.trim() !== '')

    const handleBIExport = async () => {
        console.log('=== USING NEW SERVER-SIDE API FOR EXPORT ===')

        try {
            // Use server-side API to get ALL organization data (bypasses RLS)
            const { loadConsolidatedDataForExport } = await import('@/lib/export-api')
            const exportData = await loadConsolidatedDataForExport()

            console.log('Server-side export data loaded:')
            console.log('- Organizations:', exportData.organizations.length)
            console.log('- Orgs with data:', Object.keys(exportData.data).length)
            console.log('- Org IDs with data:', Object.keys(exportData.data))

            exportForBI(exportData.data, exportData.organizations);
        } catch (error) {
            console.error('Export failed:', error)
            alert('Falha ao exportar dados. Por favor, tente novamente.')
        }
    }

    const handleExportXLS = () => {
        const exportName = selectedRegional === 'consolidado'
            ? 'Consolidado_CFA_CRAs'
            : allOrgs.find(r => r.id === selectedRegional)?.name || 'Regional'

        exportToExcel(consolidatedData, exportName)
    }

    const getGroupTotals = (groupAccounts: Account[]) => {
        let totalDespesas = 0
        groupAccounts.forEach(account => {
            if (account.type === 'Analítica') {
                const rowData = consolidatedData[account.id] || { total: 0, finalistica: 0 }
                totalDespesas += rowData.total
            }
        })
        return totalDespesas
    }

    const getRowValues = (account: Account) => {
        if (account.type === 'Analítica') {
            const rowData = consolidatedData[account.id] || { total: 0, finalistica: 0 }
            const apoio = rowData.total - rowData.finalistica
            const pctFinalistica = rowData.total > 0 ? (rowData.finalistica / rowData.total) * 100 : 0
            const pctApoio = rowData.total > 0 ? (apoio / rowData.total) * 100 : 0

            return {
                total: rowData.total,
                finalistica: rowData.finalistica,
                apoio,
                pctFinalistica,
                pctApoio
            }
        }
        return { total: 0, finalistica: 0, apoio: 0, pctFinalistica: 0, pctApoio: 0 }
    }

    const grandTotal = accounts.reduce((sum, account) => {
        if (account.type === 'Analítica') {
            const rowData = consolidatedData[account.id] || { total: 0, finalistica: 0 }
            return sum + rowData.total
        }
        return sum
    }, 0)

    const isConsolidated = selectedRegional === 'consolidado'

    const dropdownOptions = [
        { id: 'consolidado', name: 'Consolidado (CFA + Todos os CRAs)' },
        ...allOrgs.map(org => ({ id: org.id, name: org.name }))
    ]

    const selectedRegionalName = dropdownOptions.find(r => r.id === selectedRegional)?.name || ''

    // Calculate Global Metrics for Display
    let totalFinalistica = 0
    let totalApoio = 0
    let totalDespesasCorrentes = 0
    let totalDespesasCapital = 0
    let grandTotalMetric = 0

    // We iterate over Accounts (definition) and look up in Consolidated Data
    accounts.filter(a => a.type === 'Analítica').forEach(acc => {
        const row = consolidatedData[acc.id] || { total: 0, finalistica: 0 }
        const apoio = row.total - row.finalistica

        totalFinalistica += row.finalistica
        totalApoio += apoio
        grandTotalMetric += row.total

        if (acc.id.startsWith('1')) {
            totalDespesasCorrentes += row.total
        } else if (acc.id.startsWith('2')) {
            totalDespesasCapital += row.total
        }
    })

    const pctFinalistica = grandTotalMetric > 0 ? (totalFinalistica / grandTotalMetric) * 100 : 0
    const pctApoio = grandTotalMetric > 0 ? (totalApoio / grandTotalMetric) * 100 : 0

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Consolidado</h1>
                    <p className="text-slate-500">
                        {isConsolidated
                            ? 'Visão consolidada de todas as despesas (somente leitura)'
                            : `Visualizando dados de: ${selectedRegionalName}`
                        }
                    </p>
                </div>
                <div className="flex gap-3 items-center">
                    <Select value={selectedRegional} onValueChange={setSelectedRegional}>
                        <SelectTrigger className="w-[300px]">
                            <SelectValue placeholder="Selecione o regional" />
                        </SelectTrigger>
                        <SelectContent>
                            {dropdownOptions.map((regional) => (
                                <SelectItem key={regional.id} value={regional.id}>
                                    {regional.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button variant="outline" size="sm" onClick={handleExportXLS}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar XLS
                    </Button>

                    {isConsolidated && (
                        <Button variant="default" size="sm" onClick={handleBIExport} className="bg-blue-600 hover:bg-blue-700">
                            <FileBarChart className="h-4 w-4 mr-2" />
                            Exportar para BI
                        </Button>
                    )}
                </div>
            </div >

            {/* Summary Cards (Matching Preenchimento Style) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <Card className="border-blue-200 bg-white">
                    <CardHeader className="pb-2 px-3 pt-3">
                        <CardTitle className="text-xs font-medium text-slate-600">
                            Despesa Finalística
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        <div className="text-lg font-bold text-blue-900">
                            {totalFinalistica.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                            {pctFinalistica.toFixed(1)}%
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 bg-slate-50">
                    <CardHeader className="pb-2 px-3 pt-3">
                        <CardTitle className="text-xs font-medium text-slate-600">
                            Despesa de Apoio
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        <div className="text-lg font-bold text-slate-900">
                            {totalApoio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <div className="text-xs text-slate-600 font-medium">
                            {pctApoio.toFixed(1)}%
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-blue-100 bg-blue-50/50">
                    <CardHeader className="pb-2 px-3 pt-3">
                        <CardTitle className="text-xs font-medium text-blue-700">
                            Despesas Correntes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        <div className="text-lg font-bold text-blue-900">
                            {totalDespesasCorrentes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white">
                    <CardHeader className="pb-2 px-3 pt-3">
                        <CardTitle className="text-xs font-medium text-purple-700">
                            Despesas de Capital
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        <div className="text-lg font-bold text-purple-900">
                            {totalDespesasCapital.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-blue-300 bg-blue-50">
                    <CardHeader className="pb-2 px-3 pt-3">
                        <CardTitle className="text-xs font-medium text-blue-900">
                            Total Geral
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        <div className="text-lg font-bold text-blue-950">
                            {grandTotalMetric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </CardContent>
                </Card>
            </div>



            <Tabs defaultValue={groups[0]} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto bg-slate-100 p-1">
                    {groups.map((group) => (
                        <TabsTrigger
                            key={group}
                            value={group}
                            className="whitespace-nowrap data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md px-4 py-2 rounded-md font-medium transition-all"
                        >
                            {group}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {groups.map((group) => {
                    const groupAccounts = groupedAccounts[group]

                    return (
                        <TabsContent key={group} value={group} className="space-y-4 mt-4">
                            {/* Table - READ ONLY */}
                            <div className="border rounded-md overflow-hidden shadow-sm bg-slate-50">
                                <Table>
                                    <TableHeader className="bg-slate-200">
                                        <TableRow>
                                            <TableHead className="w-[400px]">Conta</TableHead>
                                            <TableHead className="w-[150px] text-right">Total</TableHead>
                                            <TableHead className="w-[150px] text-right">Atividade Finalística</TableHead>
                                            <TableHead className="w-[150px] text-right">Atividade de Apoio</TableHead>
                                            <TableHead className="w-[100px] text-right">% Finalística</TableHead>
                                            <TableHead className="w-[100px] text-right">% Apoio</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>

                                        {groupAccounts.map((account) => {
                                            const parts = account.id.split('.')

                                            // Check Duplicate Names Logic
                                            let hideRow = false
                                            let isPseudoSynthetic = false

                                            if (account.type === 'Sintética') {
                                                // Only match parents that have EXACTLY ONE child with the SAME NAME
                                                const directChildren = accounts.filter(child =>
                                                    child.id.startsWith(account.id + '.') &&
                                                    child.id.split('.').length === parts.length + 1
                                                )

                                                if (directChildren.length === 1 && directChildren[0].name.trim().toLowerCase() === account.name.trim().toLowerCase()) {
                                                    hideRow = true
                                                }
                                            } else if (account.type === 'Analítica') {
                                                // Standard logic: if I am the only child and match parent name, I might look synthetic IF parent is hidden.
                                                // If parent is shown (because it had multiple children), I should look analytic.
                                                if (parts.length > 1) {
                                                    const parentId = parts.slice(0, -1).join('.')
                                                    const parent = accounts.find(a => a.id === parentId)
                                                    const siblings = accounts.filter(a =>
                                                        a.id.startsWith(parentId + '.') &&
                                                        a.id.split('.').length === parts.length
                                                    )

                                                    // If parent matches name AND I am the only child (sibling count 1), 
                                                    // then parent was hidden above. So I take over visually.
                                                    if (parent && parent.name.trim().toLowerCase() === account.name.trim().toLowerCase() && siblings.length === 1) {
                                                        isPseudoSynthetic = true
                                                    }
                                                }
                                            }

                                            if (hideRow) return null

                                            const isSynthetic = account.type === 'Sintética'
                                            const effectiveIsSynthetic = isSynthetic || isPseudoSynthetic

                                            let rowValues;

                                            if (isSynthetic) {
                                                // Calculate totals for synthetic account
                                                // Sum all ANALYTICAL accounts that start with this account's ID
                                                const descendants = accounts.filter(a =>
                                                    a.type === 'Analítica' &&
                                                    a.id.startsWith(account.id + '.')
                                                )

                                                const total = descendants.reduce((sum, desc) => {
                                                    const val = consolidatedData[desc.id]?.total || 0
                                                    return sum + val
                                                }, 0)

                                                const finalistica = descendants.reduce((sum, desc) => {
                                                    const val = consolidatedData[desc.id]?.finalistica || 0
                                                    return sum + val
                                                }, 0)

                                                const apoio = total - finalistica
                                                const pctFinalistica = total > 0 ? (finalistica / total) * 100 : 0
                                                const pctApoio = total > 0 ? (apoio / total) * 100 : 0

                                                rowValues = { total, finalistica, apoio, pctFinalistica, pctApoio }
                                            } else {
                                                // Analytic
                                                rowValues = getRowValues(account)
                                            }

                                            return (
                                                <TableRow key={account.id} className={cn(effectiveIsSynthetic && "bg-slate-100 font-semibold")}>
                                                    <TableCell className={cn("py-2", effectiveIsSynthetic ? "pl-4" : "pl-8")}>
                                                        {account.name}
                                                    </TableCell>

                                                    {/* Always show values, even for Synthetic (calculated) */}
                                                    <TableCell className={cn("text-right", isSynthetic ? "text-slate-900 font-bold" : "font-medium")}>
                                                        {rowValues.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </TableCell>
                                                    <TableCell className={cn("text-right", isSynthetic ? "text-slate-900" : "font-medium")}>
                                                        {rowValues.finalistica.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </TableCell>
                                                    <TableCell className={cn("text-right text-slate-700", isSynthetic && "text-slate-900")}>
                                                        {rowValues.apoio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </TableCell>
                                                    <TableCell className="text-right text-slate-600">
                                                        {rowValues.pctFinalistica.toFixed(1)}%
                                                    </TableCell>
                                                    <TableCell className="text-right text-slate-600">
                                                        {rowValues.pctApoio.toFixed(1)}%
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    )
                })}
            </Tabs>
        </div >
    )
}
