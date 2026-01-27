"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { loadDeclaration, submitDeclaration, type Declaration } from "@/lib/declarations"
import { loadResponsibleData } from "@/lib/responsible-data"
import { loadRevenueData } from "@/lib/revenue-data"
import { loadExpenseData } from "@/lib/expense-data"
import { useToast } from "@/hooks/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, Send, RotateCcw, CheckCircle2, AlertTriangle, FileText } from "lucide-react"

import PrintableReport from "@/components/printable-report"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function DeclarationManager() {
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [declaration, setDeclaration] = useState<Declaration | null>(null)
    const [totals, setTotals] = useState<any>(null)
    const [responsibleData, setResponsibleData] = useState<any>(null)
    const [isConfirming, setIsConfirming] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showReceipt, setShowReceipt] = useState(false)
    const [validationError, setValidationError] = useState<string | null>(null)

    // Deadline: March 31, 2026
    const deadline = new Date('2026-03-31T23:59:59')
    const now = new Date()
    const isPastDeadline = now > deadline

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const dec = await loadDeclaration()
            setDeclaration(dec)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const prepareDelivery = async () => {
        setValidationError(null)
        setTotals(null)
        setIsConfirming(true)

        // 1. Verify Responsibles
        const orgId = sessionStorage.getItem('orgId')
        if (!orgId) return

        const responsible = await loadResponsibleData(orgId)
        if (!responsible || !responsible.dataResponsibleName || !responsible.unitResponsibleName || !responsible.cnpj) {
            setValidationError("É necessário preencher todos os dados dos Responsáveis antes de entregar.")
            return
        }
        setResponsibleData(responsible)

        // 2. Load Totals
        const revenues = await loadRevenueData()
        const expenses = await loadExpenseData()

        let totalRev = 0
        Object.values(revenues).forEach((r: any) => totalRev += (r.value || 0))

        let totalExp = 0
        let totalFin = 0
        let totalApoio = 0
        Object.values(expenses).forEach((e: any) => {
            totalExp += (e.total || 0)
            totalFin += (e.finalistica || 0)
            totalApoio += ((e.total || 0) - (e.finalistica || 0))
        })

        setTotals({
            revenue: totalRev,
            expense: totalExp,
            finalistica: totalFin,
            apoio: totalApoio,
            rawRevenues: revenues,
            rawExpenses: expenses
        })
    }

    const handleConfirm = async () => {
        if (!totals) return
        setIsSubmitting(true)

        try {
            const isRectification = !!declaration
            const newDec = await submitDeclaration(
                {
                    revenue: totals.revenue,
                    expense: totals.expense,
                    finalistica: totals.finalistica,
                    apoio: totals.apoio
                },
                {
                    revenues: totals.rawRevenues,
                    expenses: totals.rawExpenses
                },
                {
                    unitName: responsibleData.unitResponsibleName,
                    unitCra: responsibleData.unitResponsibleCraNumber,
                    dataName: responsibleData.dataResponsibleName,
                    dataRole: responsibleData.dataResponsibleRole,
                    dataDocType: 'CPF', // default/assumed or from data
                    dataDocNumber: responsibleData.dataResponsibleCpf
                },
                isRectification
            )

            setDeclaration(newDec)
            setIsConfirming(false)
            setShowReceipt(true) // Show receipt immediately

            toast({
                title: isRectification ? "Declaração Retificada!" : "Declaração Entregue!",
                description: "O recibo foi gerado com sucesso.",
            })

        } catch (error) {
            console.error(error)
            toast({
                title: "Erro ao entregar",
                description: "Ocorreu um erro ao processar a entrega.",
                variant: "destructive"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) return <div>Carregando...</div>

    return (
        <section className="space-y-6">
            <Card className="border-t-4 border-t-blue-600">
                <CardHeader>
                    <CardTitle>Entrega da Declaração</CardTitle>
                    <CardDescription>
                        Envie os dados consolidados para o CFA. Prazo final: 31/03/2026.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isPastDeadline ? (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Prazo Encerrado</AlertTitle>
                            <AlertDescription>
                                O prazo de entrega e retificação encerrou em 31/03/2026. Não é possível realizar novas entregas ou alterações.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {declaration ? (
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                                        <div>
                                            <h4 className="font-semibold text-green-900">
                                                {declaration.is_rectification ? 'Declaração Retificada' : 'Declaração Entregue'}
                                            </h4>
                                            <p className="text-sm text-green-700">
                                                Recebida em {new Date(declaration.delivery_date).toLocaleDateString('pt-BR')} às {new Date(declaration.delivery_date).toLocaleTimeString('pt-BR')}
                                            </p>
                                            <p className="text-xs text-green-600 mt-1">
                                                Recibo nº {declaration.receipt_number}
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setShowReceipt(true)}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Ver Recibo
                                    </Button>
                                </div>
                            ) : (
                                <Alert>
                                    <AlertTitle>Status: Pendente</AlertTitle>
                                    <AlertDescription>
                                        A declaração ainda não foi enviada. Certifique-se de que todos os dados estão corretos antes de prosseguir.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="flex justify-end pt-4">
                                {!isPastDeadline && (
                                    <Button
                                        size="lg"
                                        onClick={prepareDelivery}
                                        className={declaration ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"}
                                    >
                                        {declaration ? (
                                            <>
                                                <RotateCcw className="mr-2 h-5 w-5" />
                                                Retificar Declaração
                                            </>
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-5 w-5" />
                                                Entregar Declaração
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Confirmation Modal */}
            <Dialog open={isConfirming} onOpenChange={setIsConfirming}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Confirmar {declaration ? 'Retificação' : 'Entrega'}</DialogTitle>
                        <DialogDescription>
                            Revise os totais abaixo. Ao confirmar, um recibo será gerado.
                        </DialogDescription>
                    </DialogHeader>

                    {validationError ? (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Impedimento</AlertTitle>
                            <AlertDescription>{validationError}</AlertDescription>
                        </Alert>
                    ) : totals ? (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded border">
                                    <h4 className="font-semibold text-slate-700">Receitas</h4>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {totals.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded border">
                                    <h4 className="font-semibold text-slate-700">Despesas Totais</h4>
                                    <p className="text-2xl font-bold text-red-600">
                                        {totals.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3">
                                    <span className="text-sm text-slate-500 block">Finalística</span>
                                    <span className="font-semibold text-slate-800">
                                        {totals.finalistica.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>
                                <div className="p-3">
                                    <span className="text-sm text-slate-500 block">Apoio</span>
                                    <span className="font-semibold text-slate-800">
                                        {totals.apoio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>
                            </div>

                            <Alert className="bg-blue-50 border-blue-200">
                                <AlertTitle className="text-blue-800">Confirmação</AlertTitle>
                                <AlertDescription className="text-blue-700">
                                    Declaro que as informações são verdadeiras e conferem com os registros contábeis.
                                </AlertDescription>
                            </Alert>
                        </div>
                    ) : (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirming(false)}>Cancelar</Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={!!validationError || isSubmitting || !totals}
                            className={declaration ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                            Confirmar {declaration ? 'Retificação' : 'Entrega'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Receipt Modal/Overlay */}
            {showReceipt && declaration && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-lg shadow-2xl flex flex-col relative overflow-hidden">
                        <Button
                            className="absolute top-4 right-4 z-50 print:hidden"
                            variant="destructive"
                            onClick={() => setShowReceipt(false)}
                        >
                            Fechar Recibo
                        </Button>

                        <div className="flex-1 p-8 overflow-y-auto print:p-0">
                            {/* Reusing Receipt Logic inline for simplicity */}
                            <ReceiptView declaration={declaration} />
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

function ReceiptView({ declaration }: { declaration: Declaration }) {
    const isCFA = sessionStorage.getItem('orgType') === 'CFA'

    return (
        <PrintableReport
            title={declaration.is_rectification ? "Recibo de Retificação" : "Recibo de Entrega"}
            organizationName={declaration.organization_name || sessionStorage.getItem('orgName') || ''}
            organizationCnpj="" // Injected in wrapper or fetched
            hideOrganizationInfo={true}
            customFooter={
                <div className="text-center text-sm font-medium text-slate-700 mt-12 space-y-1 border-t border-slate-300 pt-6">
                    <p className="font-bold text-base">CFA - Conselho Federal de Administração</p>
                    <p>CNPJ: 34.061.135/0001-89</p>
                    <p>SAUS Quadra 1 Bloco "L" CEP:70070-932 - Brasília - DF</p>
                </div>
            }
        >
            <div className="space-y-6 font-serif leading-relaxed text-justify px-8 py-2">
                <div className="text-center font-bold text-lg mb-4 uppercase">
                    Conselho Federal de Administração <br />
                    Recibo n° {declaration.receipt_number}/2025
                    {declaration.is_rectification && <span className="block text-amber-600 text-sm mt-1">(Retificadora nº {declaration.rectification_count})</span>}
                </div>

                <div className="text-center text-sm text-slate-500 mb-8">
                    Entregue em: {new Date(declaration.delivery_date).toLocaleString('pt-BR')}
                </div>

                <div className="space-y-4 text-slate-900 border p-6 rounded-lg bg-slate-50/50 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <span className="font-bold block text-slate-700 uppercase text-xs">Unidade</span>
                            <span className="text-lg">{declaration.organization_name || 'N/A'}</span>
                        </div>
                        {/* We might not have CNPJ in declaration snapshot yet, but can try to display if we had it, or just skip for this view since it's "quick view" */}

                        <div>
                            <span className="font-bold block text-slate-700 uppercase text-xs">Responsável pela Unidade (Presidente)</span>
                            <span className="text-lg">{declaration.responsible_unit_name || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="font-bold block text-slate-700 uppercase text-xs">CRA (Presidente)</span>
                            <span className="text-lg">{declaration.responsible_unit_cra || 'N/A'}</span>
                        </div>

                        <div>
                            <span className="font-bold block text-slate-700 uppercase text-xs">Responsável pelo Preenchimento</span>
                            <span className="text-lg">{declaration.responsible_data_name || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="font-bold block text-slate-700 uppercase text-xs">Cargo/Função</span>
                            <span className="text-lg">{declaration.responsible_data_role || 'N/A'}</span>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 my-2"></div>

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

                    <p className="text-base leading-loose mt-4">
                        Declaramos que recebemos as informações prestadas pelo <strong>{declaration.organization_name}</strong>,
                        referentes ao exercício de <strong>2025</strong>.
                    </p>
                </div>

                <div className="text-center mt-8 text-lg">
                    Brasília, {new Date(declaration.delivery_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                </div>
            </div>
        </PrintableReport>
    )
}
