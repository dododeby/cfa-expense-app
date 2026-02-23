"use client"

import { useEffect, useState } from "react"
import PrintableReport from "@/components/printable-report"
import { loadResponsibleData, ResponsibleData } from "@/lib/responsible-data"
import { supabase } from "@/lib/supabase"
import allRevenues from "@/lib/all-revenues.json"
import allAccounts from "@/lib/all-accounts.json"

// Build a lookup map: account_id => { name, type, subgroup }
const accountMap = new Map(
    (allAccounts as { id: string; name: string; type: string; subgroup: string; group: string }[]).map(a => [a.id, a])
)

const fmt = (value: number) =>
    value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00'

export default function ReciboEntregaPage() {
    const [loading, setLoading] = useState(true)
    const [orgName, setOrgName] = useState('')
    const [orgType, setOrgType] = useState('')
    const [orgId, setOrgId] = useState('')
    const [responsible, setResponsible] = useState<ResponsibleData | null>(null)
    const [declaration, setDeclaration] = useState<any>(null)
    const [history, setHistory] = useState<any[]>([])

    useEffect(() => {
        const load = async () => {
            const name = sessionStorage.getItem('orgName') || 'Organização'
            const type = sessionStorage.getItem('orgType') || ''
            const id = sessionStorage.getItem('orgId') || ''
            setOrgName(name)
            setOrgType(type)
            setOrgId(id)

            if (id) {
                const respData = await loadResponsibleData(id)
                setResponsible(respData)

                // Load latest declaration
                const { data: dec } = await supabase
                    .from('declarations')
                    .select('*')
                    .eq('organization_id', id)
                    .order('delivery_date', { ascending: false })
                    .limit(1)
                    .single()

                if (dec) {
                    setDeclaration(dec)

                    // Load history (all declarations)
                    const { data: hist } = await supabase
                        .from('declarations')
                        .select('*')
                        .eq('organization_id', id)
                        .order('delivery_date', { ascending: false })

                    if (hist) setHistory(hist)
                }
            }

            setLoading(false)
        }
        load()
    }, [])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center text-slate-500">
            Carregando recibo...
        </div>
    )

    // Logic for access restriction
    const isCFA = orgType === 'CFA' || orgName.includes('Federal')
    const hasDeclaration = !!declaration

    // Only CFA or orgs that have delivered can see the receipt
    if (!isCFA && !hasDeclaration) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center border-t-4 border-yellow-500">
                    <h1 className="text-xl font-bold text-slate-800 mb-4">Documento Indisponível</h1>
                    <p className="text-slate-600 mb-6">
                        O Recibo de Entrega só está disponível após a entrega da declaração anual ao CFA.
                        Acesse <strong>Entrega de Declaração</strong> para enviar seus dados.
                    </p>
                    <div className="text-sm text-slate-400">
                        Status: Declaração <span className="font-semibold text-amber-600">Pendente</span>
                    </div>
                </div>
            </div>
        )
    }

    const currentDate = new Date()
    const receiptNumber = declaration?.receipt_number || "PENDENTE"
    const receiptDate = declaration ? new Date(declaration.delivery_date) : currentDate

    // Extract snapshot data for the mirror
    const snapshot = declaration?.snapshot || {}
    const snapshotRevenues: Record<string, { value: number }> = snapshot.revenues || {}
    const snapshotExpenses: Record<string, { total: number; finalistica: number }> = snapshot.expenses || {}

    // Revenue rows that have a value
    const revenueRows = (allRevenues as { id: string; name: string; type: string }[])
        .filter(acc => snapshotRevenues[acc.id]?.value)
        .map(acc => ({
            id: acc.id,
            name: acc.name,
            type: acc.type,
            value: snapshotRevenues[acc.id]?.value || 0
        }))

    const totalRevenue = revenueRows.filter(r => r.id === '1' || r.id === '2' || r.type === 'Analítica')
        .reduce((sum, r) => (r.type === 'Analítica' ? sum + r.value : sum), 0)

    // Expense rows that have values, enriched with account name
    const expenseRows = Object.entries(snapshotExpenses)
        .filter(([, v]) => v.total > 0)
        .map(([id, v]) => {
            const acc = accountMap.get(id)
            return {
                id,
                name: acc?.name ?? id,
                type: acc?.type ?? '',
                subgroup: acc?.subgroup ?? '',
                total: v.total,
                finalistica: v.finalistica,
                apoio: v.total - v.finalistica
            }
        })
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))

    const totalExpense = expenseRows.reduce((sum, r) => sum + r.total, 0)
    const totalFinalistica = expenseRows.reduce((sum, r) => sum + r.finalistica, 0)
    const totalApoio = expenseRows.reduce((sum, r) => sum + r.apoio, 0)

    const CfaFooter = (
        <div className="text-center text-sm font-medium text-slate-700 mt-12 space-y-1 border-t border-slate-300 pt-6">
            <p className="font-bold text-base">CFA - Conselho Federal de Administração</p>
            <p>CNPJ: 34.061.135/0001-89</p>
            <p>SAUS Quadra 1 Bloco &quot;L&quot; CEP:70070-932 - Brasília - DF</p>
        </div>
    )

    return (
        <PrintableReport
            title="Recibo de Entrega"
            organizationName={orgName}
            organizationCnpj={responsible?.cnpj}
            hideOrganizationInfo={true}
            customFooter={CfaFooter}
        >
            <div className="space-y-6 font-serif leading-relaxed text-justify px-8 py-2">

                {/* ── CABEÇALHO DO RECIBO ── */}
                <div className="text-center font-bold text-lg mb-4 uppercase">
                    Conselho Federal de Administração <br />
                    Recibo n° {receiptNumber}/2025
                    {declaration?.is_rectification && (
                        <span className="block text-amber-600 text-sm mt-1">
                            (Retificadora nº {declaration.rectification_count})
                        </span>
                    )}
                </div>

                <div className="text-center text-sm text-slate-500 mb-8">
                    Entregue em: {receiptDate.toLocaleString('pt-BR')}
                </div>

                {/* ── DADOS DA ORGANIZAÇÃO ── */}
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

                        <div>
                            <span className="font-bold block text-slate-700 uppercase text-xs">Responsável pela Unidade (Presidente)</span>
                            <span className="text-lg">{responsible?.unitResponsibleName || declaration?.responsible_unit_name || 'Não informado'}</span>
                        </div>
                        <div>
                            <span className="font-bold block text-slate-700 uppercase text-xs">CRA (Presidente)</span>
                            <span className="text-lg">{responsible?.unitResponsibleCraNumber || declaration?.responsible_unit_cra || 'Não informado'}</span>
                        </div>

                        <div>
                            <span className="font-bold block text-slate-700 uppercase text-xs">Responsável pelo Preenchimento</span>
                            <span className="text-lg">{responsible?.dataResponsibleName || declaration?.responsible_data_name || 'Não informado'}</span>
                        </div>
                        <div>
                            <span className="font-bold block text-slate-700 uppercase text-xs">Cargo/Função</span>
                            <span className="text-lg">{responsible?.dataResponsibleRole || declaration?.responsible_data_role || 'Não informado'}</span>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 my-2"></div>

                    {declaration ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="font-bold block text-slate-700 uppercase text-xs">Receita Total</span>
                                <span className="text-lg text-blue-800">
                                    {fmt(declaration.total_revenue)}
                                </span>
                            </div>
                            <div>
                                <span className="font-bold block text-slate-700 uppercase text-xs">Despesa Total</span>
                                <span className="text-lg text-red-800">
                                    {fmt(declaration.total_expense)}
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

                {/* ── HISTÓRICO DE ENTREGAS ── */}
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
                                        <td className="py-2 text-right">{fmt(h.total_revenue)}</td>
                                        <td className="py-2 text-right">{fmt(h.total_expense)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ══════════════════════════════════════════════ */}
                {/* ── ESPELHO DAS RECEITAS PREENCHIDAS ──        */}
                {/* ══════════════════════════════════════════════ */}
                {revenueRows.length > 0 && (
                    <div className="mt-10 pt-8 border-t-2 border-slate-300 break-before-page">
                        <h3 className="text-center font-bold text-base uppercase text-slate-800 mb-1">
                            Espelho das Receitas — Exercício 2025
                        </h3>
                        <p className="text-center text-xs text-slate-500 mb-6">
                            Dados conforme preenchimento registrado no ato da entrega
                        </p>

                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-blue-900 text-white">
                                    <th className="py-2 px-3 text-left font-semibold">Cód.</th>
                                    <th className="py-2 px-3 text-left font-semibold">Conta</th>
                                    <th className="py-2 px-3 text-left font-semibold">Tipo</th>
                                    <th className="py-2 px-3 text-right font-semibold">Valor (R$)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {revenueRows.map((row, i) => (
                                    <tr
                                        key={row.id}
                                        className={`border-b border-slate-200 ${row.type === 'Sintética'
                                            ? 'bg-blue-50 font-semibold text-blue-900'
                                            : i % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                                            }`}
                                    >
                                        <td className="py-1.5 px-3 font-mono">{row.id}</td>
                                        <td className="py-1.5 px-3">{row.name}</td>
                                        <td className="py-1.5 px-3 text-slate-500">{row.type}</td>
                                        <td className="py-1.5 px-3 text-right font-medium">
                                            {fmt(row.value)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-blue-900 text-white font-bold">
                                    <td colSpan={3} className="py-2 px-3">TOTAL GERAL DE RECEITAS</td>
                                    <td className="py-2 px-3 text-right">{fmt(declaration?.total_revenue ?? totalRevenue)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {/* ══════════════════════════════════════════════ */}
                {/* ── ESPELHO DAS DESPESAS PREENCHIDAS ──        */}
                {/* ══════════════════════════════════════════════ */}
                {expenseRows.length > 0 && (
                    <div className="mt-10 pt-8 border-t-2 border-slate-300">
                        <h3 className="text-center font-bold text-base uppercase text-slate-800 mb-1">
                            Espelho das Despesas — Exercício 2025
                        </h3>
                        <p className="text-center text-xs text-slate-500 mb-6">
                            Dados conforme preenchimento registrado no ato da entrega
                        </p>

                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-800 text-white">
                                    <th className="py-2 px-3 text-left font-semibold">Cód.</th>
                                    <th className="py-2 px-3 text-left font-semibold">Conta</th>
                                    <th className="py-2 px-3 text-right font-semibold">Total (R$)</th>
                                    <th className="py-2 px-3 text-right font-semibold">Finalística (R$)</th>
                                    <th className="py-2 px-3 text-right font-semibold">Apoio (R$)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenseRows.map((row, i) => (
                                    <tr
                                        key={row.id}
                                        className={`border-b border-slate-200 ${row.type === 'Sintética'
                                                ? 'bg-slate-100 font-semibold text-slate-800'
                                                : i % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                                            }`}
                                    >
                                        <td className="py-1.5 px-3 font-mono">{row.id}</td>
                                        <td className="py-1.5 px-3">{row.name}</td>
                                        <td className="py-1.5 px-3 text-right font-medium">{fmt(row.total)}</td>
                                        <td className="py-1.5 px-3 text-right text-blue-700">{fmt(row.finalistica)}</td>
                                        <td className="py-1.5 px-3 text-right text-orange-700">{fmt(row.apoio)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-800 text-white font-bold text-xs">
                                    <td colSpan={2} className="py-2 px-3">TOTAL GERAL DE DESPESAS</td>
                                    <td className="py-2 px-3 text-right">{fmt(declaration?.total_expense ?? totalExpense)}</td>
                                    <td className="py-2 px-3 text-right">{fmt(declaration?.total_finalistica ?? totalFinalistica)}</td>
                                    <td className="py-2 px-3 text-right">{fmt(declaration?.total_apoio ?? totalApoio)}</td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* Resumo final */}
                        <div className="mt-6 border border-slate-300 rounded-lg overflow-hidden">
                            <div className="bg-slate-100 px-4 py-2 font-bold text-xs uppercase text-slate-700">
                                Resumo por Natureza — Despesas
                            </div>
                            <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
                                <div className="p-4">
                                    <div className="text-xs text-slate-500 uppercase mb-1">Total Geral</div>
                                    <div className="font-bold text-slate-800 text-sm">{fmt(declaration?.total_expense ?? totalExpense)}</div>
                                </div>
                                <div className="p-4">
                                    <div className="text-xs text-blue-600 uppercase mb-1">Finalística</div>
                                    <div className="font-bold text-blue-800 text-sm">{fmt(declaration?.total_finalistica ?? totalFinalistica)}</div>
                                    {totalExpense > 0 && (
                                        <div className="text-xs text-slate-400 mt-1">
                                            {(((declaration?.total_finalistica ?? totalFinalistica) / (declaration?.total_expense ?? totalExpense)) * 100).toFixed(1)}%
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <div className="text-xs text-orange-600 uppercase mb-1">Apoio</div>
                                    <div className="font-bold text-orange-800 text-sm">{fmt(declaration?.total_apoio ?? totalApoio)}</div>
                                    {totalExpense > 0 && (
                                        <div className="text-xs text-slate-400 mt-1">
                                            {(((declaration?.total_apoio ?? totalApoio) / (declaration?.total_expense ?? totalExpense)) * 100).toFixed(1)}%
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Caso não haja snapshot (declarações anteriores ao feature) */}
                {revenueRows.length === 0 && expenseRows.length === 0 && declaration && (
                    <div className="mt-8 pt-6 border-t border-slate-200 text-center text-sm text-slate-400 italic">
                        O espelho detalhado de receitas e despesas não está disponível para esta declaração
                        (gerada antes da implementação do recurso).
                    </div>
                )}

            </div>
        </PrintableReport>
    )
}
