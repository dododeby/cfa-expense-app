"use client"

import { useEffect, useState } from "react"
import PrintableReport from "@/components/printable-report"
import { loadExpenseData } from "@/lib/expense-data"
import { loadResponsibleData, ResponsibleData } from "@/lib/responsible-data"
import { logAuditAction } from "@/lib/audit-utils"
import allAccountsData from "@/lib/all-accounts.json"

interface Account {
    id: string
    group: string
    subgroup: string
    type: string
    name: string
}

export default function RelatorioDespesasPage() {
    const [data, setData] = useState<any>({})
    const [loading, setLoading] = useState(true)
    const [responsible, setResponsible] = useState<ResponsibleData | null>(null)
    const [orgName, setOrgName] = useState('')

    useEffect(() => {
        const load = async () => {
            const result = await loadExpenseData()
            setData(result)
            setOrgName(sessionStorage.getItem('orgName') || 'Organização')

            const orgId = sessionStorage.getItem('orgId') || ''
            if (orgId) {
                const respData = await loadResponsibleData(orgId)
                setResponsible(respData)
            }

            // Log report generation
            await logAuditAction({
                actionType: 'report_generated',
                actionDetails: { reportType: 'Relatório de Despesas', title: 'Relatório Detalhado de Despesas' }
            })

            setLoading(false)
        }
        load()
    }, [])

    if (loading) return <div>Carregando...</div>

    const accounts = allAccountsData as Account[]
    const analyticalAccounts = accounts.filter(a => a.type === 'Analítica')

    // Calculate totals
    let total = 0
    let totalCorrentes = 0
    let totalCapital = 0

    analyticalAccounts.forEach(acc => {
        const val = data[acc.id]?.total || 0
        total += val

        if (acc.id.startsWith('1')) totalCorrentes += val
        else if (acc.id.startsWith('2')) totalCapital += val
    })

    return (
        <PrintableReport
            title="Relatório Detalhado de Despesas"
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
                    <div className="bg-slate-50 p-4 border rounded-lg">
                        <p className="text-sm font-medium text-slate-500">Total de Despesas</p>
                        <p className="text-xl font-bold text-slate-900">
                            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div className="bg-blue-50 p-4 border border-blue-100 rounded-lg">
                        <p className="text-sm font-medium text-blue-600">Despesas Correntes</p>
                        <p className="text-lg font-bold text-blue-900">
                            {totalCorrentes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div className="bg-orange-50 p-4 border border-orange-100 rounded-lg">
                        <p className="text-sm font-medium text-orange-600">Despesas de Capital</p>
                        <p className="text-lg font-bold text-orange-900">
                            {totalCapital.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                </div>

                {/* Table */}
                <div className="border rounded-lg overflow-hidden break-inside-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700 w-24">Conta</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">Descrição</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-700 w-32">Finalística</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-700 w-32">Apoio</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-700 w-32">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {analyticalAccounts.map((acc, index) => {
                                const rowData = data[acc.id] || {}
                                const rowTotal = rowData.total || 0
                                const finalistica = rowData.finalistica || 0
                                const apoio = rowTotal - finalistica

                                if (rowTotal === 0) return null

                                return (
                                    <tr key={acc.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                        <td className="px-4 py-2 font-mono text-slate-600">{acc.id}</td>
                                        <td className="px-4 py-2 text-slate-700">{acc.name}</td>
                                        <td className="px-4 py-2 text-right text-slate-600">
                                            {finalistica.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="px-4 py-2 text-right text-slate-600">
                                            {apoio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="px-4 py-2 text-right font-medium text-slate-900">
                                            {rowTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot className="bg-slate-100 border-t font-semibold">
                            <tr>
                                <td className="px-4 py-3 text-right" colSpan={4}>Total Geral</td>
                                <td className="px-4 py-3 text-right text-slate-900">
                                    {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </PrintableReport>
    )
}
