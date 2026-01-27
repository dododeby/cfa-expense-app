
-- Adicionar colunas de responsáveis caso não existam (se a tabela foi criada com script antigo)
ALTER TABLE declarations ADD COLUMN IF NOT EXISTS responsible_unit_name TEXT;
ALTER TABLE declarations ADD COLUMN IF NOT EXISTS responsible_unit_cra TEXT;
ALTER TABLE declarations ADD COLUMN IF NOT EXISTS responsible_data_name TEXT;
ALTER TABLE declarations ADD COLUMN IF NOT EXISTS responsible_data_role TEXT;
ALTER TABLE declarations ADD COLUMN IF NOT EXISTS responsible_data_doc_type TEXT;
ALTER TABLE declarations ADD COLUMN IF NOT EXISTS responsible_data_doc_number TEXT;
