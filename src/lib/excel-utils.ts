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
        name?: string;
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
        let rowData = data[account.id];

        if (!rowData) {
            // Explicitly check for known old IDs first
            if (account.id === '1.12.1.5' && data['1.11.1.5']) {
                rowData = data['1.11.1.5'];
            } else if (account.name) {
                const targetName = account.name.trim().toLowerCase();
                const matchedKey = Object.keys(data).find(key => {
                    const dbName = data[key].name;
                    if (!dbName) return false;
                    
                    const dbNameLower = dbName.trim().toLowerCase();
                    if (dbNameLower === targetName) return true;
                    
                    if ((targetName.includes('cota parte') || targetName.includes('cota-parte')) && 
                        (dbNameLower.includes('cota parte') || dbNameLower.includes('cota-parte'))) {
                        return true;
                    }
                    
                    return false;
                });
                if (matchedKey) {
                    rowData = data[matchedKey];
                }
            }
        }

        if (!rowData) {
            rowData = { total: 0, finalistica: 0 };
        }

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
                    let id = row[0]?.toString().trim();
                    const name = row[1]?.toString().trim().toLowerCase();
                    const total = parseFloat(row[2]) || 0;
                    const finalistica = parseFloat(row[3]) || 0;

                    // Map old ID for Cota Parte
                    if (id === '1.11.1.5') {
                        id = '1.12.1.5';
                    }

                    // Try to resolve ID if missing or invalid, using name map
                    if (!id || !accountMap.has(id)) {
                        if (name && nameMap.has(name)) {
                            id = nameMap.get(name);
                        } else if (name && (name.includes('cota parte') || name.includes('cota-parte'))) {
                            id = '1.12.1.5'; // Special fuzzy fallback for Cota Parte
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
        const row: any[] = [org.name];
        const orgData = allData[org.id] || {};

        analyticalAccounts.forEach(acc => {
            let accData = orgData[acc.id];

            // Fallback: If not found by ID, try finding by Name.
            // This happens if an account ID was changed in all-accounts.json
            // but the database still holds data under the old ID (like Cota Parte 1.11.1.5 -> 1.12.1.5)
            if (!accData) {
                // Explicitly check for known old IDs first
                if (acc.id === '1.12.1.5' && orgData['1.11.1.5']) {
                    accData = orgData['1.11.1.5'];
                } else if (acc.name) {
                    const targetName = acc.name.trim().toLowerCase();
                    const matchedKey = Object.keys(orgData).find(key => {
                        const dbName = orgData[key].name;
                        if (!dbName) return false;
                        
                        const dbNameLower = dbName.trim().toLowerCase();
                        if (dbNameLower === targetName) return true;
                        
                        // Special case for Cota Parte which might have variations like "cota-parte" or "cota parte ao cfa"
                        if ((targetName.includes('cota parte') || targetName.includes('cota-parte')) && 
                            (dbNameLower.includes('cota parte') || dbNameLower.includes('cota-parte'))) {
                            return true;
                        }
                        
                        return false;
                    });
                    
                    if (matchedKey) {
                        accData = orgData[matchedKey];
                    }
                }
            }

            // Default to zero if still not found
            if (!accData) {
                accData = { total: 0, finalistica: 0 };
            }

            const finalistica = accData.finalistica || 0;
            const apoio = (accData.total || 0) - finalistica;

            row.push(accData.total || 0);
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
        const row: any[] = [org.name];
        const orgData = allData[org.id] || {};

        analytical.forEach(rev => {
            const val = orgData[rev.id]?.value || 0;
            row.push(val); // Export as raw number for BI
        });
        return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 25 }]; // Org Col width

    XLSX.utils.book_append_sheet(wb, ws, "BI_Receitas");
    XLSX.writeFile(wb, "CFA_BI_Receitas.xlsx");
};
