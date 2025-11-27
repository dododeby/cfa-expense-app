"use client"

import { useState, useEffect, useRef } from "react"
import { Account, AccountType, INITIAL_ACCOUNTS } from "@/lib/initial-data"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Download, Upload, FileBarChart } from "lucide-react"
import { exportToExcel, importFromExcel, exportForBI } from "@/lib/excel-utils"

interface ExpenseData {
    [accountId: string]: {
        total: number;
        finalistica: number;
    }
}

export function ExpenseGrid() {
    const [data, setData] = useState<ExpenseData>({})
    const [saving, setSaving] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Auto-save simulation
    useEffect(() => {
        const timer = setTimeout(() => {
            if (Object.keys(data).length > 0) {
                setSaving(true)
                // Simulate API call
                setTimeout(() => setSaving(false), 1000)
            }
        }, 2000)

        return () => clearTimeout(timer)
    }, [data])

    const handleInputChange = (accountId: string, field: 'total' | 'finalistica', value: string) => {
        const numValue = parseFloat(value) || 0
        setData(prev => ({
            ...prev,
            [accountId]: {
                ...prev[accountId],
                [field]: numValue
            }
        }))
    }

    const handleExport = () => {
        exportToExcel(data, "MinhaRegional");
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

    const handleBIExport = () => {
        // Mock data for other regionals to demonstrate the BI export
        const mockAllData = {
            'cra-ce': data, // Current data as CRA-CE
            'cra-sp': data, // Duplicate for demo
            'cfa': data     // Duplicate for demo
        };

        const mockOrgs = [
            { id: 'cra-ce', name: 'CRA-CE' },
            { id: 'cra-sp', name: 'CRA-SP' },
            { id: 'cfa', name: 'CFA' }
        ];

        exportForBI(mockAllData, mockOrgs);
    }

    // Calculate derived values
    const getRowValues = (account: Account) => {
        if (account.type === 'ANALYTICAL') {
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
        } else {
            return { total: 0, finalistica: 0, apoio: 0, pctFinalistica: 0, pctApoio: 0 }
        }
    }

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
                    <Button variant="secondary" size="sm" onClick={handleBIExport}>
                        <FileBarChart className="h-4 w-4 mr-2" />
                        Exportar BI (CFA)
                    </Button>
                </div>
            </div>

            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-100">
                        <TableRow>
                            <TableHead className="w-[300px]">Conta</TableHead>
                            <TableHead className="w-[150px] text-right">Total</TableHead>
                            <TableHead className="w-[150px] text-right">Atividade Finalística</TableHead>
                            <TableHead className="w-[150px] text-right">Atividade de Apoio</TableHead>
                            <TableHead className="w-[100px] text-right">% Finalística</TableHead>
                            <TableHead className="w-[100px] text-right">% Apoio</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {INITIAL_ACCOUNTS.map((account) => {
                            const values = getRowValues(account)
                            const isSynthetic = account.type === 'SYNTHETIC'

                            return (
                                <TableRow key={account.id} className={cn(isSynthetic && "bg-slate-50 font-semibold")}>
                                    <TableCell className={cn("py-2", isSynthetic ? "pl-4" : "pl-8")}>
                                        {account.code} - {account.name}
                                    </TableCell>

                                    {isSynthetic ? (
                                        // Synthetic Row (Read-only/Calculated)
                                        <>
                                            <TableCell className="text-right text-slate-500">-</TableCell>
                                            <TableCell className="text-right text-slate-500">-</TableCell>
                                            <TableCell className="text-right text-slate-500">-</TableCell>
                                            <TableCell className="text-right text-slate-500">-</TableCell>
                                            <TableCell className="text-right text-slate-500">-</TableCell>
                                        </>
                                    ) : (
                                        // Analytical Row (Input)
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
                                                    className="text-right h-8"
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
        </div>
    )
}
