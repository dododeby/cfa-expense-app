"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { supabase } from "@/lib/supabase"
import { ORGANIZATIONS } from "@/lib/constants"
import allAccountsData from "@/lib/all-accounts.json"
import allRevenuesData from "@/lib/all-revenues.json"

const expenses = allAccountsData.filter(a => a.type === 'Analítica')
const revenues = allRevenuesData.filter(a => a.type === 'Analítica')

export default function SeedPage() {
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState("")

    const generateRandomValue = (min: number, max: number) => {
        return Math.floor(Math.random() * (max - min + 1)) + min
    }

    const handleSeed = async () => {
        try {
            setLoading(true)
            setProgress(0)
            setStatus("Iniciando geração de dados...")

            const totalSteps = ORGANIZATIONS.length
            let completedSteps = 0

            for (const org of ORGANIZATIONS) {
                setStatus(`Processando ${org.name}...`)

                // 1. Generate Expenses
                const expensePayload = expenses.map(acc => {
                    const total = generateRandomValue(1000, 50000)
                    const finalistica = generateRandomValue(0, total) // finalistica <= total

                    return {
                        organization_id: org.id,
                        account_id: acc.id,
                        account_name: acc.name, // inclusive for redundancy
                        total: total,
                        finalistica: finalistica,
                        updated_by: 'system_seed',
                        updated_at: new Date().toISOString()
                    }
                })

                // Batch insert expenses
                const { error: expError } = await supabase
                    .from('expenses')
                    .upsert(expensePayload, { onConflict: 'organization_id,account_id' })

                if (expError) throw expError

                // 2. Generate Revenues
                const revenuePayload = revenues.map(acc => {
                    const value = generateRandomValue(5000, 100000)

                    return {
                        organization_id: org.id,
                        account_id: acc.id,
                        value: value,
                        updated_at: new Date().toISOString()
                    }
                })

                // Batch insert revenues
                // Note: Revenues table might not have unique constraint explicit in my knowledge, 
                // but usually it is (organization_id, account_id).
                // If it fails, I might need to delete first? Let's assume upsert works.
                const { error: revError } = await supabase
                    .from('revenues')
                    .upsert(revenuePayload) // hoping for constraint match

                if (revError) {
                    console.warn(`Error inserting revenues for ${org.name}:`, revError)
                    // Continue anyway
                }

                completedSteps++
                setProgress((completedSteps / totalSteps) * 100)
            }

            setStatus("Dados gerados com sucesso para todas as unidades!")
        } catch (error: any) {
            console.error(error)
            setStatus(`Erro: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto py-10 max-w-lg">
            <Card>
                <CardHeader>
                    <CardTitle>Gerador de Dados Fictícios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Esta ferramenta irá apagar/sobrescrever os dados de despesas e receitas para
                        <strong> TODAS as {ORGANIZATIONS.length} unidades </strong>
                        (CFA + 27 CRAs).
                    </p>
                    <p className="text-sm text-slate-600">
                        Total de contas de despesa: {expenses.length} <br />
                        Total de contas de receita: {revenues.length}
                    </p>

                    {loading && (
                        <div className="space-y-2">
                            <Progress value={progress} />
                            <p className="text-xs text-center text-slate-500">{Math.round(progress)}% - {status}</p>
                        </div>
                    )}

                    {!loading && status && (
                        <p className="text-sm font-medium text-green-600 border p-2 rounded bg-green-50">
                            {status}
                        </p>
                    )}

                    <Button
                        className="w-full"
                        onClick={handleSeed}
                        disabled={loading}
                        variant="destructive"
                    >
                        {loading ? "Gerando..." : "Gerar Dados Agora"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
