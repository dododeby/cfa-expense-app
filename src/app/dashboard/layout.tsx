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
    Settings,
    UserPlus,
    Printer,
    Send
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
    const [pendingRegistrationCount, setPendingRegistrationCount] = useState(0)
    const [showWelcome, setShowWelcome] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
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

            // Ensure userName is in sessionStorage for audit logs
            if (session && !sessionStorage.getItem('userName')) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('full_name')
                    .eq('id', session.user.id)
                    .single()
                if (userData?.full_name) {
                    sessionStorage.setItem('userName', userData.full_name)
                }
            }

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

                // 3. Check Pending Registration Requests (Only for CFA)
                if (isCFA) {
                    const { data: pendingUsers, error: usersError } = await supabase
                        .from('users')
                        .select('id')
                        .eq('status', 'pending')

                    if (!usersError && pendingUsers) {
                        setPendingRegistrationCount(pendingUsers.length)
                    }
                }

                // 4. Check Welcome (For CRA only)
                if (!isCFA) {
                    const dismissed = localStorage.getItem(`welcomeDismissed_${orgId}`)
                    if (!dismissed) {
                        setShowWelcome(true)
                    } else {
                        setShowWelcome(false)
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

    const [expandedItems, setExpandedItems] = useState<string[]>([]) // Default collapsed

    useEffect(() => {
        // Auto-expand based on current path
        if (pathname?.startsWith('/dashboard/preenchimento')) {
            setExpandedItems(prev => prev.includes('Preenchimento') ? prev : [...prev, 'Preenchimento'])
        }
        if (pathname?.startsWith('/dashboard/consolidado')) {
            setExpandedItems(prev => prev.includes('Consolidado') ? prev : [...prev, 'Consolidado'])
        }
    }, [pathname])

    const toggleExpand = (title: string) => {
        setExpandedItems(prev => {
            // If clicking on an already expanded item, close it
            if (prev.includes(title)) {
                return prev.filter(t => t !== title)
            }
            // Otherwise, close all others and open only this one
            return [title]
        })
    }

    const sidebarItems: any[] = [
        {
            title: "Dashboard",
            href: "#",
            icon: LayoutDashboard,
            children: [
                {
                    title: "Receitas",
                    href: "/dashboard/dashboards/receitas",
                    icon: BarChart3
                },
                {
                    title: "Despesas",
                    href: "/dashboard/dashboards/despesas",
                    icon: BarChart3
                },
                {
                    title: "Comparativo",
                    href: "/dashboard/dashboards/comparativo",
                    icon: BarChart3
                }
            ]
        },
        {
            title: "Preenchimento",
            href: "#", // Parent item
            icon: FileSpreadsheet,
            children: [
                {
                    title: "Receitas",
                    href: "/dashboard/preenchimento/receitas",
                    icon: BarChart3
                },
                {
                    title: "Despesas",
                    href: "/dashboard/preenchimento/despesas",
                    icon: FileSpreadsheet
                }
            ]
        },
    ]

    // Add Consolidated view for CFA only (right after Preenchimento)
    if (orgType === 'CFA') {
        sidebarItems.push({
            title: "Consolidado",
            href: "#",
            icon: BarChart3,
            children: [
                {
                    title: "Receitas",
                    href: "/dashboard/consolidado/receitas",
                    icon: BarChart3
                },
                {
                    title: "Despesas",
                    href: "/dashboard/consolidado/despesas",
                    icon: FileSpreadsheet
                }
            ]
        })

        // Add Cadastros menu for CFA only
        sidebarItems.push({
            title: "Cadastros",
            href: "/dashboard/cadastros",
            icon: UserPlus
        } as typeof sidebarItems[0])
    }

    // Add remaining items (reordered: Relatórios, Legislação, Informações, Histórico)
    sidebarItems.push(
        {
            title: "Relatórios",
            href: "/dashboard/relatorios",
            icon: Printer, // Reusing icon for generic reports
        },
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
            title: "Entrega de Declaração",
            href: "/dashboard/configuracoes",
            icon: Send,
        }
    )

    const handleLogout = async () => {
        await supabase.auth.signOut()
        sessionStorage.clear()
        router.push('/')
    }



    const isCFA = orgType === 'CFA'
    const totalNotifications = errorCount + unreadMessageCount + newLegislationCount + pendingRegistrationCount + (showWelcome && !isCFA ? 1 : 0)

    return (
        <div className="flex h-screen bg-slate-50" suppressHydrationWarning={true}>
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col print:hidden">
                <div className="p-6 border-b border-slate-200" suppressHydrationWarning={true}>
                    <h1 className="text-xl font-bold text-blue-900">Sistema CFA/CRA's</h1>
                    <p className="text-xs text-slate-400 mt-1">Contas consolidadas</p>
                    {orgName && (
                        <p className="text-sm text-slate-600 mt-1 font-medium">{orgName}</p>
                    )}
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {sidebarItems.map((item) => {
                        const isActive = item.href !== '#' && (pathname === item.href || pathname?.startsWith(item.href + "/"))
                        const isExpanded = expandedItems.includes(item.title)

                        // Check if any child is active
                        const isChildActive = item.children?.some((child: any) => pathname === child.href)

                        if (item.children) {
                            return (
                                <div key={item.title} className="space-y-1" suppressHydrationWarning={true}>
                                    <button
                                        onClick={() => toggleExpand(item.title)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                            isChildActive
                                                ? "bg-blue-50 text-blue-700"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        <div className="flex items-center gap-3" suppressHydrationWarning={true}>
                                            <item.icon className="h-4 w-4" />
                                            {item.title}
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="pl-4 space-y-1 border-l-2 border-slate-100 ml-4">
                                            {item.children.map((child: any) => {
                                                const isChildActive = pathname === child.href
                                                return (
                                                    <Link
                                                        key={child.href}
                                                        href={child.href}
                                                        className={cn(
                                                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                                            isChildActive
                                                                ? "text-blue-700 font-semibold"
                                                                : "text-slate-500 hover:text-slate-900"
                                                        )}
                                                    >
                                                        {child.title}
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        }

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

                <div className="p-4 border-t border-slate-200" suppressHydrationWarning={true}>
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
                <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-end items-center print:hidden">
                    {mounted ? (
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

                                    {/* Welcome Message - Emerald (First time only) */}
                                    {showWelcome && !isCFA && (
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
                                            <p className="text-sm text-emerald-800 font-medium">
                                                Bem-vindo ao Sistema CFA/CRAs
                                            </p>
                                            <p className="text-xs text-emerald-600 mt-1">
                                                Sistema de Consolidação das Contas Públicas - DN TCU 216/2025.
                                            </p>
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="text-emerald-700 p-0 h-auto mt-2"
                                                onClick={() => {
                                                    const orgId = sessionStorage.getItem('orgId') || ''
                                                    localStorage.setItem(`welcomeDismissed_${orgId}`, 'true')
                                                    window.dispatchEvent(new Event('messagesRead')) // Trigger refresh
                                                }}
                                            >
                                                Marcar como lido
                                            </Button>
                                        </div>
                                    )}

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

                                    {/* Pending Registrations - Orange (Only for CFA) */}
                                    {pendingRegistrationCount > 0 && (
                                        <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                                            <p className="text-sm text-orange-800 font-medium">
                                                {pendingRegistrationCount} solicitação(ões) de cadastro
                                            </p>
                                            <p className="text-xs text-orange-600 mt-1">
                                                Há novas solicitações de cadastro aguardando aprovação.
                                            </p>
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="text-orange-700 p-0 h-auto mt-2"
                                                onClick={() => {
                                                    router.push('/dashboard/usuarios')
                                                }}
                                            >
                                                Gerenciar cadastros →
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
                    ) : (
                        <Button variant="ghost" size="sm" className="relative">
                            <Bell className="h-5 w-5 text-slate-600" />
                        </Button>
                    )}
                </header>

                <div className="p-8 flex-1" suppressHydrationWarning={true}>
                    {children}
                </div>
            </main>
        </div>
    )
}
