"use client"

import { useEffect, useState } from "react"
import PrintableReport from "@/components/printable-report"
import { loadResponsibleData, ResponsibleData } from "@/lib/responsible-data"
import { logAuditAction } from "@/lib/audit-utils"

export default function ReciboEntregaPage() {
    const [loading, setLoading] = useState(true)
    const [orgName, setOrgName] = useState('')
    const [orgType, setOrgType] = useState('')
    const [responsible, setResponsible] = useState<ResponsibleData | null>(null)

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
            }

            // Log report generation
            await logAuditAction({
                actionType: 'report_generated',
                actionDetails: { reportType: 'Recibo de Entrega', title: 'Recibo de Entrega de Documentação' }
            })

            setLoading(false)
        }
        load()
    }, [])

    if (loading) return <div>Carregando...</div>

    // Logic for date restriction
    const currentDate = new Date()
    const releaseDate = new Date('2026-04-01') // Available only in 1/4/2026
    const isLocked = currentDate < releaseDate
    const isCFA = orgType === 'CFA' || orgName.includes('Federal') // Robust check

    // Block access for CRAs before release date
    if (isLocked && !isCFA) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center border-t-4 border-yellow-500">
                    <h1 className="text-xl font-bold text-slate-800 mb-4">Documento Indisponível</h1>
                    <p className="text-slate-600 mb-6">
                        O Recibo de Entrega para o exercício de 2025 estará disponível para emissão a partir de:
                    </p>
                    <div className="text-2xl font-bold text-blue-800 bg-blue-50 py-3 rounded mb-6">
                        01/04/2026
                    </div>
                    <p className="text-sm text-slate-500">
                        Aguarde a data de liberação oficial para gerar seu comprovante.
                    </p>
                </div>
            </div>
        )
    }

    // Custom Footer for Receipt
    const CfaFooter = (
        <div className="text-center text-sm font-medium text-slate-700 mt-12 space-y-1 border-t border-slate-300 pt-6">
            <p className="font-bold text-base">CFA - Conselho Federal de Administração</p>
            <p>CNPJ: 34.061.135/0001-89</p>
            <p>SAUS Quadra 1 Bloco "L" CEP:70070-932 - Brasília - DF</p>
            <p className="text-xs">Telefones: (61) 3218-1800 / (61) 3218-1842</p>
            <p className="text-xs">8h30-12h/13h30-18h Seg-Sexta</p>
        </div>
    )

    // Simulate receipt number generation (hash of name to 1-28 range logic or just random stable)
    const getReceiptNumber = (name: string) => {
        let hash = 0
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash)
        }
        // Map to 1-27 range (keeping 28 for CFA special case if needed, but simple mod is fine)
        const num = Math.abs(hash) % 27 + 1
        return num.toString().padStart(2, '0')
    }
    const receiptNumber = getReceiptNumber(orgName)

    return (
        <PrintableReport
            title="Recibo de Entrega"
            organizationName={orgName}
            organizationCnpj={responsible?.cnpj}
            hideOrganizationInfo={true}
            customFooter={CfaFooter}
        >
            <div className="space-y-6 font-serif leading-relaxed text-justify px-8 py-2">

                {/* Receipt Number - Placeholder logic */}
                <div className="text-center font-bold text-lg mb-4 uppercase">
                    Conselho Federal de Administração recibo n° {receiptNumber}/2025
                </div>

                {/* Main Content */}
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
                            <span className="font-bold block text-slate-700 uppercase text-xs">Responsável pelo Preenchimento</span>
                            <span className="text-lg">{responsible?.dataResponsibleName || 'Não informado'}</span>
                        </div>
                        <div>
                            <span className="font-bold block text-slate-700 uppercase text-xs">Cargo/Função</span>
                            <span className="text-lg">{responsible?.dataResponsibleRole || 'Não informado'}</span>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 my-2"></div>

                    <p className="text-base leading-loose">
                        Referente ao exercício de <strong>2025</strong>.
                    </p>

                    <p className="text-base leading-loose">
                        Declaramos que recebemos as informações prestadas pelo <strong>{orgName}</strong>,
                        e está disponível para nossa análise e consolidação a fim de prestar contas consolidadas
                        conforme <strong>DN TCU 216/2025</strong>.
                    </p>
                </div>

                {/* Footer Date */}
                <div className="text-center mt-8 text-lg">
                    Brasília, 31 de março de 2026.
                </div>

                {/* Technical Note - Only for CFA */}
                {isCFA && (
                    <div className="print:hidden mt-4 p-4 bg-blue-50 text-blue-800 rounded text-xs text-center border border-blue-200">
                        <p><strong>Nota Técnica (Visão CFA):</strong> Documento com data de elaboração definida para 31/03/2026.</p>
                        <p>Visualização permitida para perfil Administrador. CRAs só terão acesso em 01/04/2026.</p>
                    </div>
                )}
            </div>
        </PrintableReport>
    )
}
