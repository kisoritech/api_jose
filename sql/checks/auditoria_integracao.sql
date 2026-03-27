SELECT
  (SELECT COUNT(*)
   FROM vendas v
   LEFT JOIN venda_itens vi ON vi.venda_id = v.id
   WHERE vi.id IS NULL) AS vendas_sem_itens,

  (SELECT COUNT(*)
   FROM vendas v
   LEFT JOIN financeiro_clientes f
     ON f.origem = 'venda'
    AND f.referencia_id = v.id
   WHERE f.id IS NULL) AS vendas_sem_financeiro,

  (SELECT COUNT(*)
   FROM vendas v
   LEFT JOIN transacoes t
     ON t.origem = 'venda'
    AND t.referencia_id = v.id
   WHERE t.id IS NULL) AS vendas_sem_transacao,

  (SELECT COUNT(*)
   FROM locacoes l
   LEFT JOIN locacao_itens li ON li.locacao_id = l.id
   WHERE li.id IS NULL) AS locacoes_sem_itens,

  (SELECT COUNT(*)
   FROM locacoes l
   LEFT JOIN financeiro_clientes f
     ON f.origem = 'locacao'
    AND f.referencia_id = l.id
   WHERE f.id IS NULL) AS locacoes_sem_financeiro,

  (SELECT COUNT(*)
   FROM locacoes l
   LEFT JOIN transacoes t
     ON t.origem = 'locacao'
    AND t.referencia_id = l.id
   WHERE t.id IS NULL) AS locacoes_sem_transacao,

  (SELECT COUNT(*)
   FROM financeiro_clientes f
   LEFT JOIN clientes c ON c.id = f.cliente_id
   WHERE c.id IS NULL) AS financeiro_sem_cliente,

  (SELECT COUNT(*)
   FROM transacoes t
   LEFT JOIN produtos p ON p.id = t.produto_id
   WHERE p.id IS NULL) AS transacoes_sem_produto,

  (SELECT COUNT(*)
   FROM produtos
   WHERE quantidade < 0) AS produtos_estoque_negativo;


SELECT
  'venda' AS origem,
  v.id AS referencia_id,
  v.cliente_id,
  v.total_final AS valor_referencia,
  f.valor AS valor_financeiro
FROM vendas v
LEFT JOIN financeiro_clientes f
  ON f.origem = 'venda'
 AND f.referencia_id = v.id
WHERE f.id IS NOT NULL
  AND COALESCE(f.valor, 0) <> COALESCE(v.total_final, 0)

UNION ALL

SELECT
  'locacao' AS origem,
  l.id AS referencia_id,
  l.cliente_id,
  l.valor_total AS valor_referencia,
  f.valor AS valor_financeiro
FROM locacoes l
LEFT JOIN financeiro_clientes f
  ON f.origem = 'locacao'
 AND f.referencia_id = l.id
WHERE f.id IS NOT NULL
  AND COALESCE(f.valor, 0) <> COALESCE(l.valor_total, 0)
ORDER BY origem, referencia_id;
