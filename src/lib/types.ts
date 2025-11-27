// Shared type definitions for the application

export interface Account {
    id: string;
    code?: string;
    group: string;
    subgroup: string;
    type: string;
    name: string;
}

export type AccountType = 'Analítica' | 'Sintética' | 'ANALYTICAL' | 'SYNTHETIC';
