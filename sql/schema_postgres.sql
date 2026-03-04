-- PostgreSQL schema version adapted from the MySQL script
-- includes enums, BIGSERIAL, generated columns, views, functions and triggers

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- enums definitions
CREATE TYPE perfil_usuario AS ENUM ('admin','gerente','vendedor');
CREATE TYPE tipo_produto_enum AS ENUM ('venda','aluguel','ambos');
CREATE TYPE tipo_transacao AS ENUM ('entrada','saida');
CREATE TYPE tipo_pessoa_enum AS ENUM ('fisica','juridica');
CREATE TYPE forma_pagamento_enum AS ENUM ('dinheiro','pix','cartao','boleto');
CREATE TYPE status_venda_enum AS ENUM ('concluida','cancelada');
CREATE TYPE frete_tipo_enum AS ENUM ('fixo','calculado','retirada');
CREATE TYPE frete_status_enum AS ENUM ('pendente','enviado','entregue');
CREATE TYPE status_sincronizacao_enum AS ENUM ('sucesso','erro');
CREATE TYPE status_locacao_enum AS ENUM ('ativa','devolvida','atrasada','cancelada');
CREATE TYPE tipo_financeiro_enum AS ENUM ('debito','credito');
CREATE TYPE origem_financeiro_enum AS ENUM ('venda','locacao','ajuste');
CREATE TYPE status_financeiro_enum AS ENUM ('pendente','pago','cancelado');

CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil perfil_usuario DEFAULT 'vendedor', 
    ativo BOOLEAN DEFAULT TRUE,
    ultimo_login TIMESTAMP NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE produtos (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    codigo_barras VARCHAR(100) UNIQUE,
    preco_custo NUMERIC(12,2) DEFAULT 0,
    preco_venda NUMERIC(12,2) NOT NULL,
    estoque_atual INT DEFAULT 0,
    estoque_minimo INT DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    tipo tipo_produto_enum DEFAULT 'venda',
    valor_locacao NUMERIC(12,2),
    quantidade_total INT DEFAULT 0,
    quantidade_disponivel INT DEFAULT 0,
    criado_por BIGINT REFERENCES usuarios(id),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transacoes (
    id BIGSERIAL PRIMARY KEY,
    produto_id BIGINT REFERENCES produtos(id),
    usuario_id BIGINT REFERENCES usuarios(id),
    tipo tipo_transacao NOT NULL,
    quantidade INT NOT NULL,
    valor_unitario NUMERIC(12,2) NOT NULL,
    valor_total NUMERIC(14,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    observacao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clientes (
    id BIGSERIAL PRIMARY KEY,
    tipo_pessoa tipo_pessoa_enum NOT NULL,
    nome VARCHAR(150) NOT NULL,
    nome_fantasia VARCHAR(150),
    cpf VARCHAR(14) UNIQUE,
    cnpj VARCHAR(18) UNIQUE,
    rg VARCHAR(20),
    inscricao_estadual VARCHAR(30),
    email VARCHAR(150),
    telefone VARCHAR(20),
    celular VARCHAR(20),
    cep VARCHAR(10),
    logradouro VARCHAR(150),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    limite_credito NUMERIC(14,2) DEFAULT 0,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendas (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT REFERENCES usuarios(id),
    cliente_id BIGINT REFERENCES clientes(id),
    valor_total NUMERIC(14,2) NOT NULL,
    frete_valor NUMERIC(12,2) DEFAULT 0,
    total_final NUMERIC(14,2) GENERATED ALWAYS AS (valor_total + frete_valor) STORED,
    forma_pagamento forma_pagamento_enum NOT NULL,
    status status_venda_enum DEFAULT 'concluida',
    frete_tipo frete_tipo_enum DEFAULT 'fixo',
    frete_status frete_status_enum DEFAULT 'pendente',
    codigo_rastreio VARCHAR(150),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE venda_itens (
    id BIGSERIAL PRIMARY KEY,
    venda_id BIGINT REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id BIGINT REFERENCES produtos(id),
    quantidade INT NOT NULL,
    valor_unitario NUMERIC(12,2) NOT NULL,
    valor_total NUMERIC(14,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    frete_rateado NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE sincronizacoes (
    id BIGSERIAL PRIMARY KEY,
    dispositivo VARCHAR(150) NOT NULL,
    usuario_id BIGINT REFERENCES usuarios(id),
    ultima_sincronizacao TIMESTAMP,
    status status_sincronizacao_enum DEFAULT 'sucesso',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE logs_auditoria (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT REFERENCES usuarios(id),
    acao VARCHAR(150),
    tabela_afetada VARCHAR(100),
    registro_id BIGINT,
    ip VARCHAR(45),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE locacoes (
    id BIGSERIAL PRIMARY KEY,
    produto_id BIGINT REFERENCES produtos(id),
    usuario_id BIGINT REFERENCES usuarios(id),
    cliente_id BIGINT REFERENCES clientes(id),
    quantidade INT NOT NULL,
    valor_unitario NUMERIC(12,2) NOT NULL,
    valor_total NUMERIC(14,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    data_inicio TIMESTAMP NOT NULL,
    data_prevista_devolucao TIMESTAMP NOT NULL,
    data_devolucao TIMESTAMP,
    status status_locacao_enum DEFAULT 'ativa',
    observacao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE financeiro_clientes (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT REFERENCES clientes(id),
    tipo tipo_financeiro_enum NOT NULL,
    origem origem_financeiro_enum NOT NULL,
    referencia_id BIGINT,
    valor NUMERIC(14,2) NOT NULL,
    vencimento DATE,
    status status_financeiro_enum DEFAULT 'pendente',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE locacao_itens (
    id BIGSERIAL PRIMARY KEY,
    locacao_id BIGINT NOT NULL REFERENCES locacoes(id) ON DELETE CASCADE,
    produto_id BIGINT NOT NULL REFERENCES produtos(id),
    quantidade INT NOT NULL,
    valor_unitario NUMERIC(10,2) NOT NULL,
    valor_total NUMERIC(10,2) NOT NULL,
    data_prevista_devolucao DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'alugado'
);

CREATE TABLE locacao_prorrogacoes (
    id BIGSERIAL PRIMARY KEY,
    locacao_item_id BIGINT NOT NULL REFERENCES locacao_itens(id) ON DELETE CASCADE,
    data_anterior DATE NOT NULL,
    nova_data DATE NOT NULL,
    motivo TEXT,
    ajustado_por BIGINT REFERENCES usuarios(id),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== INDEXES ==========

CREATE INDEX idx_produto_nome ON produtos(nome);
CREATE INDEX idx_transacoes_produto ON transacoes(produto_id);
CREATE INDEX idx_venda_usuario ON vendas(usuario_id);
CREATE INDEX idx_codigo_barras ON produtos(codigo_barras);
CREATE INDEX idx_clientes_nome ON clientes(nome);
CREATE INDEX idx_clientes_email ON clientes(email);
CREATE INDEX idx_clientes_cidade ON clientes(cidade);

-- ========== VIEWS ==========

CREATE OR REPLACE VIEW vw_estoque_resumo AS
SELECT 
    p.id,
    p.nome,
    p.tipo,
    p.estoque_atual,
    p.quantidade_disponivel,
    p.estoque_minimo,
    CASE 
        WHEN p.estoque_atual = 0 THEN 'esgotado'
        WHEN p.estoque_atual <= p.estoque_minimo THEN 'baixo'
        ELSE 'normal'
    END AS status_estoque
FROM produtos p;

CREATE OR REPLACE VIEW vw_vendas_detalhadas AS
SELECT 
    v.id AS venda_id,
    v.criado_em,
    v.forma_pagamento,
    v.status,
    v.valor_total,
    COALESCE(v.frete_valor,0) AS frete_valor,
    (v.valor_total + COALESCE(v.frete_valor,0)) AS total_final,
    c.nome AS cliente_nome,
    c.cpf,
    u.nome AS vendedor
FROM vendas v
LEFT JOIN clientes c ON c.id = v.cliente_id
LEFT JOIN usuarios u ON u.id = v.usuario_id;

CREATE OR REPLACE VIEW vw_venda_itens_margem AS
SELECT 
    vi.id,
    vi.venda_id,
    p.nome AS produto,
    vi.quantidade,
    vi.valor_unitario,
    vi.valor_total,
    p.preco_custo,
    (vi.valor_unitario - p.preco_custo) AS lucro_unitario,
    (vi.valor_total - (p.preco_custo * vi.quantidade)) AS lucro_total
FROM venda_itens vi
JOIN produtos p ON p.id = vi.produto_id;

CREATE OR REPLACE VIEW vw_locacoes_ativas AS
SELECT 
    l.id,
    p.nome AS produto,
    c.nome AS cliente,
    l.quantidade,
    l.valor_total,
    l.data_inicio,
    l.data_prevista_devolucao,
    CASE
        WHEN l.data_prevista_devolucao < NOW()
        THEN (CURRENT_DATE - l.data_prevista_devolucao::date)
        ELSE 0
    END AS dias_atraso,
    l.status
FROM locacoes l
JOIN produtos p ON p.id = l.produto_id
JOIN clientes c ON c.id = l.cliente_id
WHERE l.status IN ('ativa','atrasada');

CREATE OR REPLACE VIEW vw_financeiro_clientes AS
SELECT 
    c.id AS cliente_id,
    c.nome,
    COALESCE(
        SUM(
            CASE 
                WHEN f.tipo = 'debito' AND f.status = 'pendente' 
                THEN f.valor 
                ELSE 0 
            END
        ),0
    ) AS total_em_aberto
FROM clientes c
LEFT JOIN financeiro_clientes f ON f.cliente_id = c.id
GROUP BY c.id, c.nome;

CREATE OR REPLACE VIEW vw_dashboard_resumo AS
SELECT
    (SELECT COUNT(*) FROM clientes WHERE ativo = true) AS total_clientes,
    (SELECT COUNT(*) FROM produtos WHERE ativo = true) AS total_produtos,
    COALESCE(
        (SELECT SUM(valor_total + COALESCE(frete_valor,0)) 
         FROM vendas 
         WHERE status = 'concluida'),
    0) AS faturamento_total,
    (SELECT COUNT(*) FROM locacoes WHERE status = 'ativa') AS locacoes_ativas;

CREATE OR REPLACE VIEW vw_produtos_mais_vendidos AS
SELECT 
    p.id,
    p.nome,
    SUM(vi.quantidade) AS total_vendido
FROM venda_itens vi
JOIN produtos p ON p.id = vi.produto_id
GROUP BY p.id, p.nome;

CREATE OR REPLACE VIEW vw_cliente_historico AS
SELECT 
    c.id AS cliente_id,
    c.nome,
    v.id AS venda_id,
    v.criado_em,
    (COALESCE(v.valor_total,0) + COALESCE(v.frete_valor,0)) AS total_venda
FROM clientes c
LEFT JOIN vendas v ON v.cliente_id = c.id;

-- ========== FUNCTIONS ==========

CREATE OR REPLACE FUNCTION atualizar_data_locacao()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE locacao_itens
    SET data_prevista_devolucao = NEW.nova_data
    WHERE id = NEW.locacao_item_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_before_insert_venda_itens()
RETURNS TRIGGER AS $$
DECLARE
    estoque INTEGER;
BEGIN
    SELECT estoque_atual INTO estoque
    FROM produtos
    WHERE id = NEW.produto_id;

    IF estoque < NEW.quantidade THEN
        RAISE EXCEPTION 'Estoque insuficiente para venda.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_after_insert_venda_itens()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE produtos
    SET estoque_atual = estoque_atual - NEW.quantidade
    WHERE id = NEW.produto_id;

    UPDATE vendas
    SET valor_total = (
        SELECT COALESCE(SUM(valor_total),0)
        FROM venda_itens
        WHERE venda_id = NEW.venda_id
    )
    WHERE id = NEW.venda_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_after_delete_venda_itens()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE produtos
    SET estoque_atual = estoque_atual + OLD.quantidade
    WHERE id = OLD.produto_id;

    UPDATE vendas
    SET valor_total = (
        SELECT COALESCE(SUM(valor_total),0)
        FROM venda_itens
        WHERE venda_id = OLD.venda_id
    )
    WHERE id = OLD.venda_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_before_update_produtos()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estoque_atual < 0 THEN
        RAISE EXCEPTION 'Estoque não pode ser negativo.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_before_delete_vendas()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'concluida' THEN
        RAISE EXCEPTION 'Venda concluída não pode ser excluída.';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_before_insert_vendas_cliente()
RETURNS TRIGGER AS $$
DECLARE
    cliente_ativo BOOLEAN;
BEGIN
    SELECT ativo INTO cliente_ativo
    FROM clientes
    WHERE id = NEW.cliente_id;

    IF cliente_ativo IS FALSE THEN
        RAISE EXCEPTION 'Cliente inativo.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_after_insert_vendas_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO logs_auditoria
    (usuario_id, acao, tabela_afetada, registro_id)
    VALUES
    (NEW.usuario_id, 'Nova venda criada', 'vendas', NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_before_insert_transacoes()
RETURNS TRIGGER AS $$
DECLARE
    estoque INTEGER;
BEGIN
    SELECT estoque_atual INTO estoque
    FROM produtos
    WHERE id = NEW.produto_id;

    IF NEW.tipo = 'saida' AND estoque < NEW.quantidade THEN
        RAISE EXCEPTION 'Estoque insuficiente.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_after_insert_transacoes()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo = 'entrada' THEN
        UPDATE produtos
        SET estoque_atual = estoque_atual + NEW.quantidade
        WHERE id = NEW.produto_id;
    ELSE
        UPDATE produtos
        SET estoque_atual = estoque_atual - NEW.quantidade
        WHERE id = NEW.produto_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========== TRIGGERS ==========

CREATE TRIGGER trg_after_insert_transacoes
AFTER INSERT ON transacoes
FOR EACH ROW
EXECUTE FUNCTION fn_after_insert_transacoes();

CREATE TRIGGER trg_before_insert_transacoes
BEFORE INSERT ON transacoes
FOR EACH ROW
EXECUTE FUNCTION fn_before_insert_transacoes();

CREATE TRIGGER trg_after_insert_vendas_log
AFTER INSERT ON vendas
FOR EACH ROW
EXECUTE FUNCTION fn_after_insert_vendas_log();

CREATE TRIGGER trg_before_insert_vendas_cliente
BEFORE INSERT ON vendas
FOR EACH ROW
EXECUTE FUNCTION fn_before_insert_vendas_cliente();

CREATE TRIGGER trg_before_delete_vendas
BEFORE DELETE ON vendas
FOR EACH ROW
EXECUTE FUNCTION fn_before_delete_vendas();

CREATE TRIGGER trg_before_update_produtos
BEFORE UPDATE ON produtos
FOR EACH ROW
EXECUTE FUNCTION fn_before_update_produtos();

CREATE TRIGGER trg_after_delete_venda_itens
AFTER DELETE ON venda_itens
FOR EACH ROW
EXECUTE FUNCTION fn_after_delete_venda_itens();

CREATE TRIGGER trg_after_insert_venda_itens
AFTER INSERT ON venda_itens
FOR EACH ROW
EXECUTE FUNCTION fn_after_insert_venda_itens();

CREATE TRIGGER trg_before_insert_venda_itens
BEFORE INSERT ON venda_itens
FOR EACH ROW
EXECUTE FUNCTION fn_before_insert_venda_itens();

CREATE TRIGGER trg_atualizar_data_locacao
AFTER INSERT ON locacao_prorrogacoes
FOR EACH ROW
EXECUTE FUNCTION atualizar_data_locacao();
