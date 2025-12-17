"use client"

import dynamic from 'next/dynamic'
import ResponsibleForm from "./components/ResponsibleForm"
import AuditHistory from "./components/AuditHistory"
// import ClientOnly from "@/components/client-only" // No longer needed if using dynamic

const Tabs = dynamic(() => import("@/components/ui/tabs").then(mod => mod.Tabs), { ssr: false })
const TabsList = dynamic(() => import("@/components/ui/tabs").then(mod => mod.TabsList), { ssr: false })
const TabsTrigger = dynamic(() => import("@/components/ui/tabs").then(mod => mod.TabsTrigger), { ssr: false })
const TabsContent = dynamic(() => import("@/components/ui/tabs").then(mod => mod.TabsContent), { ssr: false })

export default function ConfiguracoesPage() {
    return (
        <div className="space-y-6" suppressHydrationWarning={true}>
            <div suppressHydrationWarning={true}>
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
                </TabsContent>

                <TabsContent value="historico" className="mt-6">
                    <AuditHistory />
                </TabsContent>
            </Tabs>
        </div>
    )
}
