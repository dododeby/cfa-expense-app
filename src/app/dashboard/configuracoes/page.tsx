"use client"
import dynamic from 'next/dynamic'
import ResponsibleForm from "./components/ResponsibleForm"
import AuditHistory from "./components/AuditHistory"
// import ClientOnly from "@/components/client-only" 
import DeclarationManager from "./components/DeclarationManager"

const Tabs = dynamic(() => import("@/components/ui/tabs").then(mod => mod.Tabs), { ssr: false })
const TabsList = dynamic(() => import("@/components/ui/tabs").then(mod => mod.TabsList), { ssr: false })
const TabsTrigger = dynamic(() => import("@/components/ui/tabs").then(mod => mod.TabsTrigger), { ssr: false })
const TabsContent = dynamic(() => import("@/components/ui/tabs").then(mod => mod.TabsContent), { ssr: false })

import CfaOverview from "./components/CfaOverview"

// ... existing imports

export default function ConfiguracoesPage() {
    const isCFA = typeof window !== 'undefined' && sessionStorage.getItem('orgType') === 'CFA'

    return (
        <div className="space-y-6" suppressHydrationWarning={true}>
            <div suppressHydrationWarning={true}>
                <h1 className="text-3xl font-bold text-slate-900">Entrega de Declaração</h1>
                <p className="text-slate-500 mt-1">
                    Preencha os responsáveis e realize a entrega da declaração anual
                </p>
            </div>

            <Tabs defaultValue={isCFA ? "visao-geral" : "responsaveis"} className="w-full">
                <TabsList className={`grid w-full ${isCFA ? 'grid-cols-3' : 'grid-cols-2'} max-w-xl`}>
                    {isCFA && <TabsTrigger value="visao-geral">Visão Geral (CFA)</TabsTrigger>}
                    <TabsTrigger value="responsaveis">Cadastro e Entrega</TabsTrigger>
                    <TabsTrigger value="historico">Histórico de Alterações</TabsTrigger>
                </TabsList>

                {isCFA && (
                    <TabsContent value="visao-geral" className="mt-6">
                        <CfaOverview />
                    </TabsContent>
                )}

                <TabsContent value="responsaveis" className="space-y-8 mt-6">
                    <ResponsibleForm />
                    <DeclarationManager />
                </TabsContent>

                <TabsContent value="historico" className="mt-6">
                    <AuditHistory />
                </TabsContent>
            </Tabs>
        </div>
    )
}
