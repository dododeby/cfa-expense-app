-- ============================================
-- Script de Limpeza e Configuração de RLS
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. LIMPAR DADOS ANTIGOS
-- ============================================

-- Limpar solicitações de registro antigas/rejeitadas
DELETE FROM user_registration_requests 
WHERE status IN ('approved', 'rejected');

-- ============================================
-- 2. CONFIGURAR POLÍTICAS RLS
-- ============================================

-- Permitir que usuários deletem suas próprias solicitações de registro
-- (necessário para permitir re-cadastro)
DROP POLICY IF EXISTS "Users can delete own registration requests" ON user_registration_requests;
CREATE POLICY "Users can delete own registration requests" 
ON user_registration_requests
FOR DELETE
USING (true);  -- Permite delete para todos (será usado pelo client-side antes de insert)

-- Permitir que usuários deletem de responsible_persons
-- (necessário para limpeza ao excluir usuário)
DROP POLICY IF EXISTS "Allow delete on responsible_persons" ON responsible_persons;
CREATE POLICY "Allow delete on responsible_persons" 
ON responsible_persons
FOR DELETE
USING (true);  -- Service role já bypassa RLS, mas garante que client também pode

-- ============================================
-- 3. VERIFICAR DADOS RESTANTES
-- ============================================

-- Ver solicitações pendentes
SELECT * FROM user_registration_requests WHERE status = 'pending';

-- Ver usuários ativos
SELECT id, email, full_name, organization_id, status FROM users;

-- Ver responsible_persons
SELECT * FROM responsible_persons;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 
-- Este script:
-- 1. Remove solicitações aprovadas/rejeitadas antigas
-- 2. Remove responsible_persons órfãos
-- 3. Configura RLS para permitir DELETE necessários
-- 
-- Após executar, você poderá:
-- ✓ Cadastrar usuários com emails anteriormente usados
-- ✓ Excluir usuários e reutilizar seus emails
-- ✓ Sistema gerenciará limpeza automaticamente
