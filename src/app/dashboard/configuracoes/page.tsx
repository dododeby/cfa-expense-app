"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ResponsibleForm from "./components/ResponsibleForm"
import ReportGenerator from "./components/ReportGenerator"
import AuditHistory from "./components/AuditHistory"

export default function ConfiguracoesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Configurações</h1>
                <p className="text-slate-500 mt-1">
                    Gerencie dados dos responsáveis e visualize o histórico de alterações
                </p>
            </div>

            <Tabs defaultValue="responsaveis" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="responsaveis">Cadastro de Responsáveis</TabsTrigger>
                    <TabsTrigger value="historico">Histórico de Alterações</TabsTrigger>
                </TabsList>

                <TabsContent value="responsaveis" className="space-y-6 mt-6">
                    <ResponsibleForm />
                    <ReportGenerator />
                </TabsContent>

                <TabsContent value="historico" className="mt-6">
                    <AuditHistory />
                </TabsContent>
            </Tabs>
        </div>
    )
}
