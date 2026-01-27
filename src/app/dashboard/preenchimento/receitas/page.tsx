import RevenueGrid from "@/components/revenue-grid"
import RectificationGuard from "@/components/rectification-guard"

export default function ReceitasPage() {
    return (
        <RectificationGuard>
            <div className="container mx-auto py-6">
                <RevenueGrid />
            </div>
        </RectificationGuard>
    )
}
