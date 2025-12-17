"use client"

import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import { logAuditAction } from "@/lib/audit-utils"

interface PrintableReportProps {
    title: string
    organizationName: string
    organizationCnpj?: string
    presidentName?: string
    presidentRole?: string
    responsibleName?: string
    responsibleRole?: string
    children: React.ReactNode
    orientation?: 'portrait' | 'landscape'
    hideOrganizationInfo?: boolean
    customFooter?: React.ReactNode
    reportType?: string // For audit logging
}

export default function PrintableReport({
    title,
    organizationName,
    organizationCnpj,
    presidentName,
    presidentRole,
    responsibleName,
    responsibleRole,
    children,
    orientation = 'portrait',
    hideOrganizationInfo = false,
    customFooter,
    reportType
}: PrintableReportProps) {

    const handlePrint = async () => {
        // Log audit action before printing
        if (reportType) {
            await logAuditAction({
                actionType: 'report_generated',
                actionDetails: { reportType, title }
            })
        }
        window.print()
    }

    return (
        <div className="bg-white min-h-screen">
            {/* Action Bar - Hidden on Print */}
            <div className="print:hidden p-4 border-b flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-semibold text-slate-700">{title}</h2>
                <Button onClick={handlePrint} className="gap-2">
                    <Printer className="w-4 h-4" />
                    Imprimir / Salvar PDF
                </Button>
            </div>

            {/* Print Content */}
            <div className={`p-8 mx-auto bg-white ${orientation === 'landscape' ? 'max-w-[297mm]' : 'max-w-[210mm]'}`} style={{ minHeight: 'auto' }}>

                {/* Formal Header */}
                <header className="mb-4 text-center">
                    {/* Header Image */}
                    <img
                        src="/cfa-header.png"
                        alt="Cabeçalho CFA"
                        className="w-full max-w-[800px] mx-auto mb-4"
                    />

                    {!hideOrganizationInfo && (
                        <>
                            <h2 className="text-lg font-semibold uppercase mt-4">{organizationName}</h2>
                            {organizationCnpj && (
                                <p className="text-sm font-mono">CNPJ: {organizationCnpj}</p>
                            )}
                        </>
                    )}
                    <h3 className="text-md font-medium mt-2 pt-2 border-t border-slate-200 inline-block px-8 bg-slate-50">
                        {title}
                    </h3>
                </header>

                {/* Main Content */}
                <main>
                    {children}
                </main>

                {/* Footer / Signatures or Custom */}
                <footer className="mt-8 pt-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                    {customFooter ? (
                        customFooter
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-16 text-center">
                                <div className="space-y-1">
                                    <div className="border-t border-black w-48 mx-auto mb-2"></div>
                                    <p className="font-semibold text-sm">{presidentName || 'Presidente'}</p>
                                    <p className="text-xs text-slate-600">{presidentRole || 'Presidente'}</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="border-t border-black w-48 mx-auto mb-2"></div>
                                    <p className="font-semibold text-sm">{responsibleName || 'Responsável Técnico'}</p>
                                    <p className="text-xs text-slate-600">{responsibleRole || 'Cargo'}</p>
                                </div>
                            </div>

                            <div className="mt-8 text-center text-[10px] text-slate-400 border-t pt-2">
                                <p>Documento gerado eletronicamente pelo Sistema Integrado CFA/CRAs</p>
                                <p>{new Date().toLocaleString('pt-BR')}</p>
                            </div>
                        </>
                    )}
                </footer>
            </div>

            {/* CSS Print Styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: ${orientation === 'landscape' ? 'landscape' : 'portrait'};
                        margin: 10mm;
                    }
                    body {
                        background: white;
                        color: black;
                        font-size: 12pt;
                        overflow: hidden !important;
                        min-height: auto !important;
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
                    main {
                        min-height: auto !important;
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
                    .print\\:hidden {
                        display: none !important;
                    }
                    /* Keep footer with content, not on separate page */
                    footer {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }
                }
            `}</style>
        </div>
    )
}
