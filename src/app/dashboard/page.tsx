"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DashboardRedirect() {
    const router = useRouter()

    useEffect(() => {
        // Redirect to the new expense dashboard location
        router.push('/dashboard/dashboards/despesas')
    }, [router])

    return (
        <div className="flex items-center justify-center min-h-screen" suppressHydrationWarning={true}>
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Redirecionando...</p>
            </div>
        </div>
    )
}
