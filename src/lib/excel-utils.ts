import * as XLSX from 'xlsx';
import allAccountsData from './all-accounts.json';

interface Account {
    id: string;
    group: string;
    subgroup: string;
    type: string;
    name: string;
}

interface ExpenseData {
    [accountId: string]: {
        total: number;
        finalistica: number;
    }
}

const accounts: Account[] = allAccountsData as Account[];

/**
 * Export to Excel - Standard Format
 * Exports only: Grupo, Subgrupo, Tipo de Conta, Contas, Total, Atividade Finalística
 * Does NOT export: Apoio and percentages (calculated in system)
 */
export const exportToExcel = (data: ExpenseData, organizationName: string) => {
    const wb = XLSX.utils.book_new();

    // Create headers - only up to Finalística
    const headers = [
        "Grupo",
        "Subgrupo",
        "Tipo de Conta",
        "Contas",
        "Total",
        "Atividade Finalística"
    ];

    const rows = accounts.map(account => {
        const rowData = data[account.id] || { total: 0, finalistica: 0 };

        return [
            account.group,
            account.subgroup,
            account.type,
            account.name,
            rowData.total,
            rowData.finalistica
        ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Set column widths
    ws['!cols'] = [
        { wch: 35 }, // Grupo
        { wch: 25 }, // Subgrupo
        { wch: 12 }, // Tipo
        { wch: 50 }, // Contas
        { wch: 15 }, // Total
        { wch: 20 }  // Finalística
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Despesas");
    XLSX.writeFile(wb, `Despesas_${organizationName}.xlsx`);
};

/**
 * Import from Excel
 * Imports only: Total and Atividade Finalística
 * Apoio and percentages are calculated automatically
 */
export const importFromExcel = (file: File): Promise<ExpenseData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const wb = XLSX.read(data, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                const newData: ExpenseData = {};

                // Map account names to IDs for quick lookup
                const accountMap = new Map(
                    accounts.map(acc => [acc.name.trim().toLowerCase(), acc.id])
                );

                // Skip header row (index 0)
                jsonData.slice(1).forEach(row => {
                    // Column indices:
                    // 0: Grupo
                    // 1: Subgrupo
                    // 2: Tipo de Conta
                    // 3: Contas (Account Name)
                    // 4: Total
                    // 5: Atividade Finalística

                    const accountName = row[3]?.toString().trim().toLowerCase();
                    const total = parseFloat(row[4]) || 0;
                    const finalistica = parseFloat(row[5]) || 0;

                    if (accountName && accountMap.has(accountName)) {
                        const id = accountMap.get(accountName)!;
                        newData[id] = { total, finalistica };
                    }
                });

                resolve(newData);
            } catch (error) {
                reject(error);
            }
        };
        reader.readAsBinaryString(file);
    });
};

/**
 * Export for BI Analysis
 * Rows: Organizations (CFA + all CRAs)
 * Columns: Analytical accounts split into "Finalística" and "Apoio"
 * Format: [Org, Account1-Finalística, Account1-Apoio, Account2-Finalística, ...]
 */
export const exportForBI = (
    allData: { [orgId: string]: ExpenseData },
    organizations: { id: string, name: string }[]
) => {
    const wb = XLSX.utils.book_new();

    // Filter only analytical accounts
    const analyticalAccounts = accounts.filter(acc => acc.type === 'Analítica');

    // Generate Headers
    // [Organização, Account1 - Finalística, Account1 - Apoio, Account2 - Finalística, ...]
    const headers = ["Organização"];
    analyticalAccounts.forEach(acc => {
        headers.push(`${acc.name} - Finalística`);
        headers.push(`${acc.name} - Apoio`);
    });

    // Generate rows for each organization
    const rows = organizations.map(org => {
        const row = [org.name];
        const orgData = allData[org.id] || {};

        analyticalAccounts.forEach(acc => {
            const accData = orgData[acc.id] || { total: 0, finalistica: 0 };
            const finalistica = accData.finalistica;
            const apoio = accData.total - accData.finalistica;

            row.push(finalistica);
            row.push(apoio);
        });

        return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Set first column width
    ws['!cols'] = [{ wch: 20 }]; // Organization name column

    XLSX.utils.book_append_sheet(wb, ws, "BI_Export");
    XLSX.writeFile(wb, "CFA_BI_Export.xlsx");
};
