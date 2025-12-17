"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Trash2, CheckCircle2 } from "lucide-react"

export default function ClearDataPage() {
    const [isClearing, setIsClearing] = useState(false)
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
    const [confirmText, setConfirmText] = useState("")

    const handleClearData = async () => {
        if (confirmText !== "LIMPAR TUDO") {
            alert('Por favor, digite "LIMPAR TUDO" para confirmar')
            return
        }

        setIsClearing(true)
        setResult(null)

        try {
            const response = await fetch('/api/admin/clear-data', {
                method: 'POST'
            })

            const data = await response.json()

            if (data.success) {
                setResult({
                    success: true,
                    message: data.message || 'Dados removidos com sucesso!'
                })
                setConfirmText("")
            } else {
                setResult({
                    success: false,
                    message: data.error || 'Erro ao remover dados'
                })
            }
        } catch (error) {
            setResult({
                success: false,
                message: 'Erro ao conectar com o servidor'
            })
        } finally {
            setIsClearing(false)
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <Card className="border-red-200">
                <CardHeader className="bg-red-50">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                        <div>
                            <CardTitle className="text-red-900">Limpar Todos os Dados</CardTitle>
                            <CardDescription className="text-red-700">
                                Esta ação é irreversível e removerá TODOS os dados de despesas e receitas
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h3 className="font-semibold text-yellow-900 mb-2">⚠️ ATENÇÃO</h3>
                        <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                            <li>Todos os dados de despesas serão removidos</li>
                            <li>Todos os dados de receitas serão removidos</li>
                            <li>Dados de todas as 28 organizações (CFA + 27 CRAs) serão afetados</li>
                            <li>Esta ação NÃO pode ser desfeita</li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            Para confirmar, digite: <span className="font-bold text-red-600">LIMPAR TUDO</span>
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="Digite aqui..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            disabled={isClearing}
                        />
                    </div>

                    <Button
                        onClick={handleClearData}
                        disabled={isClearing || confirmText !== "LIMPAR TUDO"}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                        size="lg"
                    >
                        {isClearing ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Removendo dados...
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Limpar Todos os Dados
                            </>
                        )}
                    </Button>

                    {result && (
                        <div className={`rounded-lg p-4 ${result.success
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-red-50 border border-red-200'
                            }`}>
                            <div className="flex items-center gap-2">
                                {result.success ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                )}
                                <p className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'
                                    }`}>
                                    {result.message}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="text-xs text-gray-500 pt-4 border-t">
                        <p>💡 <strong>Dica:</strong> Após limpar os dados, você pode:</p>
                        <ul className="mt-1 ml-4 list-disc space-y-1">
                            <li>Fazer login como usuário de um CRA para testar o preenchimento manual</li>
                            <li>Usar a página /seed para popular dados fictícios novamente</li>
                            <li>Testar o fluxo completo de preenchimento desde o início</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
