"use client"

import { useEffect, useState } from "react"
import PrintableReport from "@/components/printable-report"
import { loadRevenueData } from "@/lib/revenue-data"
import { loadResponsibleData, ResponsibleData } from "@/lib/responsible-data"
import { logAuditAction } from "@/lib/audit-utils"
import allRevenuesData from "@/lib/all-revenues.json"

interface RevenueAccount {
    id: string
    name: string
    type: string
}

export default function RelatorioReceitasPage() {
    const [data, setData] = useState<any>({})
    const [loading, setLoading] = useState(true)
    const [orgName, setOrgName] = useState('')
    const [responsible, setResponsible] = useState<ResponsibleData | null>(null)

    useEffect(() => {
        const load = async () => {
            const result = await loadRevenueData()
            setData(result)
            const name = sessionStorage.getItem('orgName') || 'Organização'
            setOrgName(name)

            const orgId = sessionStorage.getItem('orgId') || ''
            if (orgId) {
                const respData = await loadResponsibleData(orgId)
                setResponsible(respData)
            }

            // Log report generation
            await logAuditAction({
                actionType: 'report_generated',
                actionDetails: { reportType: 'Relatório de Receitas', title: 'Relatório Detalhado de Receitas' }
            })

            setLoading(false)
        }
        load()
    }, [])

    if (loading) return <div>Carregando...</div>

    const revenues = allRevenuesData as RevenueAccount[]
    const analyticalRevenues = revenues.filter(r => r.type === 'Analítica')

    // Calculate totals
    let total = 0
    analyticalRevenues.forEach(rev => {
        total += data[rev.id]?.value || 0
    })

    return (
        <PrintableReport
            title="Relatório Detalhado de Receitas"
            organizationName={orgName}
            organizationCnpj={responsible?.cnpj}
            presidentName={responsible?.unitResponsibleName}
            presidentRole={`Presidente - CRA n° ${responsible?.unitResponsibleCraNumber || '_____'}`}
            responsibleName={responsible?.dataResponsibleName}
            responsibleRole={`${responsible?.dataResponsibleRole || 'Contador'} - ${responsible?.dataResponsibleDocType || ''} n° ${responsible?.dataResponsibleDocNumber || '_____'}`}
        >
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 p-4 border rounded-lg break-inside-avoid">
                        <p className="text-sm font-medium text-slate-500">Total de Receitas</p>
                        <p className="text-2xl font-bold text-slate-900">
                            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div className="bg-slate-50 p-4 border rounded-lg break-inside-avoid">
                        <p className="text-sm font-medium text-slate-500">Período</p>
                        <p className="text-lg font-bold text-slate-900">
                            {new Date().getFullYear()}
                        </p>
                    </div>
                </div>

                <div className="border rounded-lg overflow-hidden break-inside-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700 w-24">Conta</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">Descrição</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-700 w-40">Valor Arrecadado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {analyticalRevenues.map((rev, index) => {
                                const value = data[rev.id]?.value || 0
                                if (value === 0) return null // Hide zero values? Or keep for completeness? keeping non-zero for report clarity usually better

                                return (
                                    <tr key={rev.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                        <td className="px-4 py-2 font-mono text-slate-600">{rev.id}</td>
                                        <td className="px-4 py-2 text-slate-700">{rev.name}</td>
                                        <td className="px-4 py-2 text-right font-medium text-slate-900">
                                            {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot className="bg-slate-100 border-t font-semibold">
                            <tr>
                                <td className="px-4 py-3 text-right" colSpan={2}>Total Geral</td>
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
