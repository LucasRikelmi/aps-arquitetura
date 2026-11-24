-- Integracao M3: manter usuario.login como email; cadastro_pessoa.nome ja existe (010).
-- Nao adicionar usuario.email/nome duplicados; nao alterar papeis internamente
-- enquanto as politicas existentes usam os nomes legados no PostgreSQL.
-- Esta migracao valida dependencias, sem alterar dados em producao.
DO $$ BEGIN
  IF to_regclass('public.usuario') IS NULL OR to_regclass('public.cadastro_pessoa') IS NULL
     OR to_regclass('public.atribuicao_perfil') IS NULL THEN
    RAISE EXCEPTION 'Executar schema.sql, 002_sessions.sql e 010_cadastro_organizacional.sql antes de 012';
  END IF;
END $$;
