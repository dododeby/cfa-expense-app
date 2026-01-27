"use client"

import { useEffect, useState } from "react"
import PrintableReport from "@/components/printable-report"
import { loadResponsibleData, ResponsibleData } from "@/lib/responsible-data"
import { logAuditAction } from "@/lib/audit-utils"
import { supabase } from "@/lib/supabase"

export default function ReciboEntregaPage() {
    const [loading, setLoading] = useState(true)
    const [orgName, setOrgName] = useState('')
    const [orgType, setOrgType] = useState('')
    const [responsible, setResponsible] = useState<ResponsibleData | null>(null)
    const [declaration, setDeclaration] = useState<any>(null)
    const [history, setHistory] = useState<any[]>([])

    useEffect(() => {
        const load = async () => {
            const name = sessionStorage.getItem('orgName') || 'Organização'
            const type = sessionStorage.getItem('orgType') || ''
            setOrgName(name)
            setOrgType(type)

            const orgId = sessionStorage.getItem('orgId') || ''
            if (orgId) {
                const respData = await loadResponsibleData(orgId)
                setResponsible(respData)

                // Load latest declaration
                const { data: dec } = await supabase
                    .from('declarations')
                    .select('*')
                    .eq('organization_id', orgId)
                    .order('delivery_date', { ascending: false })
                    .limit(1)
                    .single()

                if (dec) {
                    setDeclaration(dec)

                    // Load history (all declarations)
                    const { data: hist } = await supabase
                        .from('declarations')
                        .select('*')
                        .eq('organization_id', orgId)
                        .order('delivery_date', { ascending: false })

                    if (hist) setHistory(hist)
                }
            }

            setLoading(false)
        }
        load()
    }, [])

    if (loading) return <div>Carregando...</div>

    // Logic for date restriction
    const currentDate = new Date()
    const releaseDate = new Date('2026-04-01')

    // Unlocked if: CFA OR (Date >= Release Date) OR (Declaration Exists)
    const isCFA = orgType === 'CFA' || orgName.includes('Federal')
    const isReleased = currentDate >= releaseDate
    const hasDeclaration = !!declaration

    // If NOT CFA and NOT Released and NO Declaration, block it
    if (!isCFA && !isReleased && !hasDeclaration) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center border-t-4 border-yellow-500">
                    <h1 className="text-xl font-bold text-slate-800 mb-4">Documento Indisponível</h1>
                    <p className="text-slate-600 mb-6">
                        O Recibo de Entrega para o exercício de 2025 estará disponível após a entrega da declaração ou a partir de:
                    </p>
                    <div className="text-2xl font-bold text-blue-800 bg-blue-50 py-3 rounded mb-6">
                        01/04/2026
                    </div>
                </div>
            </div>
        )
    }

    const CfaFooter = (
        <div className="text-center text-sm font-medium text-slate-700 mt-12 space-y-1 border-t border-slate-300 pt-6">
            <p className="font-bold text-base">CFA - Conselho Federal de Administração</p>
            <p>CNPJ: 34.061.135/0001-89</p>
            <p>SAUS Quadra 1 Bloco "L" CEP:70070-932 - Brasília - DF</p>
        </div>
    )

    const receiptNumber = declaration?.receipt_number || "PENDENTE"
    const receiptDate = declaration ? new Date(declaration.delivery_date) : currentDate

    return (
        <PrintableReport
            title="Recibo de Entrega"
            organizationName={orgName}
            organizationCnpj={responsible?.cnpj}
            hideOrganizationInfo={true}
            customFooter={CfaFooter}
        >
            <div className="space-y-6 font-serif leading-relaxed text-justify px-8 py-2">

                <div className="text-center font-bold text-lg mb-4 uppercase">
                    Conselho Federal de Administração <br />
                    Recibo n° {receiptNumber}/2025
                    {declaration?.is_rectification && <span className="block text-amber-600 text-sm mt-1">(Retificadora nº {declaration.rectification_count})</span>}
                </div>

                <div className="text-center text-sm text-slate-500 mb-8">
                    Entregue em: {receiptDate.toLocaleString('pt-BR')}
                </div>

                <div className="space-y-4 text-slate-900 border p-6 rounded-lg bg-slate-50/50 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <span className="font-bold block text-slate-700 uppercase text-xs">Unidade de Preenchimento</span>
                            <span className="text-lg">{orgName}</span>
                        </div>
                        <div>
                            <span className="font-bold block text-slate-700 uppercase text-xs">CNPJ</span>
                            <span className="text-lg font-mono">{responsible?.cnpj || 'Não informado'}</span>
                        </div>

                        {/* Reordered: President First */}
                        <div>
                            <span className="font-bold block text-slate-700 uppercase text-xs">Responsável pela Unidade (Presidente)</span>
                            <span className="text-lg">{responsible?.unitResponsibleName || 'Não informado'}</span>
                        </div>
                        <div>
                            <span className="font-bold block text-slate-700 uppercase text-xs">CRA (Presidente)</span>
                            <span className="text-lg">{responsible?.unitResponsibleCraNumber || 'Não informado'}</span>
                        </div>

                        {/* Then Data Responsible */}
                        <div>
                            <span className="font-bold block text-slate-700 uppercase text-xs">Responsável pelo Preenchimento</span>
                            <span className="text-lg">{responsible?.dataResponsibleName || 'Não informado'}</span>
                        </div>
                        <div>
                            <span className="font-bold block text-slate-700 uppercase text-xs">Cargo/Função</span>
                            <span className="text-lg">{responsible?.dataResponsibleRole || 'Não informado'}</span>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 my-2"></div>

                    {declaration ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="font-bold block text-slate-700 uppercase text-xs">Receita Total</span>
                                <span className="text-lg text-blue-800">
                                    {declaration.total_revenue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                            <div>
                                <span className="font-bold block text-slate-700 uppercase text-xs">Despesa Total</span>
                                <span className="text-lg text-red-800">
                                    {declaration.total_expense?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-slate-500 italic">Pré-visualização do recibo.</p>
                    )}

                    <p className="text-base leading-loose mt-4">
                        Declaramos que recebemos as informações prestadas pelo <strong>{orgName}</strong>,
                        referentes ao exercício de <strong>2025</strong>.
                    </p>
                </div>

                <div className="text-center mt-8 text-lg">
                    Brasília, {receiptDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                </div>

                {/* History Section */}
                {history.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-slate-200">
                        <h4 className="font-bold text-sm uppercase text-slate-600 mb-4">Histórico de Entregas</h4>
                        <table className="w-full text-xs text-left">
                            <thead>
                                <tr className="border-b border-slate-300">
                                    <th className="py-2">Data/Hora</th>
                                    <th className="py-2">Tipo</th>
                                    <th className="py-2">Recibo</th>
                                    <th className="py-2 text-right">Receita</th>
                                    <th className="py-2 text-right">Despesa</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((h) => (
                                    <tr key={h.id} className="border-b border-slate-100">
                                        <td className="py-2">{new Date(h.delivery_date).toLocaleString('pt-BR')}</td>
                                        <td className="py-2">
                                            {h.is_rectification ? `Retificadora (${h.rectification_count})` : 'Original'}
                                        </td>
                                        <td className="py-2 font-mono">{h.receipt_number}</td>
                                        <td className="py-2 text-right">{h.total_revenue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        <td className="py-2 text-right">{h.total_expense?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </PrintableReport>
    )
}
