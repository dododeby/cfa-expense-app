"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { loadResponsibleData, saveResponsibleData, type ResponsibleData } from "@/lib/responsible-data"
import { Save, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ResponsibleForm() {
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState<ResponsibleData>({
        unitResponsibleName: '',
        unitResponsibleCraNumber: '',
        dataResponsibleName: '',
        dataResponsibleRole: '',
        dataResponsibleDocType: 'CRC',
        dataResponsibleDocNumber: ''
    })

    useEffect(() => {
        const loadData = async () => {
            const orgId = sessionStorage.getItem('orgId')
            if (!orgId) return

            const data = await loadResponsibleData(orgId)
            if (data) {
                setFormData(data)
            }
            setLoading(false)
        }

        loadData()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const orgId = sessionStorage.getItem('orgId')
            if (!orgId) throw new Error('No organization ID found')

            await saveResponsibleData(orgId, formData)

            toast({
                title: "Dados salvos com sucesso!",
                description: "As informações dos responsáveis foram atualizadas.",
            })
        } catch (error) {
            console.error('Error saving:', error)
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível salvar os dados. Tente novamente.",
                variant: "destructive"
            })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Dados dos Responsáveis</CardTitle>
                <CardDescription>
                    Preencha as informações dos responsáveis pela unidade e pelo preenchimento dos dados
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Responsável pela Unidade */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                            Responsável pela Unidade (Presidente)
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="unitName">Nome Completo *</Label>
                                <Input
                                    id="unitName"
                                    value={formData.unitResponsibleName}
                                    onChange={(e) => setFormData({ ...formData, unitResponsibleName: e.target.value })}
                                    placeholder="Ex: João da Silva"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="craNumber">Número de Registro CRA *</Label>
                                <Input
                                    id="craNumber"
                                    value={formData.unitResponsibleCraNumber}
                                    onChange={(e) => setFormData({ ...formData, unitResponsibleCraNumber: e.target.value })}
                                    placeholder="Ex: CRA-XX 12345"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Responsável pelo Preenchimento */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                            Responsável pelo Preenchimento
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="dataName">Nome Completo *</Label>
                                <Input
                                    id="dataName"
                                    value={formData.dataResponsibleName}
                                    onChange={(e) => setFormData({ ...formData, dataResponsibleName: e.target.value })}
                                    placeholder="Ex: Maria Santos"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">Cargo *</Label>
                                <Input
                                    id="role"
                                    value={formData.dataResponsibleRole}
                                    onChange={(e) => setFormData({ ...formData, dataResponsibleRole: e.target.value })}
                                    placeholder="Ex: Contador(a)"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="docType">Tipo de Documento *</Label>
                                <Select
                                    value={formData.dataResponsibleDocType}
                                    onValueChange={(value: any) => setFormData({ ...formData, dataResponsibleDocType: value })}
                                >
                                    <SelectTrigger id="docType">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CRC">CRC</SelectItem>
                                        <SelectItem value="CRA">CRA</SelectItem>
                                        <SelectItem value="CPF">CPF</SelectItem>
                                        <SelectItem value="Outro">Outro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="docNumber">Número do Documento *</Label>
                                <Input
                                    id="docNumber"
                                    value={formData.dataResponsibleDocNumber}
                                    onChange={(e) => setFormData({ ...formData, dataResponsibleDocNumber: e.target.value })}
                                    placeholder="Ex: 123.456.789-00"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Salvar Dados
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
