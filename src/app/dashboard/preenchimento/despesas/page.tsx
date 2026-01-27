import { TabbedExpenseGrid } from "@/components/tabbed-expense-grid"

export default function PreenchimentoPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Preenchimento</h1>
                <p className="text-slate-500">Informe as despesas do período organizadas por categoria.</p>
                <p className="text-sm text-slate-400 mt-1">(Despesa paga + restos a pagar = Despesa Empenhada)</p>
            </div>

            <TabbedExpenseGrid />
        </div>
    )
}
