
CREATE TABLE usuarios (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil ENUM('admin','gerente','vendedor') DEFAULT 'vendedor',
    ativo BOOLEAN DEFAULT TRUE,
    ultimo_login DATETIME NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE produtos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT NULL,
    codigo_barras VARCHAR(100) UNIQUE,
    preco_custo DECIMAL(12,2) NOT NULL DEFAULT 0,
    preco_venda DECIMAL(12,2) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    criado_por BIGINT UNSIGNED,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (criado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE transacoes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    produto_id BIGINT UNSIGNED NOT NULL,
    usuario_id BIGINT UNSIGNED NOT NULL,
    tipo ENUM('entrada','saida') NOT NULL,
    quantidade INT NOT NULL,
    valor_unitario DECIMAL(12,2) NOT NULL,
    valor_total DECIMAL(14,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    observacao TEXT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produto_id) REFERENCES produtos(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vendas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT UNSIGNED NOT NULL,
    valor_total DECIMAL(14,2) NOT NULL,
    forma_pagamento ENUM('dinheiro','pix','cartao','boleto') NOT NULL,
    status ENUM('concluida','cancelada') DEFAULT 'concluida',
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE venda_itens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    venda_id BIGINT UNSIGNED NOT NULL,
    produto_id BIGINT UNSIGNED NOT NULL,
    quantidade INT NOT NULL,
    valor_unitario DECIMAL(12,2) NOT NULL,
    valor_total DECIMAL(14,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sincronizacoes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dispositivo VARCHAR(150) NOT NULL,
    usuario_id BIGINT UNSIGNED,
    ultima_sincronizacao DATETIME,
    status ENUM('sucesso','erro') DEFAULT 'sucesso',
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE logs_auditoria (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT UNSIGNED,
    acao VARCHAR(150),
    tabela_afetada VARCHAR(100),
    registro_id BIGINT,
    ip VARCHAR(45),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE locacoes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    produto_id BIGINT UNSIGNED NOT NULL,
    usuario_id BIGINT UNSIGNED NOT NULL,
    quantidade INT NOT NULL,
    valor_unitario DECIMAL(12,2) NOT NULL,
    valor_total DECIMAL(14,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    data_inicio DATETIME NOT NULL,
    data_prevista_devolucao DATETIME NOT NULL,
    data_devolucao DATETIME NULL,
    status ENUM('ativa','devolvida','atrasada','cancelada') DEFAULT 'ativa',
    observacao TEXT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produto_id) REFERENCES produtos(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE clientes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- Dados principais
    tipo_pessoa ENUM('fisica','juridica') NOT NULL,
    nome VARCHAR(150) NOT NULL,

    -- Documentos
    cpf VARCHAR(14) NULL,
    rg VARCHAR(20) NULL,

    -- Contato
    email VARCHAR(150) NULL,
    telefone VARCHAR(20) NULL,
    celular VARCHAR(20) NULL,

    -- Endereço
    cep VARCHAR(10) NULL,
    logradouro VARCHAR(150) NULL,
    numero VARCHAR(20) NULL,
    complemento VARCHAR(100) NULL,
    bairro VARCHAR(100) NULL,
    cidade VARCHAR(100) NULL,
    estado VARCHAR(2) NULL,

    -- Controle
    limite_credito DECIMAL(14,2) DEFAULT 0,
    observacoes TEXT NULL,
    ativo BOOLEAN DEFAULT TRUE,

    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Restrições
    UNIQUE KEY unique_cpf (cpf)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE financeiro_clientes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id BIGINT UNSIGNED NOT NULL,
    tipo ENUM('debito','credito') NOT NULL,
    origem ENUM('venda','locacao','ajuste') NOT NULL,
    referencia_id BIGINT UNSIGNED,
    valor DECIMAL(14,2) NOT NULL,
    vencimento DATE NULL,
    status ENUM('pendente','pago','cancelado') DEFAULT 'pendente',
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE produtos
ADD COLUMN tipo ENUM('venda','aluguel','ambos') DEFAULT 'venda',
ADD COLUMN valor_locacao DECIMAL(12,2) NULL,
ADD COLUMN quantidade_total INT DEFAULT 0,
ADD COLUMN quantidade_disponivel INT DEFAULT 0;

ALTER TABLE locacoes
ADD COLUMN cliente_id BIGINT UNSIGNED AFTER usuario_id,
ADD CONSTRAINT fk_locacoes_cliente
FOREIGN KEY (cliente_id) REFERENCES clientes(id);

ALTER TABLE vendas
ADD COLUMN frete_valor DECIMAL(12,2) DEFAULT 0,
ADD COLUMN frete_tipo ENUM('fixo','calculado','retirada') DEFAULT 'fixo',
ADD COLUMN frete_status ENUM('pendente','enviado','entregue') DEFAULT 'pendente',
ADD COLUMN codigo_rastreio VARCHAR(150) NULL;

ALTER TABLE venda_itens
ADD COLUMN frete_rateado DECIMAL(12,2) DEFAULT 0;

ALTER TABLE vendas
ADD COLUMN total_final DECIMAL(14,2) 
GENERATED ALWAYS AS (valor_total + frete_valor) STORED;

ALTER TABLE vendas
ADD COLUMN cliente_id BIGINT UNSIGNED AFTER usuario_id,
ADD CONSTRAINT fk_vendas_cliente
FOREIGN KEY (cliente_id) REFERENCES clientes(id);

CREATE INDEX idx_produto_nome ON produtos(nome);
CREATE INDEX idx_transacoes_produto ON transacoes(produto_id);
CREATE INDEX idx_venda_usuario ON vendas(usuario_id);
CREATE INDEX idx_codigo_barras ON produtos(codigo_barras);

CREATE INDEX idx_clientes_nome ON clientes(nome);
CREATE INDEX idx_clientes_email ON clientes(email);
CREATE INDEX idx_clientes_cidade ON clientes(cidade);

