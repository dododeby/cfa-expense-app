"use client"

import { useEffect, useState } from "react"
import { loadDeclaration, markDeclarationAsDraft, Declaration } from "@/lib/declarations"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Lock, Unlock } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function RectificationGuard({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true)
    const [isLocked, setIsLocked] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [declaration, setDeclaration] = useState<Declaration | null>(null)
    const [isPastDeadline, setIsPastDeadline] = useState(false)

    useEffect(() => {
        const checkStatus = async () => {
            const dec = await loadDeclaration()
            setDeclaration(dec)

            const deadline = new Date('2026-03-31T23:59:59')
            const now = new Date()
            const pastDeadline = now > deadline
            setIsPastDeadline(pastDeadline)

            const savedRectifying = sessionStorage.getItem('isRectifying') === 'true'

            // Locked if: Declaration exists AND Not explicitly unlocked AND Not past deadline (past deadline handles separately)
            // Actually, if past deadline, it is locked forever.
            // If before deadline and delivered and not rectifying, it is locked with option to unlock.

            // Locked if: Declaration exists with status='submitted' AND Not explicitly unlocked
            if (dec && dec.status === 'submitted' && !savedRectifying) {
                setIsLocked(true)
                setShowConfirm(true)
            }

            setLoading(false)
        }
        checkStatus()
    }, [])

    const handleUnlock = async () => {
        // Mark as draft in database
        const success = await markDeclarationAsDraft()

        if (success) {
            // Unlock for this session
            sessionStorage.setItem('isRectifying', 'true')
            setIsLocked(false)
            setShowConfirm(false)

            // Update local state
            if (declaration) {
                setDeclaration({ ...declaration, status: 'draft' })
            }

            // Reload page to refresh all components
            window.location.reload()
        }
    }

    if (loading) return <div>Carregando...</div>

    if (isPastDeadline) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-lg border-2 border-slate-200 border-dashed">
                <div className="bg-red-100 p-4 rounded-full mb-4">
                    <Lock className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Período de Preenchimento Encerrado</h2>
                <p className="text-slate-600 max-w-md">
                    O prazo para envio e retificação da declaração encerrou em 31/03/2026.
                    Não é possível realizar novas alterações.
                </p>
            </div>
        )
    }

    if (isLocked) {
        return (
            <div className="relative min-h-[60vh]">
                {/* Blurred Content Background (Optional, or just hide it) - Hiding is safer to prevent interaction */}
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8">
                    <div className="bg-amber-100 p-4 rounded-full mb-4 shadow-sm">
                        <Lock className="h-8 w-8 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Declaração Entregue</h2>
                    <p className="text-slate-600 max-w-md mb-8">
                        As informações já foram enviadas. Para realizar alterações, é necessário iniciar um processo de retificação.
                    </p>

                    <Button
                        size="lg"
                        onClick={() => setShowConfirm(true)}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        <Unlock className="mr-2 h-4 w-4" />
                        Retificar Declaração
                    </Button>

                    <p className="text-xs text-slate-500 mt-4 max-w-xs">
                        Ao retificar, o status voltará para "Pendente" e você deverá realizar um novo envio após as alterações.
                    </p>
                </div>

                {/* Confirm Dialog */}
                <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Deseja retificar as informações da declaração?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Após a retificação, será necessário realizar um <strong>novo envio</strong> da declaração completa.
                                <br /><br />
                                O status da declaração atual mudará para <strong>Pendente</strong> até que o novo envio seja confirmado.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleUnlock} className="bg-amber-600 hover:bg-amber-700">
                                Sim, Retificar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Render children hidden or blurred? If we don't render children, data might not load if it depends on mount. 
                    Better to not render children at all to be safe and save performance, 
                    OR render them hidden if we need to keep state. 
                    Given the requirement "bloqueado", not rendering is safest.
                */}
            </div>
        )
    }

    return <>{children}</>
}
