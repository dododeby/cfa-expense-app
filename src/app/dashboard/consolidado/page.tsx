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
        let dataToExport = fullData
        let orgsToExport = allOrgs

        if (Object.keys(dataToExport).length === 0) {
            const allData = await loadConsolidatedData()
            dataToExport = allData

            if (orgsToExport.length === 0) {
                orgsToExport = await loadOrganizations()
            }
        }

        exportForBI(dataToExport, orgsToExport);
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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {groups.map((group) => {
                    const total = getGroupTotals(groupedAccounts[group])
                    return (
                        <Card key={group} className="border-slate-200">
                            <CardHeader className="pb-2 px-3 pt-3">
                                <CardTitle className="text-xs font-medium text-slate-600 line-clamp-2">
                                    {group}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pb-3">
                                <div className="text-lg font-bold text-slate-900">
                                    {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
                <Card className="bg-blue-50 border-blue-300">
                    <CardHeader className="pb-2 px-3 pt-3">
                        <CardTitle className="text-xs font-medium text-blue-700">
                            Total Geral
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        <div className="text-lg font-bold text-blue-900">
                            {grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                                            const values = getRowValues(account)
                                            const isSynthetic = account.type === 'Sintética'

                                            return (
                                                <TableRow key={account.id} className={cn(isSynthetic && "bg-slate-100 font-semibold")}>
                                                    <TableCell className={cn("py-2", isSynthetic ? "pl-4" : "pl-8")}>
                                                        {account.name}
                                                    </TableCell>

                                                    {isSynthetic ? (
                                                        <>
                                                            <TableCell className="text-right text-slate-500">-</TableCell>
                                                            <TableCell className="text-right text-slate-500">-</TableCell>
                                                            <TableCell className="text-right text-slate-500">-</TableCell>
                                                            <TableCell className="text-right text-slate-500">-</TableCell>
                                                            <TableCell className="text-right text-slate-500">-</TableCell>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TableCell className="text-right font-medium">
                                                                {values.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium">
                                                                {values.finalistica.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium text-slate-700">
                                                                {values.apoio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                            </TableCell>
                                                            <TableCell className="text-right text-slate-600">
                                                                {values.pctFinalistica.toFixed(1)}%
                                                            </TableCell>
                                                            <TableCell className="text-right text-slate-600">
                                                                {values.pctApoio.toFixed(1)}%
                                                            </TableCell>
                                                        </>
                                                    )}
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
