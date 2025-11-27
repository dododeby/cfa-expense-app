"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Info, MessageCircle, Send, Inbox } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Message {
    id: string
    type: 'cfa_to_cras' | 'cra_to_cfa'
    from: string
    to: string
    message: string
    timestamp: string
    read: boolean
}

export default function InformacoesPage() {
    const searchParams = useSearchParams()
    const [orgType, setOrgType] = useState<string>('')
    const [orgName, setOrgName] = useState<string>('')
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [activeTab, setActiveTab] = useState<string>('informacoes')

    const isCFA = orgType === 'CFA'

    useEffect(() => {
        const type = sessionStorage.getItem('orgType') || ''
        const name = sessionStorage.getItem('orgName') || ''
        setOrgType(type)
        setOrgName(name)

        // Set initial tab based on URL param or user type
        const tabParam = searchParams.get('tab')
        if (tabParam) {
            setActiveTab(tabParam)
        } else {
            setActiveTab(type === 'CFA' ? 'duvidas' : 'informacoes')
        }

        loadMessages()
    }, [searchParams])

    const loadMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            const formattedMessages: Message[] = (data || []).map(msg => ({
                id: msg.id,
                type: msg.type,
                from: msg.sender_org,
                to: msg.recipient_org || 'all',
                message: msg.content,
                timestamp: msg.created_at,
                read: msg.read || false
            }))

            setMessages(formattedMessages)

            // Update last viewed timestamp for broadcast messages logic
            // Use orgId in key to isolate sessions on same browser
            const orgId = sessionStorage.getItem('orgId') || ''
            const storageKey = `lastViewedMessages_${orgId}`
            localStorage.setItem(storageKey, new Date().toISOString())

            // Handle "Read" status in DB only for direct interactions
            const type = sessionStorage.getItem('orgType') || ''
            const name = sessionStorage.getItem('orgName') || ''
            const isCFAUser = type === 'CFA'

            const unreadDirectMessages = formattedMessages.filter(msg => {
                if (!msg.read) {
                    if (isCFAUser) {
                        // CFA: Mark as read messages sent TO CFA (from CRAs)
                        return msg.type === 'cra_to_cfa'
                    } else {
                        // CRA: Mark as read messages sent TO THIS CRA (direct replies) OR Broadcasts
                        // We want to mark them as read in DB so they stop showing as "Unread" in notification
                        const isFromCFA = msg.type === 'cfa_to_cras'
                        const isForMe = msg.to === name || msg.to === 'all' || msg.to === 'ALL_CRAS'
                        return isFromCFA && isForMe
                    }
                }
                return false
            })

            // Mark unread DIRECT messages as read in DB
            if (unreadDirectMessages.length > 0) {
                const messageIds = unreadDirectMessages.map(msg => msg.id)
                await supabase
                    .from('messages')
                    .update({ read: true })
                    .in('id', messageIds)
            }

            // Notify layout to update notification count immediately
            window.dispatchEvent(new Event('messagesRead'))

        } catch (error) {
            console.error('Error loading messages:', error)
        }
    }

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return

        try {
            const messageData = {
                type: isCFA ? 'cfa_to_cras' : 'cra_to_cfa',
                sender_org: orgName,
                recipient_org: isCFA ? 'ALL_CRAS' : 'CFA',
                content: newMessage,
                read: false
            }

            const { data, error } = await supabase
                .from('messages')
                .insert([messageData])
                .select()

            if (error) {
                console.error('Supabase error details:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                })
                throw error
            }

            setNewMessage('')
            loadMessages()

            // Notify other users to check for new messages
            window.dispatchEvent(new Event('messagesRead'))

            alert('Mensagem enviada com sucesso!')
        } catch (error: any) {
            console.error('Error sending message:', error)
            alert(`Erro ao enviar mensagem: ${error?.message || 'Erro desconhecido'}`)
        }
    }

    // Filter messages based on user type
    const relevantMessages = messages.filter(msg => {
        if (isCFA) {
            return msg.type === 'cra_to_cfa'
        } else {
            return msg.type === 'cfa_to_cras' || (msg.type === 'cra_to_cfa' && msg.from === orgName)
        }
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">
                    {isCFA ? 'Dúvidas e Mensagens' : 'Mensagens e Dúvidas'}
                </h1>
                <p className="text-slate-500">
                    {isCFA ? 'Comunicação com os regionais' : 'Central de informações e comunicação'}
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList>
                    {!isCFA && (
                        <TabsTrigger value="informacoes">
                            <Info className="h-4 w-4 mr-2" />
                            Informações
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="duvidas">
                        {isCFA ? <Inbox className="h-4 w-4 mr-2" /> : <MessageCircle className="h-4 w-4 mr-2" />}
                        {isCFA ? 'Mensagens' : 'Dúvidas'}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="informacoes" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sobre o Sistema</CardTitle>
                            <CardDescription>Informações gerais sobre o preenchimento</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="font-semibold mb-2">Prazo de Preenchimento</h3>
                                <p className="text-sm text-slate-600">
                                    O prazo para preenchimento das despesas é até 31 de março de 2026.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">Como Preencher</h3>
                                <p className="text-sm text-slate-600">
                                    1. Acesse a aba "Preenchimento"<br />
                                    2. Selecione o grupo de despesas<br />
                                    3. Preencha os valores nas colunas "Total" e "Atividade Finalística"<br />
                                    4. Os valores de "Atividade de Apoio" e percentuais são calculados automaticamente<br />
                                    5. As alterações são salvas automaticamente
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">Importação/Exportação</h3>
                                <p className="text-sm text-slate-600">
                                    Você pode exportar sua planilha para Excel, preencher offline e depois importar de volta ao sistema.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Contatos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-600">
                                <strong>Email:</strong> suporte@cfa.org.br<br />
                                <strong>Telefone:</strong> (61) 3218-1800
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="duvidas" className="space-y-4">
                    <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                            <CardTitle>
                                {isCFA ? 'Enviar Mensagem aos Regionais' : 'Enviar Dúvida ao CFA'}
                            </CardTitle>
                            <CardDescription>
                                {isCFA ? 'Sua mensagem será enviada a todos os CRAs' : 'Sua mensagem será enviada ao CFA'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={isCFA ? "Digite sua mensagem para os regionais..." : "Descreva sua dúvida aqui..."}
                                    rows={4}
                                />
                            </div>
                            <Button onClick={handleSendMessage} className="w-full">
                                <Send className="h-4 w-4 mr-2" />
                                {isCFA ? 'Enviar Mensagem' : 'Enviar Dúvida'}
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold">
                            {isCFA ? 'Dúvidas Recebidas dos Regionais' : 'Mensagens e Dúvidas'}
                        </h2>
                        {relevantMessages.length === 0 && (
                            <p className="text-sm text-slate-500 text-center py-8">
                                {isCFA ? 'Nenhuma dúvida recebida ainda.' : 'Nenhuma mensagem ainda.'}
                            </p>
                        )}
                        {relevantMessages.map((msg) => {
                            const isFromCFA = msg.type === 'cfa_to_cras'

                            return (
                                <Card
                                    key={msg.id}
                                    className={isFromCFA ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-sm font-medium">
                                                    {isFromCFA ? '📢 Mensagem do CFA' : `❓ Dúvida de ${msg.from}`}
                                                </CardTitle>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {new Date(msg.timestamp).toLocaleString('pt-BR')}
                                                </p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
