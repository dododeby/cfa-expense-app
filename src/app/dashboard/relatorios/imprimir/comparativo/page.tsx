"use client"

import { useEffect, useState } from "react"
import PrintableReport from "@/components/printable-report"
import { loadExpenseData } from "@/lib/expense-data"
import { loadRevenueData } from "@/lib/revenue-data"
import { loadResponsibleData, ResponsibleData } from "@/lib/responsible-data"
import { logAuditAction } from "@/lib/audit-utils"
import allAccountsData from "@/lib/all-accounts.json"
import allRevenuesData from "@/lib/all-revenues.json"

interface ComparisonRow {
    category: string
    revenue: number
    expense: number
    balance: number
}

export default function RelatorioComparativoPage() {
    const [stats, setStats] = useState<ComparisonRow[]>([])
    const [loading, setLoading] = useState(true)
    const [totals, setTotals] = useState({ revenue: 0, expense: 0, balance: 0 })
    const [responsible, setResponsible] = useState<ResponsibleData | null>(null)
    const [orgName, setOrgName] = useState('')

    useEffect(() => {
        const load = async () => {
            // Parallel fetch
            const [expData, revData] = await Promise.all([
                loadExpenseData(),
                loadRevenueData()
            ])

            setOrgName(sessionStorage.getItem('orgName') || 'Organização')
            const orgId = sessionStorage.getItem('orgId') || ''
            if (orgId) {
                const respData = await loadResponsibleData(orgId)
                setResponsible(respData)
            }

            const accounts = allAccountsData.filter(a => a.type === 'Analítica')
            const revenues = allRevenuesData.filter(r => r.type === 'Analítica')

            // Calculate Expense Totals
            let totalExp = 0
            let expCorrentes = 0
            let expCapital = 0

            accounts.forEach(acc => {
                const val = expData[acc.id]?.total || 0
                totalExp += val
                if (acc.id.startsWith('1')) expCorrentes += val
                else if (acc.id.startsWith('2')) expCapital += val
            })

            // Calculate Revenue Totals
            let totalRev = 0
            let revCorrentes = 0
            let revCapital = 0

            revenues.forEach(rev => {
                const val = revData[rev.id]?.value || 0
                totalRev += val
                if (rev.id.startsWith('1')) revCorrentes += val
                else if (rev.id.startsWith('2')) revCapital += val
            })

            setStats([
                {
                    category: '4.1/3.1 - Receitas/Despesas Correntes',
                    revenue: revCorrentes,
                    expense: expCorrentes,
                    balance: revCorrentes - expCorrentes
                },
                {
                    category: '4.2/3.2 - Receitas/Despesas de Capital',
                    revenue: revCapital,
                    expense: expCapital,
                    balance: revCapital - expCapital
                }
            ])

            setTotals({
                revenue: totalRev,
                expense: totalExp,
                balance: totalRev - totalExp
            })

            // Log report generation
            await logAuditAction({
                actionType: 'report_generated',
                actionDetails: { reportType: 'Relatório Comparativo', title: 'Relatório Comparativo de Receitas e Despesas' }
            })

            setLoading(false)
        }
        load()
    }, [])

    if (loading) return <div>Carregando...</div>

    return (
        <PrintableReport
            title="Relatório Comparativo de Receitas e Despesas"
            organizationName={orgName}
            organizationCnpj={responsible?.cnpj}
            presidentName={responsible?.unitResponsibleName}
            presidentRole={`Presidente - CRA n° ${responsible?.unitResponsibleCraNumber || '_____'}`}
            responsibleName={responsible?.dataResponsibleName}
            responsibleRole={`${responsible?.dataResponsibleRole || 'Contador'} - ${responsible?.dataResponsibleDocType || ''} n° ${responsible?.dataResponsibleDocNumber || '_____'}`}
        >
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6 break-inside-avoid">
                    <div className="bg-green-50 p-4 border border-green-100 rounded-lg">
                        <p className="text-sm font-medium text-green-700">Total Receitas</p>
                        <p className="text-xl font-bold text-green-900">
                            {totals.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div className="bg-red-50 p-4 border border-red-100 rounded-lg">
                        <p className="text-sm font-medium text-red-700">Total Despesas</p>
                        <p className="text-xl font-bold text-red-900">
                            {totals.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div className={`p-4 border rounded-lg ${totals.balance >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                        <p className={`text-sm font-medium ${totals.balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                            Saldo (Superávit/Déficit)
                        </p>
                        <p className={`text-xl font-bold ${totals.balance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                            {totals.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                </div>

                <div className="border rounded-lg overflow-hidden break-inside-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">Categoria Econômica</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-700 w-32">Receitas</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-700 w-32">Despesas</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-700 w-32">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {stats.map((row, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    <td className="px-4 py-3 font-medium text-slate-700">{row.category}</td>
                                    <td className="px-4 py-3 text-right text-green-600">
                                        {row.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="px-4 py-3 text-right text-red-600">
                                        {row.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-bold ${row.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                        {row.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-100 border-t font-semibold">
                            <tr>
                                <td className="px-4 py-3 text-right">Totais</td>
                                <td className="px-4 py-3 text-right text-green-800">
                                    {totals.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td className="px-4 py-3 text-right text-red-800">
                                    {totals.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td className={`px-4 py-3 text-right ${totals.balance >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                                    {totals.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="bg-white border rounded-lg p-6 mt-6 break-inside-avoid">
                    <h3 className="font-semibold text-slate-900 mb-4 border-b pb-2">Análise de Resultado</h3>
                    <div className="space-y-2 text-sm text-slate-700">
                        <p>
                            O resultado orçamentário do período apresenta um
                            <span className={`font-bold ${totals.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}> {totals.balance >= 0 ? 'SUPERÁVIT' : 'DÉFICIT'} </span>
                            de {totals.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.
                        </p>
                        <p>
                            A taxa de execução da despesa em relação à receita arrecadada foi de
                            <span className="font-bold"> {totals.revenue > 0 ? ((totals.expense / totals.revenue) * 100).toFixed(2) : 0}%</span>.
                        </p>
                    </div>
                </div>
            </div>
        </PrintableReport>
    )
}
