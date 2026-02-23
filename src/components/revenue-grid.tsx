"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { loadRevenueData, saveRevenueEntry } from "@/lib/revenue-data"
import allRevenuesData from "@/lib/all-revenues.json"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Upload, Loader2, Check } from "lucide-react"
import { exportRevenuesToExcel, importRevenuesFromExcel } from "@/lib/excel-utils"
import { cn, formatCurrency } from "@/lib/utils"

interface RevenueAccount {
    id: string;
    name: string;
    type: string;
}

// Helper component for formatted inputs
const FormattedNumberInput = ({
    value,
    onChange,
    onFocus,
    onBlur,
    disabled = false,
    className = ""
}: {
    value: number,
    onChange: (val: number) => void,
    onFocus?: () => void,
    onBlur?: () => void,
    disabled?: boolean,
    className?: string
}) => {
    const formatValue = (val: number) => {
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    const [displayValue, setDisplayValue] = useState(formatValue(value))
    const [isFocused, setIsFocused] = useState(false)

    useEffect(() => {
        if (!isFocused) {
            setDisplayValue(formatValue(value))
        }
    }, [value, isFocused])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value
        val = val.replace(/[^0-9,]/g, '')
        const parts = val.split(',')
        if (parts.length > 2) {
            val = parts[0] + ',' + parts.slice(1).join('')
        }
        setDisplayValue(val)

        const numericString = val.replace(/\./g, '').replace(',', '.')
        const num = parseFloat(numericString)
        if (!isNaN(num)) {
            onChange(num)
        } else {
            onChange(0)
        }
    }

    const handleInputFocus = () => {
        setIsFocused(true)
        if (onFocus) onFocus()
    }

    const handleInputBlur = () => {
        setIsFocused(false)
        setDisplayValue(formatValue(value))
        if (onBlur) onBlur()
    }

    return (
        <Input
            type="text"
            className={cn("text-right h-8", className)}
            value={displayValue}
            onChange={handleChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            disabled={disabled}
        />
    )
}

export default function RevenueGrid() {
    const [data, setData] = useState<{ [key: string]: { value: number } }>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<string>("")
    const [totalRevenue, setTotalRevenue] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const accounts: RevenueAccount[] = allRevenuesData as RevenueAccount[]

    // Check if past delivery deadline — CFA has no deadline
    const deliveryDeadline = new Date('2026-03-15T23:59:59')
    const isCFA = typeof window !== 'undefined' && sessionStorage.getItem('orgType') === 'CFA'
    const isPastDeadline = !isCFA && new Date() > deliveryDeadline

    const loadData = useCallback(async () => {
        setLoading(true)
        const loadedData = await loadRevenueData()
        setData(loadedData)

        // Calculate initial total
        let total = 0
        accounts.forEach(acc => {
            const val = loadedData[acc.id]?.value || 0
            total += val
        })
        setTotalRevenue(total)

        setLoading(false)
    }, [accounts])

    useEffect(() => {
        loadData()
    }, [loadData])

    const activeValueRef = useRef<number>(0)

    const handleInputFocus = (value: number) => {
        activeValueRef.current = value
    }

    const handleValueChange = (accountId: string, newValue: number) => {
        // Optimistic update
        setData(prev => {
            const next = { ...prev }
            next[accountId] = { value: newValue }
            return next
        })
    }

    // Effect to calculate total when data changes
    useEffect(() => {
        let total = 0
        accounts.forEach(acc => {
            const val = data[acc.id]?.value || 0
            total += val
        })
        setTotalRevenue(total)
    }, [data, accounts])

    const handleInputBlur = async (accountId: string) => {
        const newValue = data[accountId]?.value || 0
        const previousValue = activeValueRef.current

        if (newValue !== previousValue) {
            setSaving(true)
            await saveRevenueEntry(accountId, newValue)
            setLastSaved(new Date().toLocaleTimeString())
            setSaving(false)
        }
    }

    const handleImport = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            try {
                const importedData = await importRevenuesFromExcel(file)
                setData(prev => ({ ...prev, ...importedData }))

                // Optional: Auto-save imported data to Supabase
                // Loop through imported keys and save
                setSaving(true)
                const promises = Object.entries(importedData).map(([id, val]) =>
                    saveRevenueEntry(id, val.value)
                )
                await Promise.all(promises)
                setSaving(false)
                setLastSaved(new Date().toLocaleTimeString())

                alert("Importação realizada com sucesso!")
            } catch (error) {
                console.error(error)
                alert("Erro ao importar arquivo.")
            }
        }
    }

    const handleExport = () => {
        exportRevenuesToExcel(data, sessionStorage.getItem('orgName') || 'Orgao')
    }

    if (loading) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin mr-2" /> Carregando...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Preenchimento de Receitas</h2>
                    <p className="text-slate-500">Informe os valores arrecadados</p>
                </div>
                <div className="flex gap-2">
                    <div className="text-right mr-4">
                        <div className="text-sm text-slate-500">Total Arrecadado</div>
                        <div className="text-xl font-bold text-green-600">
                            {formatCurrency(totalRevenue)}
                        </div>
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".xlsx, .xls"
                    />

                    <Button variant="outline" onClick={handleImport}>
                        <Upload className="mr-2 h-4 w-4" /> Importar XLS
                    </Button>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" /> Exportar XLS
                    </Button>
                </div>
            </div>

            <div className="flex justify-end items-center h-8">
                {saving ? (
                    <span className="text-sm text-slate-400 flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Salvando...</span>
                ) : lastSaved && (
                    <span className="text-sm text-slate-400 flex items-center"><Check className="h-3 w-3 mr-1" /> Salvo às {lastSaved}</span>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[500px]">Rubrica / Descrição</TableHead>
                                <TableHead className="text-right">Valor Arrecadado (R$)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts.map((account) => {
                                const isSynthetic = account.type === 'Sintética'
                                const depth = account.id.split('.').length - 1

                                let val = 0
                                if (isSynthetic) {
                                    // Calculate total from children
                                    // Filter for analytic accounts that belong to this parent
                                    const descendants = accounts.filter(a =>
                                        a.type === 'Analítica' && a.id.startsWith(account.id + '.')
                                    )
                                    val = descendants.reduce((acc, curr) => {
                                        return acc + (data[curr.id]?.value || 0)
                                    }, 0)
                                } else {
                                    val = data[account.id]?.value || 0
                                }

                                return (
                                    <TableRow key={account.id} className={cn(isSynthetic && "bg-slate-50 font-semibold")}>
                                        <TableCell className={cn("text-slate-700", {
                                            "pl-4": depth === 0,
                                            "pl-8": depth === 1,
                                            "pl-12": depth === 2,
                                            "font-bold": isSynthetic
                                        })}>
                                            {account.name}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {isSynthetic ? (
                                                <div className="font-bold text-slate-900 pr-3">
                                                    {formatCurrency(val)}
                                                </div>
                                            ) : (
                                                <FormattedNumberInput
                                                    value={val || 0}
                                                    onChange={(newVal) => handleValueChange(account.id, newVal)}
                                                    onFocus={() => handleInputFocus(val || 0)}
                                                    onBlur={() => handleInputBlur(account.id)}
                                                    disabled={isPastDeadline}
                                                    className={isPastDeadline ? "bg-slate-100 cursor-not-allowed" : ""}
                                                />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
