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
 * Export to Excel - Simplified Format
 * Exports only: ID, Contas, Total, Atividade Finalística
 * Only includes Analytical accounts.
 */
export const exportToExcel = (data: ExpenseData, organizationName: string) => {
    const wb = XLSX.utils.book_new();

    // Create headers - Simplified
    const headers = [
        "Código", // ID
        "Conta",  // Name
        "Total",
        "Atividade Finalística"
    ];

    // Filter only Analytic accounts
    const analyticalAccounts = accounts.filter(acc => acc.type === 'Analítica');

    const rows = analyticalAccounts.map(account => {
        const rowData = data[account.id] || { total: 0, finalistica: 0 };

        return [
            account.id,
            account.name,
            rowData.total,
            rowData.finalistica
        ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Set column widths
    ws['!cols'] = [
        { wch: 15 }, // ID
        { wch: 60 }, // Conta
        { wch: 15 }, // Total
        { wch: 20 }  // Finalística
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Despesas");
    XLSX.writeFile(wb, `Despesas_${organizationName}.xlsx`);
};

/**
 * Import from Excel
 * Imports only: Total and Atividade Finalística
 * Uses ID (Código) to map accounts.
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

                // Map IDs to original accounts to verify they exist
                const accountMap = new Set(accounts.map(acc => acc.id));
                const nameMap = new Map(accounts.map(acc => [acc.name.trim().toLowerCase(), acc.id]));

                // Skip header row (index 0)
                jsonData.slice(1).forEach(row => {
                    // Expected Columns:
                    // 0: Código (ID)
                    // 1: Conta (Name)
                    // 2: Total
                    // 3: Atividade Finalística

                    let id = row[0]?.toString().trim();
                    const name = row[1]?.toString().trim().toLowerCase();
                    const total = parseFloat(row[2]) || 0;
                    const finalistica = parseFloat(row[3]) || 0;

                    // Try to resolve ID if missing or invalid, using name map
                    if (!id || !accountMap.has(id)) {
                        if (name && nameMap.has(name)) {
                            id = nameMap.get(name);
                        }
                    }

                    if (id && accountMap.has(id)) {
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
    // [Organização, Account1 - Total, Account1 - Finalística, Account1 - Apoio, ...]
    const headers = ["Organização"];
    analyticalAccounts.forEach(acc => {
        headers.push(`${acc.name} - Total`);
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

            row.push(accData.total.toString());
            row.push(finalistica.toString());
            row.push(apoio.toString());
        });

        return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Set first column width
    ws['!cols'] = [{ wch: 20 }]; // Organization name column

    XLSX.utils.book_append_sheet(wb, ws, "BI_Export");
    XLSX.writeFile(wb, "CFA_BI_Export.xlsx");
};

// --- REVENUE EXPORT/IMPORT ---

import allRevenuesData from './all-revenues.json';

interface RevenueAccount {
    id: string;
    name: string;
    type: string;
}

const revenues = allRevenuesData as RevenueAccount[];

/**
 * Export Revenues to Excel
 * Exports: Code, Description, Value
 */
export const exportRevenuesToExcel = (data: { [key: string]: { value: number } }, organizationName: string) => {
    const wb = XLSX.utils.book_new();
    const headers = ["Código", "Descrição", "Valor Arrecadado"];

    const analytical = revenues.filter(r => r.type === 'Analítica');

    const rows = analytical.map(rev => {
        const val = data[rev.id]?.value || 0;
        return [rev.id, rev.name, val];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 15 }, { wch: 60 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, ws, "Receitas");
    XLSX.writeFile(wb, `Receitas_${organizationName}.xlsx`);
};

/**
 * Import Revenues from Excel
 */
export const importRevenuesFromExcel = (file: File): Promise<{ [key: string]: { value: number } }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const wb = XLSX.read(data, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                const newData: { [key: string]: { value: number } } = {};
                const idMap = new Set(revenues.map(r => r.id));
                const nameMap = new Map(revenues.map(r => [r.name.trim().toLowerCase(), r.id]));

                jsonData.slice(1).forEach(row => {
                    // 0: Code, 1: Description, 2: Value
                    let id = row[0]?.toString().trim();
                    const name = row[1]?.toString().trim().toLowerCase();
                    const val = parseFloat(row[2]) || 0;

                    if (!id || !idMap.has(id)) {
                        if (name && nameMap.has(name)) {
                            id = nameMap.get(name);
                        }
                    }

                    if (id && idMap.has(id)) {
                        newData[id] = { value: val };
                    }
                });
                resolve(newData);
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsBinaryString(file);
    });
};

/**
 * Export Revenues for BI (Consolidated)
 * Transposed Table: Rows = Orgs, Cols = Revenue Accounts
 */
export const exportRevenuesForBI = (
    allData: { [orgId: string]: { [accId: string]: { value: number } } },
    organizations: { id: string, name: string }[]
) => {
    const wb = XLSX.utils.book_new();
    const analytical = revenues.filter(r => r.type === 'Analítica');

    const headers = ["Organização", ...analytical.map(r => r.name)];

    const rows = organizations.map(org => {
        const row = [org.name];
        const orgData = allData[org.id] || {};

        analytical.forEach(rev => {
            const val = orgData[rev.id]?.value || 0;
            row.push(val.toString()); // Export as string/number
        });
        return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 25 }]; // Org Col width

    XLSX.utils.book_append_sheet(wb, ws, "BI_Receitas");
    XLSX.writeFile(wb, "CFA_BI_Receitas.xlsx");
};
