// Shared type definitions for the application

export interface Account {
    id: string;
    group: string;
    subgroup: string;
    type: string;
    name: string;
    code?: string;
}

export type AccountType = 'Analítica' | 'Sintética' | 'ANALYTICAL' | 'SYNTHETIC';
