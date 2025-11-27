import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loadExpenseData, loadConsolidatedData } from './expense-data'
import { loadOrganizations } from './expense-data'
import allAccountsData from './all-accounts.json'
import type { ResponsibleData } from './responsible-data'

interface Account {
    id: string
    name: string
    type: string
    group: string
}

const accounts: Account[] = allAccountsData as Account[]

/**
 * Generate expense report PDF for a single organization
 */
export async function generateExpenseReportPDF(
    orgId: string,
    orgName: string,
    responsibleData: ResponsibleData | null
) {
    const doc = new jsPDF()
    const data = await loadExpenseData()

    // Header
    doc.setFontSize(16)
    doc.text('Relatório de Despesas', 105, 15, { align: 'center' })
    doc.setFontSize(12)
    doc.text(orgName, 105, 22, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 105, 28, { align: 'center' })

    // Prepare table data
    const tableData: any[] = []
    let totalGeral = 0
    let finalisticaGeral = 0

    accounts.forEach(account => {
        if (account.type === 'Analítica') {
            const expense = data[account.id]
            const total = expense?.total || 0
            const finalistica = expense?.finalistica || 0
            const apoio = total - finalistica

            tableData.push([
                account.name,
                `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                `R$ ${finalistica.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                `R$ ${apoio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            ])

            totalGeral += total
            finalisticaGeral += finalistica
        }
    })

    // Add totals row
    tableData.push([
        'TOTAL',
        `R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${finalisticaGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${(totalGeral - finalisticaGeral).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ])

    // Generate table
    autoTable(doc, {
        startY: 35,
        head: [['Conta', 'Total', 'Finalística', 'Apoio']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        footStyles: { fillColor: [226, 232, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    })

    // Footer with responsible data
    if (responsibleData) {
        const finalY = (doc as any).lastAutoTable.finalY || 35
        doc.setFontSize(8)
        doc.text('Responsáveis:', 14, finalY + 10)
        doc.text(`Presidente: ${responsibleData.unitResponsibleName} (${responsibleData.unitResponsibleCraNumber})`, 14, finalY + 15)
        doc.text(`Preenchimento: ${responsibleData.dataResponsibleName} - ${responsibleData.dataResponsibleRole}`, 14, finalY + 20)
        doc.text(`Documento: ${responsibleData.dataResponsibleDocType} ${responsibleData.dataResponsibleDocNumber}`, 14, finalY + 25)
    }

    // Download
    doc.save(`despesas_${orgName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Generate consolidated expense report PDF (CFA + all CRAs)
 */
export async function generateConsolidatedExpenseReportPDF(responsibleData: ResponsibleData | null) {
    const doc = new jsPDF('landscape')
    const consolidatedData = await loadConsolidatedData()
    const orgs = await loadOrganizations()

    // Header
    doc.setFontSize(16)
    doc.text('Relatório Consolidado de Despesas', 148, 15, { align: 'center' })
    doc.setFontSize(12)
    doc.text('CFA + Todos os CRAs', 148, 22, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 148, 28, { align: 'center' })

    // Prepare table data (organizations as columns)
    const tableData: any[] = []

    // Get top 10 accounts for simplicity
    const topAccounts = accounts.filter(a => a.type === 'Analítica').slice(0, 10)

    topAccounts.forEach(account => {
        const row: any[] = [account.name]

        orgs.forEach(org => {
            const orgData = consolidatedData[org.id] || {}
            const expense = orgData[account.id]
            const total = expense?.total || 0
            row.push(`R$ ${(total / 1000).toFixed(0)}k`)
        })

        tableData.push(row)
    })

    // Generate table
    const headers = ['Conta', ...orgs.map(o => o.name)]
    autoTable(doc, {
        startY: 35,
        head: [headers],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontSize: 7 },
        bodyStyles: { fontSize: 6 },
        columnStyles: { 0: { cellWidth: 40 } }
    })

    // Footer
    if (responsibleData) {
        const finalY = (doc as any).lastAutoTable.finalY || 35
        doc.setFontSize(8)
        doc.text(`Responsável CFA: ${responsibleData.unitResponsibleName}`, 14, finalY + 10)
    }

    // Download
    doc.save(`consolidado_CFA_CRAs_${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Generate dashboard PDF (simple version with summary)
 */
export async function generateDashboardPDF(orgName: string, isCFA: boolean = false) {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(16)
    doc.text(`Dashboard ${isCFA ? 'Consolidado ' : ''}`, 105, 15, { align: 'center' })
    doc.setFontSize(12)
    doc.text(orgName, 105, 22, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 105, 28, { align: 'center' })

    // Placeholder for charts (would need chart library integration)
    doc.setFontSize(12)
    doc.text('Dashboard visual será implementado em versão futura', 105, 100, { align: 'center' })
    doc.setFontSize(10)
    doc.text('Por enquanto, utilize os relatórios de despesas', 105, 110, { align: 'center' })

    // Download
    doc.save(`dashboard_${orgName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
}
