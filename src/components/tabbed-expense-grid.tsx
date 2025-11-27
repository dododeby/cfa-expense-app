"use client"

import { useState, useEffect, useRef } from "react"
import allAccountsData from "@/lib/all-accounts.json"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Download, Upload, AlertCircle, RotateCcw } from "lucide-react"
import { exportToExcel, importFromExcel } from "@/lib/excel-utils"
import { addAuditEntry, performDailyRecovery } from "@/lib/audit-utils"
import { loadExpenseData, saveExpenseEntry } from "@/lib/expense-data"

interface Account {
    id: string;
    group: string;
    subgroup: string;
    type: string;
    name: string;
}

interface ExpenseData {
    [accountId: string]: {
        total: number;
        finalistica: number;
    }
}

interface ValidationError {
    accountId: string;
    accountName: string;
    message: string;
}

export function TabbedExpenseGrid() {
    const [data, setData] = useState<ExpenseData>({})
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
    const [showValidationDetails, setShowValidationDetails] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const accounts: Account[] = allAccountsData as Account[]

    // Load data from Supabase on mount
    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            const expenseData = await loadExpenseData()
            setData(expenseData)
            setLoading(false)
        }
        loadData()
    }, [])

    // Auto-save to Supabase (debounced)
    useEffect(() => {
        if (loading) return // Don't save while loading initial data

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        saveTimeoutRef.current = setTimeout(async () => {
            if (Object.keys(data).length > 0) {
                setSaving(true)
                // Save will happen in handleInputChange
                setTimeout(() => setSaving(false), 1000)
            }
        }, 2000)

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [data, loading])

    // Validation: if Total is filled, Finalística must be filled too
    useEffect(() => {
        const errors: ValidationError[] = []

        accounts.forEach(account => {
            if (account.type === 'Analítica') {
                const rowData = data[account.id]
                if (rowData && rowData.total > 0 && rowData.finalistica === 0) {
                    errors.push({
                        accountId: account.id,
                        accountName: account.name,
                        message: `Total preenchido mas Finalística está vazia`
                    })
                }
            }
        })

        setValidationErrors(errors)

        // Update notification count in sessionStorage for the bell
        sessionStorage.setItem('validationErrorCount', errors.length.toString())
        window.dispatchEvent(new Event('storage'))
    }, [data, accounts])

    // Listen for "show validation details" event from notification bell
    useEffect(() => {
        const handleShowDetails = () => {
            setShowValidationDetails(true)
        }

        window.addEventListener('showValidationDetails', handleShowDetails)

        return () => {
            window.removeEventListener('showValidationDetails', handleShowDetails)
        }
    }, [])

    // Group accounts by "Grupo"
    const groupedAccounts = accounts.reduce((acc, account) => {
        if (!acc[account.group]) {
            acc[account.group] = []
        }
        acc[account.group].push(account)
        return acc
    }, {} as Record<string, Account[]>)

    const groups = Object.keys(groupedAccounts).filter(g => g && g.trim() !== '')

    const handleInputChange = async (accountId: string, field: 'total' | 'finalistica', value: string) => {
        const numValue = parseFloat(value) || 0
        const account = accounts.find(acc => acc.id === accountId)

        if (!account) return

        // Get previous value for audit trail
        const previousValue = data[accountId]?.[field] || 0

        // Update local state first for immediate UI feedback
        setData(prev => ({
            ...prev,
            [accountId]: {
                ...prev[accountId],
                total: field === 'total' ? numValue : (prev[accountId]?.total || 0),
                finalistica: field === 'finalistica' ? numValue : (prev[accountId]?.finalistica || 0)
            }
        }))

        // Only log and save if value actually changed
        if (previousValue !== numValue) {
            addAuditEntry({
                accountId,
                accountName: account.name,
                field,
                previousValue,
                newValue: numValue
            })

            // Save to Supabase
            try {
                const total = field === 'total' ? numValue : (data[accountId]?.total || 0)
                const finalistica = field === 'finalistica' ? numValue : (data[accountId]?.finalistica || 0)

                await saveExpenseEntry(accountId, account.name, total, finalistica)
            } catch (error) {
                console.error('Error saving to Supabase:', error)
            }
        }
    }

    const handleExport = () => {
        exportToExcel(data, sessionStorage.getItem('orgId') || "regional");
    }

    const handleImportClick = () => {
        fileInputRef.current?.click();
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const importedData = await importFromExcel(file);
                setData(importedData);
                alert("Importação realizada com sucesso!");
            } catch (error) {
                console.error(error);
                alert("Erro ao importar arquivo.");
            }
        }
    }

    const handleDailyRecovery = () => {
        if (!confirm('Deseja restaurar os dados do dia anterior? Esta ação será registrada no histórico.')) {
            return
        }

        // Create accounts map for recovery function
        const accountsMap = new Map(
            accounts.map(acc => [acc.id, { id: acc.id, name: acc.name }])
        )

        const recoveredData = await performDailyRecovery(data, accountsMap)
        setData(recoveredData)

        alert('Recovery realizado com sucesso! Os dados foram restaurados para o estado do dia anterior.')
    }

    // Calculate totals for a group
    const getGroupTotals = (groupAccounts: Account[]) => {
        let totalDespesas = 0

        groupAccounts.forEach(account => {
            if (account.type === 'Analítica') {
                const rowData = data[account.id] || { total: 0, finalistica: 0 }
                totalDespesas += rowData.total
            }
        })

        return totalDespesas
    }

    // Calculate derived values for a row
    const getRowValues = (account: Account) => {
        if (account.type === 'Analítica') {
            const rowData = data[account.id] || { total: 0, finalistica: 0 }
            const apoio = rowData.total - rowData.finalistica
            const pctFinalistica = rowData.total > 0 ? (rowData.finalistica / rowData.total) * 100 : 0
            const pctApoio = rowData.total > 0 ? (apoio / rowData.total) * 100 : 0

            return {
                total: rowData.total,
                finalistica: rowData.finalistica,
                apoio,
                pctFinalistica,
                pctApoio
            }
        }
        return { total: 0, finalistica: 0, apoio: 0, pctFinalistica: 0, pctApoio: 0 }
    }

    // Check if account has validation error
    const hasError = (accountId: string) => {
        return validationErrors.some(err => err.accountId === accountId)
    }

    // Calculate grand total
    const grandTotal = accounts.reduce((sum, account) => {
        if (account.type === 'Analítica') {
            const rowData = data[account.id] || { total: 0, finalistica: 0 }
            return sum + rowData.total
        }
        return sum
    }, 0)

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-blue-900">Preenchimento de Despesas</h2>
                <div className="flex items-center gap-2">
                    <div className="text-sm text-slate-500 mr-4">
                        {saving ? "Salvando..." : "Alterações salvas"}
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".xlsx, .xls"
                    />

                    <Button variant="outline" size="sm" onClick={handleImportClick}>
                        <Upload className="h-4 w-4 mr-2" />
                        Importar XLS
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar XLS
                    </Button>
                </div>
            </div>

            {/* Validation Errors Alert - Only shown when user clicks "Ver detalhes" */}
            {showValidationDetails && validationErrors.length > 0 && (
                <Card className="border-red-300 bg-red-50">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                {validationErrors.length} erro(s) de validação
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowValidationDetails(false)}
                                className="h-6 w-6 p-0 hover:bg-red-100"
                            >
                                ✕
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm text-red-700 space-y-1">
                            {validationErrors.slice(0, 5).map((error) => (
                                <li key={error.accountId}>
                                    • <strong>{error.accountName}</strong>: {error.message}
                                </li>
                            ))}
                            {validationErrors.length > 5 && (
                                <li className="text-xs text-red-600 mt-2">
                                    ... e mais {validationErrors.length - 5} erro(s)
                                </li>
                            )}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Per-Group Summary Cards + Total Geral */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {groups.map((group) => {
                    const total = getGroupTotals(groupedAccounts[group])
                    return (
                        <Card key={group} className="border-slate-200">
                            <CardHeader className="pb-2 px-3 pt-3">
                                <CardTitle className="text-xs font-medium text-slate-600 line-clamp-2">
                                    {group}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pb-3">
                                <div className="text-lg font-bold text-slate-900">
                                    {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
                <Card className="bg-blue-50 border-blue-300">
                    <CardHeader className="pb-2 px-3 pt-3">
                        <CardTitle className="text-xs font-medium text-blue-700">
                            Total Geral
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                        <div className="text-lg font-bold text-blue-900">
                            {grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue={groups[0]} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto bg-slate-100 p-1">
                    {groups.map((group) => (
                        <TabsTrigger
                            key={group}
                            value={group}
                            className="whitespace-nowrap data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md px-4 py-2 rounded-md font-medium transition-all"
                        >
                            {group}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {groups.map((group) => {
                    const groupAccounts = groupedAccounts[group]

                    return (
                        <TabsContent key={group} value={group} className="space-y-4 mt-4">
                            {/* Table */}
                            <div className="border rounded-md overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-slate-100">
                                        <TableRow>
                                            <TableHead className="w-[400px]">Conta</TableHead>
                                            <TableHead className="w-[150px] text-right">Total</TableHead>
                                            <TableHead className="w-[150px] text-right">Atividade Finalística</TableHead>
                                            <TableHead className="w-[150px] text-right">Atividade de Apoio</TableHead>
                                            <TableHead className="w-[100px] text-right">% Finalística</TableHead>
                                            <TableHead className="w-[100px] text-right">% Apoio</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupAccounts.map((account) => {
                                            const values = getRowValues(account)
                                            const isSynthetic = account.type === 'Sintética'
                                            const hasValidationError = hasError(account.id)

                                            return (
                                                <TableRow key={account.id} className={cn(isSynthetic && "bg-slate-50 font-semibold")}>
                                                    <TableCell className={cn("py-2", isSynthetic ? "pl-4" : "pl-8")}>
                                                        {account.name}
                                                        {hasValidationError && (
                                                            <AlertCircle className="inline-block h-4 w-4 ml-2 text-red-600" />
                                                        )}
                                                    </TableCell>

                                                    {isSynthetic ? (
                                                        <>
                                                            <TableCell className="text-right text-slate-500">-</TableCell>
                                                            <TableCell className="text-right text-slate-500">-</TableCell>
                                                            <TableCell className="text-right text-slate-500">-</TableCell>
                                                            <TableCell className="text-right text-slate-500">-</TableCell>
                                                            <TableCell className="text-right text-slate-500">-</TableCell>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    className="text-right h-8"
                                                                    value={data[account.id]?.total || ""}
                                                                    onChange={(e) => handleInputChange(account.id, 'total', e.target.value)}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    className={cn(
                                                                        "text-right h-8",
                                                                        hasValidationError && "border-red-500 bg-red-50"
                                                                    )}
                                                                    value={data[account.id]?.finalistica || ""}
                                                                    onChange={(e) => handleInputChange(account.id, 'finalistica', e.target.value)}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium text-slate-700">
                                                                {values.apoio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </TableCell>
                                                            <TableCell className="text-right text-slate-600">
                                                                {values.pctFinalistica.toFixed(1)}%
                                                            </TableCell>
                                                            <TableCell className="text-right text-slate-600">
                                                                {values.pctApoio.toFixed(1)}%
                                                            </TableCell>
                                                        </>
                                                    )}
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    )
                })}
            </Tabs>
        </div>
    )
}
