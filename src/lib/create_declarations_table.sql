
-- Tabela de Declarações
CREATE TABLE IF NOT EXISTS declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL,
    organization_name TEXT NOT NULL,
    receipt_number TEXT NOT NULL,
    delivery_date TIMESTAMPTZ DEFAULT NOW(),
    is_rectification BOOLEAN DEFAULT FALSE,
    rectification_count INTEGER DEFAULT 0,
    total_revenue NUMERIC DEFAULT 0,
    total_expense NUMERIC DEFAULT 0,
    total_finalistica NUMERIC DEFAULT 0,
    total_apoio NUMERIC DEFAULT 0,
    
    -- Dados dos Responsáveis (Snapshot no momento da entrega)
    responsible_unit_name TEXT,
    responsible_unit_cra TEXT,
    responsible_data_name TEXT,
    responsible_data_role TEXT,
    responsible_data_doc_type TEXT,
    responsible_data_doc_number TEXT,
    
    snapshot JSONB, -- Backup completo de contas se necessário
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas de Segurança (Basic: Aberto para autenticados ler/escrever)
-- Em produção, restringir para organization_id
ALTER TABLE declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated" ON declarations
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Comentários
COMMENT ON TABLE declarations IS 'Armazena histórico de entregas e retificações de declarações anuais.';
