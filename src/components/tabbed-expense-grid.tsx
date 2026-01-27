"use client"

import { useState, useEffect, useRef } from "react"
import allAccountsData from "@/lib/all-accounts.json"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
// ... (Top of file imports)
import { Download, Upload, AlertCircle, RotateCcw } from "lucide-react"

import { supabase } from "@/lib/supabase"
import { accountDescriptions as staticDescriptions } from "@/lib/account-descriptions"
import { loadExpenseData, saveExpenseEntry } from "@/lib/expense-data"
import { importFromExcel, exportToExcel } from "@/lib/excel-utils"
import { addAuditEntry, performDailyRecovery } from "@/lib/audit-utils"

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

export function TabbedExpenseGrid() {
    const [data, setData] = useState<ExpenseData>({})
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
    const [showValidationDetails, setShowValidationDetails] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const accounts: Account[] = allAccountsData as Account[]

    const [customDescriptions, setCustomDescriptions] = useState<Record<string, string>>({})
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState("")

    // Check if past delivery deadline (31/03/2026)
    const deliveryDeadline = new Date('2026-03-31T23:59:59')
    const isPastDeadline = new Date() > deliveryDeadline

    // Load custom descriptions
    useEffect(() => {
        const loadDescriptions = async () => {
            const { data } = await supabase.from('account_guidance').select('account_id, description')
            if (data) {
                const map: Record<string, string> = {}
                data.forEach((item: any) => {
                    map[item.account_id] = item.description
                })
                setCustomDescriptions(map)
            }
        }
        loadDescriptions()
    }, [])

    const handleSaveDescription = async (accountId: string) => {
        // Optimistic update
        setCustomDescriptions(prev => ({ ...prev, [accountId]: editValue }))
        setEditingId(null)

        await supabase.from('account_guidance').upsert({
            account_id: accountId,
            description: editValue,
            updated_at: new Date().toISOString()
        })
    }

    const startEditing = (id: string, currentText: string) => {
        setEditingId(id)
        setEditValue(currentText)
    }

    // Load data from Supabase on mount
    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            const expenseData = await loadExpenseData()
            console.log('--- TabbedExpenseGrid State ---', {
                keys: Object.keys(expenseData),
                sample: Object.keys(expenseData).slice(0, 3).map(k => ({ k, v: expenseData[k] }))
            })
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
                // Just a visual indicator that we are "ready" or "synced" status managed by individual saves
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
                if (rowData) {
                    // Removed rule: if (rowData.total > 0 && rowData.finalistica === 0)
                    if (rowData.finalistica > rowData.total) {
                        errors.push({
                            accountId: account.id,
                            accountName: account.name,
                            message: `Despesa Finalística maior que o Total (Apoio negativo)`
                        })
                    }
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

    const activeValueRef = useRef<number>(0)

    const handleInputFocus = (value: number) => {
        activeValueRef.current = value
    }

    const handleValueChange = (accountId: string, field: 'total' | 'finalistica', value: number) => {
        const numValue = value

        // Auto-fill logic for 100% Finalística accounts
        const autoFillAccounts = ['1.5.1.1', '1.7.1.10', '1.12.1.5'] // Jetons, CIP, Cota Parte

        let newTotal = field === 'total' ? numValue : (data[accountId]?.total || 0)
        let newFinalistica = field === 'finalistica' ? numValue : (data[accountId]?.finalistica || 0)

        if (autoFillAccounts.includes(accountId) && field === 'total') {
            newFinalistica = numValue
        }

        setData(prev => ({
            ...prev,
            [accountId]: {
                ...prev[accountId],
                total: newTotal,
                finalistica: newFinalistica
            }
        }))
    }

    const handleInputBlur = async (accountId: string, field: 'total' | 'finalistica') => {
        const account = accounts.find(acc => acc.id === accountId)
        if (!account) return

        const rowData = data[accountId] || { total: 0, finalistica: 0 }
        const newValue = field === 'total' ? rowData.total : rowData.finalistica
        const previousValue = activeValueRef.current

        // Auto-fill accounts
        const autoFillAccounts = ['1.5.1.1', '1.7.1.10', '1.12.1.5']

        // Only save if value changed
        if (newValue !== previousValue || (autoFillAccounts.includes(accountId) && field === 'total')) {
            setSaving(true)

            // Audit
            addAuditEntry({
                accountId,
                accountName: account.name,
                field,
                previousValue,
                newValue
            })

            try {
                await saveExpenseEntry(accountId, account.name, rowData.total, rowData.finalistica)
            } catch (error) {
                console.error('Error saving to Supabase:', error)
            } finally {
                setSaving(false)
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

    const handleDailyRecovery = async () => {
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

    const [debugOrgId, setDebugOrgId] = useState<string>("")

    // DEV MODE: Allow switching orgs
    const handleDevOrgChange = (newOrgId: string) => {
        sessionStorage.setItem('orgId', newOrgId)
        setDebugOrgId(newOrgId)
        window.location.reload() // Reload to force data fetch with new ID
    }

    const devOrgs = [
        { id: 'cfa', name: 'CFA' },
        { id: 'cra-sp', name: 'CRA-SP' },
        { id: 'cra-rj', name: 'CRA-RJ' },
        { id: 'cra-mg', name: 'CRA-MG' },
        { id: 'cra-ce', name: 'CRA-CE' },
        { id: 'cra-df', name: 'CRA-DF' },
    ]

    useEffect(() => {
        setDebugOrgId(typeof window !== 'undefined' ? sessionStorage.getItem('orgId') || "null" : "")
    }, [])



    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="p-8 text-center text-slate-500">Carregando grid...</div>
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-blue-900">Resumo das Despesas</h2>
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

            {/* Dashboard Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {(() => {
                    // Calculate Global Metrics
                    let totalFinalistica = 0
                    let totalApoio = 0
                    let totalDespesasCorrentes = 0
                    let totalDespesasCapital = 0
                    let totalGeral = 0

                    accounts.filter(a => a.type === 'Analítica').forEach(acc => {
                        const row = data[acc.id] || { total: 0, finalistica: 0 }
                        const apoio = row.total - row.finalistica

                        totalFinalistica += row.finalistica
                        totalApoio += apoio
                        totalGeral += row.total

                        // Simple heuristic: Group 1 = Correntes, Group 2 = Capital
                        // Checking first char of ID
                        if (acc.id.startsWith('1')) {
                            totalDespesasCorrentes += row.total
                        } else if (acc.id.startsWith('2')) {
                            totalDespesasCapital += row.total
                        }
                    })

                    const pctFinalistica = totalGeral > 0 ? (totalFinalistica / totalGeral) * 100 : 0
                    const pctApoio = totalGeral > 0 ? (totalApoio / totalGeral) * 100 : 0

                    return (
                        <>
                            <Card className="border-blue-200 bg-white">
                                <CardHeader className="pb-2 px-3 pt-3">
                                    <CardTitle className="text-xs font-medium text-slate-600">
                                        Despesa Finalística
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-3 pb-3">
                                    <div className="text-lg font-bold text-blue-900">
                                        {totalFinalistica.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </div>
                                    <div className="text-xs text-blue-600 font-medium">
                                        {pctFinalistica.toFixed(1)}%
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200 bg-slate-50">
                                <CardHeader className="pb-2 px-3 pt-3">
                                    <CardTitle className="text-xs font-medium text-slate-600">
                                        Despesa de Apoio
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-3 pb-3">
                                    <div className="text-lg font-bold text-slate-900">
                                        {totalApoio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </div>
                                    <div className="text-xs text-slate-600 font-medium">
                                        {pctApoio.toFixed(1)}%
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-blue-100 bg-blue-50/50">
                                <CardHeader className="pb-2 px-3 pt-3">
                                    <CardTitle className="text-xs font-medium text-blue-700">
                                        Despesas Correntes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-3 pb-3">
                                    <div className="text-lg font-bold text-blue-900">
                                        {totalDespesasCorrentes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200 bg-white">
                                <CardHeader className="pb-2 px-3 pt-3">
                                    <CardTitle className="text-xs font-medium text-purple-700">
                                        Despesas de Capital
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-3 pb-3">
                                    <div className="text-lg font-bold text-purple-900">
                                        {totalDespesasCapital.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-blue-300 bg-blue-50">
                                <CardHeader className="pb-2 px-3 pt-3">
                                    <CardTitle className="text-xs font-medium text-blue-900">
                                        Total Geral
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-3 pb-3">
                                    <div className="text-lg font-bold text-blue-950">
                                        {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )
                })()}
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
                                            const parts = account.id.split('.')

                                            // Check Duplicate Names Logic
                                            let hideRow = false
                                            let isPseudoSynthetic = false

                                            if (account.type === 'Sintética') {
                                                // Only match parents that have EXACTLY ONE child with the SAME NAME
                                                const directChildren = accounts.filter(child =>
                                                    child.id.startsWith(account.id + '.') &&
                                                    child.id.split('.').length === parts.length + 1
                                                )

                                                if (directChildren.length === 1 && directChildren[0].name.trim().toLowerCase() === account.name.trim().toLowerCase()) {
                                                    hideRow = true
                                                }
                                            } else if (account.type === 'Analítica') {
                                                // Standard logic: if I am the only child and match parent name, I might look synthetic IF parent is hidden.
                                                // If parent is shown (because it had multiple children), I should look analytic.
                                                if (parts.length > 1) {
                                                    const parentId = parts.slice(0, -1).join('.')
                                                    const parent = accounts.find(a => a.id === parentId)
                                                    const siblings = accounts.filter(a =>
                                                        a.id.startsWith(parentId + '.') &&
                                                        a.id.split('.').length === parts.length
                                                    )

                                                    // If parent matches name AND I am the only child (sibling count 1), 
                                                    // then parent was hidden above. So I take over visually.
                                                    if (parent && parent.name.trim().toLowerCase() === account.name.trim().toLowerCase() && siblings.length === 1) {
                                                        isPseudoSynthetic = true
                                                    }
                                                }
                                            }

                                            if (hideRow) return null

                                            const isSynthetic = account.type === 'Sintética'
                                            let rowValues;

                                            if (isSynthetic) {
                                                // Calculate totals for synthetic account
                                                const descendants = accounts.filter(a =>
                                                    a.type === 'Analítica' &&
                                                    a.id.startsWith(account.id + '.')
                                                )

                                                const total = descendants.reduce((sum, desc) => {
                                                    const val = data[desc.id]?.total || 0
                                                    return sum + val
                                                }, 0)

                                                const finalistica = descendants.reduce((sum, desc) => {
                                                    const val = data[desc.id]?.finalistica || 0
                                                    return sum + val
                                                }, 0)

                                                const apoio = total - finalistica
                                                const pctFinalistica = total > 0 ? (finalistica / total) * 100 : 0
                                                const pctApoio = total > 0 ? (apoio / total) * 100 : 0

                                                rowValues = { total, finalistica, apoio, pctFinalistica, pctApoio }
                                            } else {
                                                rowValues = getRowValues(account)
                                            }

                                            const hasValidationError = hasError(account.id)
                                            const effectiveIsSynthetic = isSynthetic || isPseudoSynthetic
                                            // const description = customDescriptions[account.id] || staticDescriptions[account.id]

                                            return (
                                                <TableRow key={account.id} className={cn(effectiveIsSynthetic && "bg-slate-50 font-semibold")}>
                                                    <TableCell className={cn("py-2", effectiveIsSynthetic ? "pl-4" : "pl-8")}>
                                                        {account.name}
                                                        {hasValidationError && (
                                                            <AlertCircle className="inline-block h-4 w-4 ml-2 text-red-600" />
                                                        )}
                                                    </TableCell>

                                                    {isSynthetic ? (
                                                        <>
                                                            <TableCell className="text-right text-slate-700">
                                                                {rowValues.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </TableCell>
                                                            <TableCell className="text-right text-slate-700">
                                                                {rowValues.finalistica.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </TableCell>
                                                            <TableCell className="text-right text-slate-700">
                                                                {rowValues.apoio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </TableCell>
                                                            <TableCell className="text-right text-slate-600 bg-slate-50/50">
                                                                {rowValues.pctFinalistica.toFixed(1)}%
                                                            </TableCell>
                                                            <TableCell className="text-right text-slate-600 bg-slate-50/50">
                                                                {rowValues.pctApoio.toFixed(1)}%
                                                            </TableCell>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TableCell>
                                                                <FormattedNumberInput
                                                                    value={data[account.id]?.total || 0}
                                                                    onChange={(val) => handleValueChange(account.id, 'total', val)}
                                                                    onFocus={() => handleInputFocus(data[account.id]?.total || 0)}
                                                                    onBlur={() => handleInputBlur(account.id, 'total')}
                                                                    disabled={isPastDeadline}
                                                                    className={isPastDeadline ? "bg-slate-100 cursor-not-allowed" : ""}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <FormattedNumberInput
                                                                    value={data[account.id]?.finalistica || 0}
                                                                    onChange={(val) => handleValueChange(account.id, 'finalistica', val)}
                                                                    onFocus={() => handleInputFocus(data[account.id]?.finalistica || 0)}
                                                                    onBlur={() => handleInputBlur(account.id, 'finalistica')}
                                                                    disabled={['1.5.1.1', '1.7.1.10', '1.12.1.5'].includes(account.id) || isPastDeadline}
                                                                    className={cn(
                                                                        hasValidationError && "border-red-500 bg-red-50",
                                                                        (['1.5.1.1', '1.7.1.10', '1.12.1.5'].includes(account.id) || isPastDeadline) && "bg-slate-100 text-slate-500 cursor-not-allowed"
                                                                    )}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium text-slate-700">
                                                                {rowValues.apoio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </TableCell>
                                                            <TableCell className="text-right text-slate-500 bg-slate-100/50 opacity-80">
                                                                {rowValues.pctFinalistica.toFixed(1)}%
                                                            </TableCell>
                                                            <TableCell className="text-right text-slate-500 bg-slate-100/50 opacity-80">
                                                                {rowValues.pctApoio.toFixed(1)}%
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
