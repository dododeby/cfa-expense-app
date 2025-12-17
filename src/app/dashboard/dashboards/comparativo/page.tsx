"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line } from 'recharts'
import allAccountsData from "@/lib/all-accounts.json"
import allRevenuesData from "@/lib/all-revenues.json"
import { loadExpenseData, loadConsolidatedData, loadOrganizations } from "@/lib/expense-data"
import { loadRevenueData } from "@/lib/revenue-data"
import { loadConsolidatedRevenues } from "@/lib/revenue-data-consolidated"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"

// ... imports remain the same

interface Account {
    id: string;
    group: string;
    subgroup: string;
    type: string;
    name: string;
}

interface RevenueAccount {
    id: string;
    name: string;
    type: string;
}

const COLORS = {
    revenue: '#10b981',
    expense: '#ef4444',
    surplus: '#3b82f6',
    deficit: '#f59e0b'
}

function ComparativeDashboardContent() {
    const searchParams = useSearchParams()
    const isPrintMode = searchParams.get('print') === 'true'

    const [orgType, setOrgType] = useState<string>('')
    const [expenseData, setExpenseData] = useState<any>({})
    const [revenueData, setRevenueData] = useState<any>({})
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'proprio' | 'consolidado'>('proprio')
    const [selectedRegional, setSelectedRegional] = useState<string>('consolidado')
    const [allOrgs, setAllOrgs] = useState<{ id: string; name: string }[]>([])

    const accounts: Account[] = allAccountsData as Account[]
    const revenues: RevenueAccount[] = allRevenuesData as RevenueAccount[]

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            const type = sessionStorage.getItem('orgType') || ''
            setOrgType(type)

            if (viewMode === 'proprio') {
                const expData = await loadExpenseData()
                const revData = await loadRevenueData()
                setExpenseData(expData)
                setRevenueData(revData)
            } else {
                const orgs = await loadOrganizations()
                setAllOrgs(orgs)

                const allExpData = await loadConsolidatedData()
                const allRevData = await loadConsolidatedRevenues()

                if (selectedRegional === 'consolidado') {
                    // Sum expenses
                    const summedExp: any = {}
                    Object.values(allExpData).forEach((orgData: any) => {
                        Object.entries(orgData).forEach(([accountId, values]: [string, any]) => {
                            if (!summedExp[accountId]) {
                                summedExp[accountId] = { total: 0, finalistica: 0 }
                            }
                            summedExp[accountId].total += values.total
                            summedExp[accountId].finalistica += values.finalistica
                        })
                    })

                    // Sum revenues
                    const summedRev: any = {}
                    Object.values(allRevData).forEach((orgData: any) => {
                        Object.entries(orgData).forEach(([accountId, values]: [string, any]) => {
                            if (!summedRev[accountId]) {
                                summedRev[accountId] = { value: 0 }
                            }
                            summedRev[accountId].value += values.value
                        })
                    })

                    setExpenseData(summedExp)
                    setRevenueData(summedRev)
                } else {
                    setExpenseData(allExpData[selectedRegional] || {})
                    setRevenueData(allRevData[selectedRegional] || {})
                }
            }

            setLoading(false)
        }

        loadData()
    }, [viewMode, selectedRegional])

    // Print logic
    useEffect(() => {
        if (!loading && isPrintMode) {
            // Small delay to ensure charts are rendered
            setTimeout(() => {
                window.print()
            }, 5000)
        }
    }, [loading, isPrintMode])

    const isCFA = orgType === 'CFA'

    // Calculate totals
    const analyticalAccounts = accounts.filter(a => a.type === 'Analítica')
    const analyticalRevenues = revenues.filter(r => r.type === 'Analítica')

    let totalExpenses = 0
    let totalExpensesCorrentes = 0
    let totalExpensesCapital = 0

    analyticalAccounts.forEach(acc => {
        const val = expenseData[acc.id]?.total || 0
        totalExpenses += val

        if (acc.id.startsWith('1')) {
            totalExpensesCorrentes += val
        } else if (acc.id.startsWith('2')) {
            totalExpensesCapital += val
        }
    })

    let totalRevenues = 0
    let totalRevenuesCorrentes = 0
    let totalRevenuesCapital = 0

    analyticalRevenues.forEach(rev => {
        const val = revenueData[rev.id]?.value || 0
        totalRevenues += val

        if (rev.id.startsWith('1')) {
            totalRevenuesCorrentes += val
        } else if (rev.id.startsWith('2')) {
            totalRevenuesCapital += val
        }
    })

    const balance = totalRevenues - totalExpenses
    const balanceCorrentes = totalRevenuesCorrentes - totalExpensesCorrentes
    const balanceCapital = totalRevenuesCapital - totalExpensesCapital

    // Comparison chart data
    const comparisonData = [
        {
            category: 'Correntes',
            receitas: totalRevenuesCorrentes,
            despesas: totalExpensesCorrentes,
            saldo: balanceCorrentes
        },
        {
            category: 'Capital',
            receitas: totalRevenuesCapital,
            despesas: totalExpensesCapital,
            saldo: balanceCapital
        }
    ]

    // Balance pie chart
    const balanceData = [
        { name: 'Receitas', value: totalRevenues },
        { name: 'Despesas', value: totalExpenses }
    ]

    if (loading) {
        return <div className="text-center py-12">Carregando dados...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center print:hidden">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Dashboard Comparativo</h1>
                    <p className="text-slate-500">Análise comparativa de receitas e despesas</p>
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

            {/* Header for Print Mode Only */}
            <div className="hidden print:block mb-4 text-center">
                <h1 className="text-2xl font-bold uppercase">Dashboard Comparativo</h1>
                <p className="text-sm text-slate-500">Período: 2025</p>
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-green-100 bg-green-50/50">
                    <CardHeader className="pb-2 px-3 pt-3">
                        <CardTitle className="text-xs font-medium text-green-700 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Total de Receitas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        <div className="text-2xl font-bold text-green-900">
                            {totalRevenues.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-red-100 bg-red-50/50">
                    <CardHeader className="pb-2 px-3 pt-3">
                        <CardTitle className="text-xs font-medium text-red-700 flex items-center gap-2">
                            <TrendingDown className="h-4 w-4" />
                            Total de Despesas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        <div className="text-2xl font-bold text-red-900">
                            {totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </CardContent>
                </Card>

                <Card className={`border-2 ${balance >= 0 ? 'border-blue-300 bg-blue-50' : 'border-orange-300 bg-orange-50'}`}>
                    <CardHeader className="pb-2 px-3 pt-3">
                        <CardTitle className={`text-xs font-medium flex items-center gap-2 ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                            <DollarSign className="h-4 w-4" />
                            {balance >= 0 ? 'Superávit' : 'Déficit'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        <div className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-950' : 'text-orange-950'}`}>
                            {Math.abs(balance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <div className={`text-xs font-medium ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {totalRevenues > 0 ? ((Math.abs(balance) / totalRevenues) * 100).toFixed(1) : 0}% das receitas
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 bg-slate-50">
                    <CardHeader className="pb-2 px-3 pt-3">
                        <CardTitle className="text-xs font-medium text-slate-700">
                            Taxa de Execução
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        <div className="text-2xl font-bold text-slate-900">
                            {totalRevenues > 0 ? ((totalExpenses / totalRevenues) * 100).toFixed(1) : 0}%
                        </div>
                        <div className="text-xs text-slate-600">
                            Despesas / Receitas
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Comparison Bar Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Receitas vs Despesas</CardTitle>
                        <CardDescription>Comparação por categoria</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={comparisonData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="category" />
                                <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                                <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                                <Legend />
                                <Bar dataKey="receitas" fill={COLORS.revenue} name="Receitas" />
                                <Bar dataKey="despesas" fill={COLORS.expense} name="Despesas" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Balance Pie Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Distribuição Orçamentária</CardTitle>
                        <CardDescription>Proporção receitas vs despesas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={balanceData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    <Cell fill={COLORS.revenue} />
                                    <Cell fill={COLORS.expense} />
                                </Pie>
                                <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Balance by Category */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Saldo por Categoria</CardTitle>
                        <CardDescription>Superávit/Déficit em Correntes e Capital</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart data={comparisonData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="category" />
                                <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                                <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                                <Legend />
                                <Bar dataKey="receitas" fill={COLORS.revenue} name="Receitas" />
                                <Bar dataKey="despesas" fill={COLORS.expense} name="Despesas" />
                                <Line type="monotone" dataKey="saldo" stroke={COLORS.surplus} strokeWidth={3} name="Saldo" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Análise Detalhada</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <h3 className="text-sm font-medium text-slate-600 mb-2">Correntes</h3>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-green-600">Receitas:</span>
                                        <span className="font-medium">{totalRevenuesCorrentes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-red-600">Despesas:</span>
                                        <span className="font-medium">{totalExpensesCorrentes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                    <div className={`flex justify-between text-sm font-bold pt-2 border-t ${balanceCorrentes >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                        <span>Saldo:</span>
                                        <span>{balanceCorrentes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-lg">
                                <h3 className="text-sm font-medium text-slate-600 mb-2">Capital</h3>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-green-600">Receitas:</span>
                                        <span className="font-medium">{totalRevenuesCapital.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-red-600">Despesas:</span>
                                        <span className="font-medium">{totalExpensesCapital.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                    <div className={`flex justify-between text-sm font-bold pt-2 border-t ${balanceCapital >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                        <span>Saldo:</span>
                                        <span>{balanceCapital.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50 rounded-lg">
                                <h3 className="text-sm font-medium text-blue-900 mb-2">Total Geral</h3>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-green-700">Receitas:</span>
                                        <span className="font-medium">{totalRevenues.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-red-700">Despesas:</span>
                                        <span className="font-medium">{totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                    <div className={`flex justify-between text-sm font-bold pt-2 border-t ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                                        <span>Saldo:</span>
                                        <span>{balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

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
                    /* Force 4-column layout for summary cards in comparativo */
                    .md\\:grid-cols-4 {
                        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                    }
                    /* Force 2-column layout for charts */
                    .lg\\:grid-cols-2 {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
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

export default function ComparativeDashboardPage() {
    return (
        <Suspense fallback={<div>Carregando dashboard comparativo...</div>}>
            <ComparativeDashboardContent />
        </Suspense>
    )
}
