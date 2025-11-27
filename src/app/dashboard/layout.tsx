"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    FileSpreadsheet,
    BookOpen,
    MessageCircleQuestion,
    LogOut,
    BarChart3,
    Bell,
    Settings
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { supabase } from "@/lib/supabase"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const [orgType, setOrgType] = useState<string>('')
    const [orgId, setOrgId] = useState<string>('')
    const [orgName, setOrgName] = useState<string>('')
    const [errorCount, setErrorCount] = useState(0)
    const [unreadMessageCount, setUnreadMessageCount] = useState(0)
    const [newLegislationCount, setNewLegislationCount] = useState(0)

    useEffect(() => {
        // Check authentication
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                router.push('/')
                return
            }

            const type = sessionStorage.getItem('orgType') || ''
            const id = sessionStorage.getItem('orgId') || ''
            const name = sessionStorage.getItem('orgName') || ''
            setOrgType(type)
            setOrgId(id)
            setOrgName(name)
        }

        checkAuth()

        // Check for validation errors
        const checkErrors = () => {
            const count = parseInt(sessionStorage.getItem('validationErrorCount') || '0')
            setErrorCount(count)
        }

        checkErrors()

        // Check for notifications (Messages + Legislation)
        const checkNotifications = async () => {
            const orgName = sessionStorage.getItem('orgName') || ''
            const orgType = sessionStorage.getItem('orgType') || ''
            const orgId = sessionStorage.getItem('orgId') || ''
            const isCFA = orgType === 'CFA'

            let msgCount = 0
            let legCount = 0

            try {
                // 1. Check Messages
                const { data: messages, error: msgError } = await supabase
                    .from('messages')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50) // Limit to recent messages

                if (!msgError && messages) {
                    console.log('Layout: Messages fetched:', messages.length)

                    if (isCFA) {
                        // CFA: Count unread messages from CRAs (direct messages)
                        msgCount = messages.filter(msg =>
                            msg.type === 'cra_to_cfa' && !msg.read
                        ).length
                    } else {
                        // CRAs: 
                        // A. Check unread direct messages (replies from CFA)
                        // EXCLUDE messages sent by self (cra_to_cfa && sender_org === orgName)
                        // Only count messages FROM CFA (cfa_to_cras) that are unread AND sent specifically to me

                        const unreadDirect = messages.filter(msg =>
                            msg.type === 'cfa_to_cras' && // Only messages FROM CFA
                            !msg.read &&
                            msg.recipient_org === orgName // STRICTLY for me (ignore broadcasts here)
                        ).length

                        // B. Check new broadcast messages based on last view
                        // Use orgId in key to isolate sessions on same browser
                        const storageKey = `lastViewedMessages_${orgId}`
                        const lastViewedMessages = localStorage.getItem(storageKey)
                        const lastViewDate = lastViewedMessages ? new Date(lastViewedMessages) : new Date(0)

                        const newBroadcasts = messages.filter(msg =>
                            msg.type === 'cfa_to_cras' &&
                            new Date(msg.created_at) > lastViewDate
                        ).length

                        console.log('Layout: CRA Debug', { unreadDirect, newBroadcasts, lastViewDate, orgId })

                        // Use the max to avoid double counting if logic overlaps
                        msgCount = Math.max(unreadDirect, newBroadcasts)
                    }
                } else {
                    console.error('Layout: Error fetching messages', {
                        message: msgError?.message,
                        code: msgError?.code,
                        details: msgError?.details,
                        hint: msgError?.hint,
                        fullError: msgError
                    })
                }

                // 2. Check Legislation (Only for CRAs)
                if (!isCFA) {
                    const { data: docs, error: docError } = await supabase
                        .from('legislation_documents')
                        .select('uploaded_at')
                        .order('uploaded_at', { ascending: false })
                        .limit(1)

                    if (!docError && docs && docs.length > 0) {
                        const lastDocDate = new Date(docs[0].uploaded_at)
                        // Use orgId in key to isolate sessions on same browser
                        const storageKey = `lastViewedLegislation_${orgId}`
                        const lastViewedLegislation = localStorage.getItem(storageKey)
                        const lastViewDate = lastViewedLegislation ? new Date(lastViewedLegislation) : new Date(0)

                        if (lastDocDate > lastViewDate) {
                            legCount = 1 // Add 1 notification for "New Legislation"
                        }
                    }
                }

                setUnreadMessageCount(msgCount)
                setNewLegislationCount(legCount)

            } catch (error) {
                console.error('Error checking notifications:', error)
            }
        }

        checkNotifications()

        // Poll every 5 seconds for faster feedback
        const interval = setInterval(checkNotifications, 5000)

        // Listen for custom events to refresh immediately
        window.addEventListener('messagesRead', checkNotifications)
        window.addEventListener('legislationRead', checkNotifications)
        window.addEventListener('storage', checkErrors)

        return () => {
            window.removeEventListener('storage', checkErrors)
            window.removeEventListener('messagesRead', checkNotifications)
            window.removeEventListener('legislationRead', checkNotifications)
            clearInterval(interval)
        }
    }, [router])

    const sidebarItems = [
        {
            title: "Dashboard",
            href: "/dashboard",
            icon: LayoutDashboard,
        },
        {
            title: "Preenchimento",
            href: "/dashboard/preenchimento",
            icon: FileSpreadsheet,
        },
    ]

    // Add Consolidated view for CFA only (right after Preenchimento)
    if (orgType === 'CFA') {
        sidebarItems.push({
            title: "Consolidado",
            href: "/dashboard/consolidado",
            icon: BarChart3,
        })
    }

    // Add remaining items (reordered: Legislação, Informações, Histórico)
    sidebarItems.push(
        {
            title: "Legislação",
            href: "/dashboard/legislacao",
            icon: BookOpen,
        },
        {
            title: "Mensagens e Dúvidas",
            href: "/dashboard/informacoes",
            icon: MessageCircleQuestion,
        },
        {
            title: "Configurações",
            href: "/dashboard/configuracoes",
            icon: Settings,
        }
    )

    const handleLogout = async () => {
        await supabase.auth.signOut()
        sessionStorage.clear()
        router.push('/')
    }

    const totalNotifications = errorCount + unreadMessageCount + newLegislationCount

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-6 border-b border-slate-200">
                    <h1 className="text-xl font-bold text-blue-900">Sistema CFA/CRA</h1>
                    {orgName && (
                        <p className="text-sm text-slate-500 mt-1">{orgName}</p>
                    )}
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.title}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-slate-200">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto flex flex-col">
                {/* Header with Notification Bell */}
                <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-end items-center">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="relative">
                                <Bell className="h-5 w-5 text-slate-600" />
                                {totalNotifications > 0 && (
                                    <Badge
                                        variant="destructive"
                                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                                    >
                                        {totalNotifications}
                                    </Badge>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm">Notificações</h4>

                                {/* Validation Errors - Red */}
                                {errorCount > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                        <p className="text-sm text-red-800 font-medium">
                                            {errorCount} erro(s) de validação
                                        </p>
                                        <p className="text-xs text-red-600 mt-1">
                                            Há contas com Total preenchido mas Finalística vazia.
                                        </p>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="text-red-700 p-0 h-auto mt-2"
                                            onClick={() => {
                                                window.dispatchEvent(new Event('showValidationDetails'))
                                                router.push('/dashboard/preenchimento')
                                            }}
                                        >
                                            Ver detalhes →
                                        </Button>
                                    </div>
                                )}

                                {/* Unread Messages - Blue */}
                                {unreadMessageCount > 0 && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                        <p className="text-sm text-blue-800 font-medium">
                                            {unreadMessageCount} mensagem(ns) não lida(s)
                                        </p>
                                        <p className="text-xs text-blue-600 mt-1">
                                            Você tem novas mensagens.
                                        </p>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="text-blue-700 p-0 h-auto mt-2"
                                            onClick={() => {
                                                router.push('/dashboard/informacoes?tab=duvidas')
                                            }}
                                        >
                                            Ver mensagens →
                                        </Button>
                                    </div>
                                )}

                                {/* New Legislation - Indigo */}
                                {newLegislationCount > 0 && (
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3">
                                        <p className="text-sm text-indigo-800 font-medium">
                                            Nova Legislação
                                        </p>
                                        <p className="text-xs text-indigo-600 mt-1">
                                            O CFA inseriu novo documento em legislação.
                                        </p>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="text-indigo-700 p-0 h-auto mt-2"
                                            onClick={() => {
                                                router.push('/dashboard/legislacao')
                                            }}
                                        >
                                            Ver documentos →
                                        </Button>
                                    </div>
                                )}

                                {/* No notifications */}
                                {totalNotifications === 0 && (
                                    <p className="text-sm text-slate-500">Nenhuma notificação</p>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                </header>

                <div className="p-8 flex-1">
                    {children}
                </div>
            </main>
        </div>
    )
}
