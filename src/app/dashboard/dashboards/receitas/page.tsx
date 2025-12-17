"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import allRevenuesData from "@/lib/all-revenues.json"
import { loadRevenueData } from "@/lib/revenue-data"
import { loadConsolidatedRevenues } from "@/lib/revenue-data-consolidated"
import { loadOrganizations } from "@/lib/expense-data"

interface RevenueAccount {
    id: string;
    name: string;
    type: string;
}

const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1e40af', '#1e3a8a', '#7c3aed', '#a78bfa']

export default function RevenueDashboardPage() {
    const [orgType, setOrgType] = useState<string>('')
    const [revenueData, setRevenueData] = useState<any>({})
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'proprio' | 'consolidado'>('proprio')
    const [selectedRegional, setSelectedRegional] = useState<string>('consolidado')
    const [allOrgs, setAllOrgs] = useState<{ id: string; name: string }[]>([])
    const [consolidatedData, setConsolidatedData] = useState<any>({})
    const [chartSampling, setChartSampling] = useState<'all' | 'top14' | 'bottom14'>('all')
    const [chartRevenueType, setChartRevenueType] = useState<string>('all')
    const [fullConsolidatedData, setFullConsolidatedData] = useState<{ [orgId: string]: any }>({})

    const searchParams = useSearchParams()
    const isPrintMode = searchParams.get('print') === 'true'

    const revenues: RevenueAccount[] = allRevenuesData as RevenueAccount[]
    const analyticalRevenues = revenues.filter(r => r.type === 'Analítica')

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            const type = sessionStorage.getItem('orgType') || ''
            setOrgType(type)

            if (viewMode === 'proprio') {
                const data = await loadRevenueData()
                setRevenueData(data)
            } else {
                const orgs = await loadOrganizations()
                setAllOrgs(orgs)

                const allData = await loadConsolidatedRevenues()
                setFullConsolidatedData(allData) // Store full data for comparison chart

                if (selectedRegional === 'consolidado') {
                    const summed: any = {}
                    Object.values(allData).forEach((orgData: any) => {
                        Object.entries(orgData).forEach(([accountId, values]: [string, any]) => {
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
            }

            setLoading(false)
        }

        loadData()
    }, [viewMode, selectedRegional])

    useEffect(() => {
        if (!loading && isPrintMode) {
            // Small delay to ensure charts are rendered
            setTimeout(() => {
                window.print()
            }, 5000)
        }
    }, [loading, isPrintMode])

    const isCFA = orgType === 'CFA'
    const dataToUse = viewMode === 'consolidado' ? consolidatedData : revenueData

    // Calculate totals
    let totalReceitas = 0
    let totalCorrentes = 0
    let totalCapital = 0

    analyticalRevenues.forEach(rev => {
        const val = dataToUse[rev.id]?.value || 0
        totalReceitas += val

        if (rev.id.startsWith('1')) {
            totalCorrentes += val
        } else if (rev.id.startsWith('2')) {
            totalCapital += val
        }
    })

    // Prepare chart data - group by Level 2 categories
    const categoryData: { name: string; value: number }[] = []
    const categoryMap = new Map<string, number>()

    analyticalRevenues.forEach(rev => {
        const val = dataToUse[rev.id]?.value || 0
        if (val > 0) {
            const parts = rev.id.split('.')
            if (parts.length >= 2) {
                const categoryId = `${parts[0]}.${parts[1]}`
                const category = revenues.find(r => r.id === categoryId)
                const categoryName = category?.name || 'Outros'

                categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + val)
            }
        }
    })

    categoryMap.forEach((value, name) => {
        categoryData.push({ name, value })
    })

    // Bar chart data - top revenue accounts
    const barChartData = analyticalRevenues
        .map(rev => ({
            name: rev.name.length > 40 ? rev.name.substring(0, 40) + '...' : rev.name,
            value: dataToUse[rev.id]?.value || 0
        }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)

    // Comparison Chart Data Calculation
    const getComparisonChartData = () => {
        if (!allOrgs.length) return []

        let chartData = allOrgs.map(org => {
            const orgData = fullConsolidatedData[org.id] || {}
            let total = 0

            // Filter calculation based on chartRevenueType
            if (chartRevenueType === 'all') {
                // Sum all analytical
                analyticalRevenues.forEach(rev => {
                    total += orgData[rev.id]?.value || 0
                })
            } else {
                // Specific revenue type (could be synthetic or analytical logic)
                // If it's analytical, just define.
                // If the user selected a synthetic group (like "1.1"), we should sum its children.
                // For simplicity, let's look if it's exact match first.
                // Logic: Sum all revenues that start with the selected ID (handles both 1.1 and 1.1.X)
                // EXCEPT if we only want analytical.
                // Let's iterate analyticals and check prefix.
                analyticalRevenues.forEach(rev => {
                    if (rev.id === chartRevenueType || rev.id.startsWith(chartRevenueType + '.')) {
                        total += orgData[rev.id]?.value || 0
                    }
                })
            }

            return {
                name: org.name,
                value: total
            }
        })

        // Sort by Value Descending
        chartData.sort((a, b) => b.value - a.value)

        // Apply Sampling
        if (chartSampling === 'top14') {
            chartData = chartData.slice(0, 14)
        } else if (chartSampling === 'bottom14') {
            chartData = chartData.slice(-14)
        }

        return chartData
    }

    const comparisonChartData = getComparisonChartData()
    const showComparisonChart = isCFA && viewMode === 'consolidado' && selectedRegional === 'consolidado'

    if (loading) {
        return <div className="text-center py-12" suppressHydrationWarning={true}>Carregando dados...</div>
    }





    // ... existing logic ...

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center print:hidden">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Dashboard de Receitas</h1>
                    <p className="text-slate-500">Visão geral das receitas arrecadadas</p>
                </div>

                {isCFA && viewMode === 'consolidado' && (
                    <Select value={selectedRegional} onValueChange={setSelectedRegional}>
                        <SelectTrigger className="w-[300px]">
                            <SelectValue placeholder="Selecione o regional" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="consolidado">Consolidado (Todos)</SelectItem>
                            {allOrgs.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                    {org.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {isCFA && (
                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-fit print:hidden">
                    <button
                        onClick={() => setViewMode('proprio')}
                        className={`px-4 py-2 rounded-md font-medium transition-all ${viewMode === 'proprio'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        Minha Organização
                    </button>
                    <button
                        onClick={() => setViewMode('consolidado')}
                        className={`px-4 py-2 rounded-md font-medium transition-all ${viewMode === 'consolidado'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        Visão Consolidada
                    </button>
                </div>
            )}

            {/* Header for Print Mode Only */}
            <div className="hidden print:block mb-4 text-center">
                <h1 className="text-2xl font-bold uppercase">Dashboard de Receitas</h1>
                <p className="text-sm text-slate-500">Período: 2025</p>
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
                        <div className="text-xs text-blue-600 font-medium">
                            {totalReceitas > 0 ? ((totalCorrentes / totalReceitas) * 100).toFixed(1) : 0}%
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-purple-100 bg-purple-50/50">
                    <CardHeader className="pb-2 px-3 pt-3">
                        <CardTitle className="text-xs font-medium text-purple-700">
                            Receitas de Capital
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        <div className="text-2xl font-bold text-purple-900">
                            {totalCapital.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <div className="text-xs text-purple-600 font-medium">
                            {totalReceitas > 0 ? ((totalCapital / totalReceitas) * 100).toFixed(1) : 0}%
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
                            {totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Area */}
            {showComparisonChart ? (
                // Regional Comparison Chart (Consolidated All View)
                <Card className="flex flex-col">
                    <CardHeader>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <CardTitle>Comparativo entre Regionais</CardTitle>
                            <div className="flex flex-wrap gap-2">
                                {/* Sampling Filter */}
                                <Select value={chartSampling} onValueChange={(v: any) => setChartSampling(v)}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Amostragem" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as Regionais</SelectItem>
                                        <SelectItem value="top14">Top 14 (Maiores Receitas)</SelectItem>
                                        <SelectItem value="bottom14">Top 14 (Menores Receitas)</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Revenue Type Filter */}
                                <Select value={chartRevenueType} onValueChange={setChartRevenueType}>
                                    <SelectTrigger className="w-[250px]">
                                        <SelectValue placeholder="Filtrar por Tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as Receitas</SelectItem>
                                        {revenues.filter(r => r.type === 'Analítica').map(r => (
                                            <SelectItem key={r.id} value={r.id}>
                                                {r.id === '1' || r.id === '2' ? r.name : `${r.id} - ${r.name}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <CardDescription>
                            {chartRevenueType === 'all'
                                ? "Comparativo do total de receitas arrecadadas"
                                : `Comparativo de: ${revenues.find(r => r.id === chartRevenueType)?.name}`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[500px]">
                        <div className="h-[500px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonChartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
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
                                    <Bar dataKey="value" name="Receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                // Original Charts (Single Organization or specific view)
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pie Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Distribuição por Categoria</CardTitle>
                            <CardDescription>Proporção de receitas por categoria</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Bar Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Top 10 Receitas</CardTitle>
                            <CardDescription>Principais fontes de arrecadação</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={barChartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                                    <YAxis dataKey="name" type="category" width={150} />
                                    <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                                    <Bar dataKey="value" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: landscape;
                        margin: 5mm;
                    }
                    body {
                        overflow: hidden !important;
                        font-size: 10pt !important;
                    }
                    html, body {
                        width: 100%;
                        height: 100% !important;
                        overflow: hidden !important;
                    }
                    /* Override space-y-6 margin */
                    .space-y-6 > :not([hidden]) ~ :not([hidden]) {
                        margin-top: 0.5rem !important;
                    }
                    h1 {
                        font-size: 1.4rem !important;
                        margin-bottom: 0.2rem !important;
                    }
                    p {
                        margin-bottom: 0.2rem !important;
                    }
                    .grid {
                        gap: 0.5rem !important;
                    }
                    /* Force 3-column layout for summary cards */
                    .md\\:grid-cols-3 {
                        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                    }
                    /* Force 2-column layout for charts in print */
                    .grid-cols-1 {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    }
                    div[class*="grid-cols"] {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                        display: grid !important;
                    }
                    /* Reduce card padding */
                    [class*="Card"] {
                        padding: 0.5rem !important;
                        margin-bottom: 0.2rem !important;
                    }
                    [class*="CardHeader"] {
                        padding: 0.5rem !important;
                        padding-bottom: 0.2rem !important;
                    }
                    [class*="CardContent"] {
                        padding: 0.5rem !important;
                        padding-top: 0.2rem !important;
                    }
                    [class*="CardTitle"] {
                        font-size: 0.9rem !important;
                        margin-bottom: 0 !important;
                    }
                    [class*="CardDescription"] {
                        font-size: 0.8rem !important;
                        margin-top: 0.2rem !important;
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
                    }
                    .recharts-pie-sector {
                        transform-origin: center center !important;
                    }
                    /* Restore summary card text size */
                    .text-2xl {
                        font-size: 1.4rem !important;
                    }
                    .text-xs {
                        font-size: 0.75rem !important;
                    }
                    /* Adjust margins */
                    .mb-4, .mb-8 {
                        margin-bottom: 0.2rem !important;
                    }
                    .pb-2, .pt-3, .px-3 {
                        padding: 0.2rem !important;
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
        </div>
    )
}
