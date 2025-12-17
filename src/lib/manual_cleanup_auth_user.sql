-- Solução Manual: Execute no SQL Editor do Supabase
-- Para resolver o erro "A user with this email address has already been registered"

-- 1. Encontrar o ID do usuário Auth pelo email
-- Substitua 'dododeby2@gmail.com' pelo email problemático
-- Vá em: Authentication > Users e copie o UUID do usuário

-- 2. Deletar da tabela users primeiro (USA O UUID COPIADO)
DELETE FROM users WHERE id = 'UUID_AQUI';

-- 3. Depois vá em Authentication > Users e delete manualmente o usuário

-- OU execute este comando se tiver acesso ao service role:
-- (você pode precisar fazer via Dashboard > Authentication > Users)

-- Depois disso, tente aprovar novamente
