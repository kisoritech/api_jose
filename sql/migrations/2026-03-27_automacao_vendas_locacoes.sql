ALTER TABLE public.transacoes
  ADD COLUMN IF NOT EXISTS cliente_id BIGINT REFERENCES public.clientes(id),
  ADD COLUMN IF NOT EXISTS origem public.origem_financeiro_enum,
  ADD COLUMN IF NOT EXISTS referencia_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_transacoes_cliente_id ON public.transacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_origem_ref ON public.transacoes(origem, referencia_id);

CREATE OR REPLACE FUNCTION public.fn_before_insert_transacoes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    estoque INTEGER;
BEGIN
    IF NEW.origem = 'venda' THEN
        RETURN NEW;
    END IF;

    SELECT quantidade INTO estoque
    FROM produtos
    WHERE id = NEW.produto_id;

    IF NEW.tipo = 'saida' AND estoque < NEW.quantidade THEN
        RAISE EXCEPTION 'Estoque insuficiente.';
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_after_insert_transacoes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.origem = 'venda' THEN
        RETURN NEW;
    END IF;

    IF NEW.tipo = 'entrada' THEN
        UPDATE produtos
        SET quantidade = quantidade + NEW.quantidade
        WHERE id = NEW.produto_id;
    ELSE
        UPDATE produtos
        SET quantidade = quantidade - NEW.quantidade
        WHERE id = NEW.produto_id;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_financeiro_venda()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM financeiro_clientes
        WHERE cliente_id = NEW.cliente_id
          AND origem = 'venda'
          AND referencia_id = NEW.id
    ) THEN
        INSERT INTO financeiro_clientes (
            cliente_id,
            tipo,
            origem,
            referencia_id,
            valor,
            status
        )
        VALUES (
            NEW.cliente_id,
            'debito',
            'venda',
            NEW.id,
            NEW.total_final,
            'pendente'
        );
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_financeiro_locacao()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM financeiro_clientes
        WHERE cliente_id = NEW.cliente_id
          AND origem = 'locacao'
          AND referencia_id = NEW.id
    ) THEN
        INSERT INTO financeiro_clientes (
            cliente_id,
            tipo,
            origem,
            referencia_id,
            valor,
            status
        )
        VALUES (
            NEW.cliente_id,
            'debito',
            'locacao',
            NEW.id,
            NEW.valor_total,
            'pendente'
        );
    END IF;

    RETURN NEW;
END;
$function$;
