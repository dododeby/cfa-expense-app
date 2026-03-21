const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lmmmjtkylmecluvvgxed.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtbW1qdGt5bG1lY2x1dnZneGVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE2ODcyMywiZXhwIjoyMDc5NzQ0NzIzfQ.tYo3xLotrFvQMQQkKXJ3W-FXegMceyPv69M0L7GEUYI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- VERIFICANDO POLÍTICAS DE RLS (EXPENSES) ---');
    
    // Consultar as políticas de RLS registradas no Postgres
    const { data: policies, error } = await supabase.rpc('get_policies', { table_name_input: 'expenses' });

    if (error) {
        // Se RPC não existir, tentar via query direta na pg_policies
        console.log('RPC get_policies não existe. Tentando query direta...');
        const { data: rawPolicies, error: err2 } = await supabase
            .from('pg_policies')
            .select('*')
            .eq('tablename', 'expenses');
            
        if (err2) {
            console.log('Não foi possível ler pg_policies via client. Vamos tentar listar os dados de um CRA logado como CFA.');
        } else {
            console.log(rawPolicies);
        }
    } else {
        console.log(policies);
    }

    // TESTE DE ACESSO: Tentar ler como o usuário 'cfa' (simulando o que acontece no frontend)
    // Para isso, precisamos de um token de usuário CFA, ou apenas checar se a tabela tem RLS habilitado
    const { data: rlsCheck } = await supabase.rpc('check_rls_enabled', { table_name_input: 'expenses' });
    console.log('RLS Habilitado em expenses:', rlsCheck);
}

async function simulateCFA() {
   console.log('\n--- SIMULANDO CONSULTA DO USUÁRIO CFA (ANON KEY) ---');
   // O frontend usa a ANON KEY. Se o RLS estiver ativo e mal configurado, ele retornará vazio.
   const { data, count, error } = await supabase
       .from('expenses')
       .select('*', { count: 'exact', head: true })
       .eq('organization_id', 'cra-pe'); // Tentando ver o PE
   
   console.log(`Resultado para CRA-PE com ANON KEY: ${count} registros encontrados. Erro: ${error?.message || 'Nenhum'}`);
}

simulateCFA();
