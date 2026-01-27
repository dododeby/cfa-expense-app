"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import allAccountsData from "@/lib/all-accounts.json"
import { loadExpenseData, loadConsolidatedData, loadOrganizations } from "@/lib/expense-data"
import { loadDeclaration } from "@/lib/declarations"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Account {
    id: string;
    group: string;
    subgroup: string;
    type: string;
    name: string;
}

const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1e40af', '#1e3a8a']

function DashboardPageContent() {
    const [orgType, setOrgType] = useState<string>('')
    const [hasData, setHasData] = useState(false)
    const [lastSaved, setLastSaved] = useState<string>('')
    const [expenseData, setExpenseData] = useState<any>({})
    const [loading, setLoading] = useState(true)
    const [chartFilter, setChartFilter] = useState<string>('all')
    const [declaration, setDeclaration] = useState<any>(null)

    const searchParams = useSearchParams()
    const isPrintMode = searchParams.get('print') === 'true'

    const accounts: Account[] = allAccountsData as Account[]

    useEffect(() => {
        const loadData = async () => {
            setOrgType(sessionStorage.getItem('orgType') || '')

            // Load expense data from Supabase
            const data = await loadExpenseData()
            setExpenseData(data)

            // Load declaration status
            const dec = await loadDeclaration()
            setDeclaration(dec)

            // Check if there's any data
            const hasAnyData = Object.keys(data).length > 0
            setHasData(hasAnyData)

            if (hasAnyData) {
                setLastSaved(new Date().toLocaleString('pt-BR'))
            }

            setLoading(false)
        }

        loadData()
    }, [])

    useEffect(() => {
        if (!loading && isPrintMode && hasData !== undefined) {
            // Small delay to ensure charts are rendered
            setTimeout(() => {
                window.print()
            }, 3000)
        }
    }, [loading, isPrintMode, hasData])

    const isCFA = orgType === 'CFA'

    // Calculate data for charts
    // Group by Level 2 ID (e.g. 1.1, 1.2) instead of Level 1 Group
    const groupData = accounts.reduce((acc, account) => {
        if (account.type === 'Analítica') {
            // Apply Filter
            if (chartFilter !== 'all' && !account.id.startsWith(chartFilter)) {
                return acc
            }

            const rowData = expenseData[account.id] || { total: 0, finalistica: 0 }

            // Get Level 2 prefix (e.g., 1.1 from 1.1.1.1)
            const parts = account.id.split('.')
            let groupName = 'Outros'

            if (parts.length >= 2) {
                const prefix = `${parts[0]}.${parts[1]}`
                // Find the name of the account with this prefix
                // Optimization: Create a map outside if slow, but for <1000 items logic is fine
                const groupAccount = accounts.find(a => a.id === prefix)
                if (groupAccount) {
                    groupName = groupAccount.name
                } else {
                    // Fallback to existing group name if x.x not found
                    groupName = account.group.split(' - ')[1] || account.group
                }
            } else {
                groupName = account.group.split(' - ')[1] || account.group
            }

            const existing = acc.find(item => item.name === groupName)

            if (existing) {
                existing.finalistica += rowData.finalistica
                existing.apoio += (rowData.total - rowData.finalistica)
            } else {
                acc.push({
                    name: groupName,
                    finalistica: rowData.finalistica,
                    apoio: rowData.total - rowData.finalistica
                })
            }
        }
        return acc
    }, [] as { name: string; finalistica: number; apoio: number }[])

    // Calculate totals
    const totalDespesas = groupData.reduce((sum, item) => sum + item.finalistica + item.apoio, 0)
    const totalFinalistica = groupData.reduce((sum, item) => sum + item.finalistica, 0)
    const totalApoio = groupData.reduce((sum, item) => sum + item.apoio, 0)
    const pctFinalistica = totalDespesas > 0 ? (totalFinalistica / totalDespesas) * 100 : 0
    const pctApoio = totalDespesas > 0 ? (totalApoio / totalDespesas) * 100 : 0

    // Prepare category data for pie chart
    const categoryData = groupData.map(item => ({
        name: item.name,
        value: item.finalistica + item.apoio
    })).filter(item => item.value > 0)

    if (loading) {
        return <div className="text-center py-12">Carregando dados...</div>
    }





    // ... existing logic ...

    return (
        <div className="space-y-6">
            <div className="print:hidden">
                <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-500">Visão geral das despesas</p>
            </div>

            {/* Header for Print Mode Only */}
            <div className="hidden print:block mb-4 text-center">
                <h1 className="text-2xl font-bold uppercase">Dashboard de Despesas</h1>
                <p className="text-sm text-slate-500">Período: 2025</p>
            </div>

            {isCFA && (
                <Tabs defaultValue="proprio" className="w-full">
                    <TabsList className="print:hidden">
                        <TabsTrigger value="proprio">Meu Dashboard</TabsTrigger>
                        <TabsTrigger value="consolidado">Dashboard CFA+CRAs</TabsTrigger>
                    </TabsList>

                    <TabsContent value="proprio" className="space-y-6">
                        <DashboardContent
                            hasData={hasData}
                            lastSaved={lastSaved}
                            totalDespesas={totalDespesas}
                            totalFinalistica={totalFinalistica}
                            totalApoio={totalApoio}
                            pctFinalistica={pctFinalistica}
                            pctApoio={pctApoio}
                            categoryData={categoryData}
                            groupData={groupData}
                            chartFilter={chartFilter}
                            setChartFilter={setChartFilter}
                            declaration={declaration}
                        />
                    </TabsContent>

                    <TabsContent value="consolidado" className="space-y-6">
                        <ConsolidatedDashboard />
                    </TabsContent>
                </Tabs>
            )}

            {!isCFA && (
                <DashboardContent
                    hasData={hasData}
                    lastSaved={lastSaved}
                    totalDespesas={totalDespesas}
                    totalFinalistica={totalFinalistica}
                    totalApoio={totalApoio}
                    pctFinalistica={pctFinalistica}
                    pctApoio={pctApoio}
                    categoryData={categoryData}
                    groupData={groupData}
                    chartFilter={chartFilter}
                    setChartFilter={setChartFilter}
                    declaration={declaration}
                />
            )}
        </div>
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div>Carregando dashboard de despesas...</div>}>
            <DashboardPageContent />
        </Suspense>
    )
}

interface DashboardContentProps {
    hasData: boolean;
    lastSaved: string;
    totalDespesas: number;
    totalFinalistica: number;
    totalApoio: number;
    pctFinalistica: number;
    pctApoio: number;
    categoryData: { name: string; value: number }[];
    groupData: { name: string; finalistica: number; apoio: number }[];
    chartFilter: string;
    setChartFilter: (value: string) => void;
    declaration: any;
}

function DashboardContent({
    hasData,
    lastSaved,
    totalDespesas,
    totalFinalistica,
    totalApoio,
    pctFinalistica,
    pctApoio,
    categoryData,
    groupData,
    chartFilter,
    setChartFilter,
    declaration
}: DashboardContentProps) {
    return (
        <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {hasData ? 'Dados preenchidos' : 'Aguardando preenchimento'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Atividade Finalística</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totalFinalistica.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <p className="text-xs text-muted-foreground">{pctFinalistica.toFixed(1)}% do total</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Atividade de Apoio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totalApoio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <p className="text-xs text-muted-foreground">{pctApoio.toFixed(1)}% do total</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(() => {
                            // Delivery deadline: 31/03/2026
                            const deliveryDeadline = new Date('2026-03-31T23:59:59')
                            const currentDate = new Date()
                            const isPastDeadline = currentDate > deliveryDeadline

                            if (declaration && declaration.status === 'submitted') {
                                return (
                                    <>
                                        <div className="text-2xl font-bold text-blue-600">Entregue</div>
                                        <p className="text-xs text-blue-600">
                                            Em {new Date(declaration.delivery_date).toLocaleDateString('pt-BR')}
                                            {declaration.is_rectification && ' (Retificada)'}
                                        </p>
                                    </>
                                )
                            } else if (declaration && declaration.status === 'draft') {
                                return (
                                    <>
                                        <div className="text-2xl font-bold text-amber-600">Pendente</div>
                                        <p className="text-xs text-amber-600">
                                            Em retificação - Novo envio necessário
                                        </p>
                                    </>
                                )
                            } else if (isPastDeadline) {
                                // After deadline - show as pending/encerrado
                                return (
                                    <>
                                        <div className="text-2xl font-bold text-red-600">Não Entregue</div>
                                        <p className="text-xs text-red-600">
                                            Prazo encerrado em 31/03/2026
                                        </p>
                                    </>
                                )
                            } else if (!hasData) {
                                // Before deadline and no data
                                return (
                                    <>
                                        <div className="text-2xl font-bold text-amber-600">Em Aberto</div>
                                        <p className="text-xs text-amber-600">Preencha os dados</p>
                                    </>
                                )
                            } else {
                                // Before deadline with data
                                return (
                                    <>
                                        <div className="text-2xl font-bold text-green-600">Em Preenchimento</div>
                                        <p className="text-xs text-green-600">
                                            Salvo automaticamente<br />
                                            {lastSaved}
                                        </p>
                                    </>
                                )
                            }
                        })()}
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Distribuição por Grupo</CardTitle>
                            <CardDescription>Despesas por categoria</CardDescription>
                        </div>
                        <Select value={chartFilter} onValueChange={setChartFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filtrar" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Grupos</SelectItem>
                                <SelectItem value="1">Despesas Correntes</SelectItem>
                                <SelectItem value="2">Despesas de Capital</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[400px]">
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="55%"
                                        labelLine={true}
                                        label={({ name, percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                                        outerRadius={110}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '0px', marginTop: '-30px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                Nenhum dado disponível
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Comparativo por Grupo</CardTitle>
                        <CardDescription>Finalística vs Apoio</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[400px]">
                        {groupData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={groupData} margin={{ bottom: 100 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="name"
                                        angle={-45}
                                        textAnchor="end"
                                        height={100}
                                        interval={0}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <YAxis tickFormatter={(value) => `R$ ${value / 1000}k`} />
                                    <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                                    <Legend verticalAlign="top" height={36} />
                                    <Bar dataKey="finalistica" fill="#10b981" name="Finalística" />
                                    <Bar dataKey="apoio" fill="#f59e0b" name="Apoio" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                Nenhum dado disponível
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    )
}

function ConsolidatedDashboard() {
    const [data, setData] = useState<{ [orgId: string]: any }>({})
    const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([])
    const [loading, setLoading] = useState(true)

    // Chart State
    const [chartViewMode, setChartViewMode] = useState<'total' | 'split'>('total')
    const [chartSampling, setChartSampling] = useState<'all' | 'top14' | 'bottom14'>('all')
    const [chartGroupFilter, setChartGroupFilter] = useState<string>('all')

    const accounts: Account[] = allAccountsData as Account[]
    // Get synthetic accounts for the filter (Level 2 only: 1.1, 1.2, etc.) - sorted by ID
    const syntheticAccounts = accounts
        .filter(a => a.type === 'Sintética' && a.id.split('.').length === 2)
        .sort((a, b) => {
            // Natural sort for IDs (1.1, 1.2, 1.10 instead of 1.1, 1.10, 1.2)
            return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
        })

    useEffect(() => {
        const load = async () => {
            console.log("Iniciando carregamento de dados consolidados...")
            const [consolidatedData, organizations] = await Promise.all([
                loadConsolidatedData(),
                loadOrganizations()
            ])
            console.log("Dados carregados:", Object.keys(consolidatedData).length, "organizações:", organizations.length)
            setData(consolidatedData)
            setOrgs(organizations) // Include all (CFA + CRAs)
            setLoading(false)
        }
        load()
    }, [])

    // Calculate Consolidated Totals (CFA + CRAs)
    const totals = Object.values(data).reduce((acc, orgData: any) => {
        accounts.forEach(account => {
            if (account.type === 'Analítica') {
                const item = orgData[account.id]
                if (item) {
                    acc.total += item.total || 0
                    acc.finalistica += item.finalistica || 0
                    acc.apoio += (item.total - item.finalistica) || 0
                }
            }
        })
        return acc
    }, { total: 0, finalistica: 0, apoio: 0 })

    const pctFinalistica = totals.total > 0 ? (totals.finalistica / totals.total) * 100 : 0
    const pctApoio = totals.total > 0 ? (totals.apoio / totals.total) * 100 : 0

    // Prepare Chart Data
    const getChartData = () => {
        if (!orgs.length) return []

        let chartData = orgs.map(org => {
            const orgData = data[org.id] || {}
            let total = 0
            let finalistica = 0
            let apoio = 0

            // Filter accounts based on synthetic group selection
            // We want all ANALYTICAL accounts that are DESCENDANTS of the selected synthetic account
            const targetAccounts = accounts.filter(a => {
                if (a.type !== 'Analítica') return false

                if (chartGroupFilter === 'all') return true

                // Check if the analytical account ID starts with the selected synthetic ID
                // e.g. Selected "1.1" matches "1.1.1.1", "1.1.2.1"
                return a.id.startsWith(chartGroupFilter)
            })

            targetAccounts.forEach(account => {
                const item = orgData[account.id]
                if (item) {
                    total += item.total || 0
                    finalistica += item.finalistica || 0
                    apoio += (item.total - item.finalistica) || 0
                }
            })

            return {
                name: org.name,
                total,
                finalistica,
                apoio
            }
        })

        // Sort by Total Descending
        chartData.sort((a, b) => b.total - a.total)

        // Apply Sampling
        if (chartSampling === 'top14') {
            chartData = chartData.slice(0, 14)
        } else if (chartSampling === 'bottom14') {
            chartData = chartData.slice(-14)
        }

        return chartData
    }

    const chartData = getChartData()

    if (loading) {
        return <div className="text-center py-12">Carregando dados consolidados...</div>
    }

    return (
        <>
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Consolidado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-900">
                            {totals.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">CFA + 27 CRAs</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Atividade Finalística</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">
                            {totals.finalistica.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{pctFinalistica.toFixed(1)}% do total</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Atividade de Apoio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-600">
                            {totals.apoio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{pctApoio.toFixed(1)}% do total</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="flex flex-col mt-4">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <CardTitle>Comparativo entre Regionais</CardTitle>
                        <div className="flex flex-wrap gap-2">
                            {/* View Mode Filter */}
                            <Select value={chartViewMode} onValueChange={(v: any) => setChartViewMode(v)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Visualização" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="total">Despesas Totais</SelectItem>
                                    <SelectItem value="split">Finalística vs Apoio</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Sampling Filter */}
                            <Select value={chartSampling} onValueChange={(v: any) => setChartSampling(v)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Amostragem" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Regionais</SelectItem>
                                    <SelectItem value="top14">Top 14 (Maiores Despesas)</SelectItem>
                                    <SelectItem value="bottom14">Top 14 (Menores Despesas)</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Group Filter */}
                            <Select value={chartGroupFilter} onValueChange={setChartGroupFilter}>
                                <SelectTrigger className="w-[300px]">
                                    <SelectValue placeholder="Filtrar por Conta" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Despesas</SelectItem>
                                    {syntheticAccounts.map(account => (
                                        <SelectItem key={account.id} value={account.id}>
                                            {account.id} - {account.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-[500px]">
                    <div className="h-[500px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 12 }}
                                    interval={0}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis tickFormatter={(value) =>
                                    new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short" }).format(value)
                                } />
                                <Tooltip
                                    formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                                />
                                <Legend verticalAlign="top" height={36} />
                                {chartViewMode === 'total' ? (
                                    <Bar dataKey="total" name="Total de Despesas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                ) : (
                                    <>
                                        <Bar dataKey="finalistica" name="Atividade Finalística" stackId="a" fill="#10b981" />
                                        <Bar dataKey="apoio" name="Atividade de Apoio" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </>
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: landscape;
                        margin: 6mm;
                    }
                    body {
                        overflow: hidden !important;
                        font-size: 9pt !important;
                    }
                    html, body {
                        width: 100%;
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                    }
                    * {
                        overflow: visible !important;
                        min-height: auto !important;
                    }
                    /* Scale content to fit one page */
                    .space-y-6 {
                        gap: 0.25rem !important;
                    }
                    h1 {
                        font-size: 1.25rem !important;
                        margin-bottom: 0.125rem !important;
                    }
                    p {
                        margin-bottom: 0.25rem !important;
                    }
                    .grid {
                        gap: 0.375rem !important;
                    }
                    /* Reduce card padding */
                    [class*="Card"] {
                        padding: 0.375rem !important;
                        margin-bottom: 0.25rem !important;
                    }
                    [class*="CardHeader"] {
                        padding: 0.375rem !important;
                        padding-bottom: 0.25rem !important;
                    }
                    [class*="CardContent"] {
                        padding: 0.375rem !important;
                        padding-top: 0.25rem !important;
                    }
                    [class*="CardTitle"] {
                        font-size: 0.8rem !important;
                        margin-bottom: 0 !important;
                    }
                    [class*="CardDescription"] {
                        font-size: 0.7rem !important;
                        margin-top: 0.125rem !important;
                    }
                    /* Maximize chart heights and shift left */
                    .recharts-wrapper {
                        height: 250px !important;
                        margin-left: -20px !important;
                    }
                    /* Increase and center pie chart, shift left */
                    .recharts-pie {
                        transform: scale(1.5) translateX(-15px) !important;
                        transform-origin: center center !important;
                    }.text-2xl {
                        font-size: 1.25rem !important;
                    }
                    .text-xs {
                        font-size: 0.65rem !important;
                    }
                    /* Hide all scrollbars */
                    ::-webkit-scrollbar {
                        display: none !important;
                        width: 0 !important;
                        height: 0 !important;
                    }
                    * {
                        scrollbar-width: none !important;
                        -ms-overflow-style: none !important;
                    }
                }
            `}</style>
        </>
    )
}
