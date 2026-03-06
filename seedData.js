#!/usr/bin/env node

/**
 * Script para popular o banco com dados de teste
 * Uso: node seedData.js
 * 
 * Cria usuários, clientes, produtos e vendas de exemplo
 * Utiliza PostgreSQL conforme configurado
 */

const pool = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('🌱 Populating database with sample data...');

    // ========== USUARIOS ==========
    const usuarios = [
      { nome: 'Admin User', email: 'admin@sistema.com', perfil: 'admin' },
      { nome: 'João Gerente', email: 'joao@sistema.com', perfil: 'gerente' },
      { nome: 'Maria Vendedora', email: 'maria@sistema.com', perfil: 'vendedor' },
      { nome: 'Carlos Vendedor', email: 'carlos@sistema.com', perfil: 'vendedor' },
    ];

    const hashedPassword = await bcrypt.hash('123456', 8);
    const insertedUsuarios = [];

    for (const u of usuarios) {
      const result = await pool.query(
        'INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES ($1, $2, $3, $4) RETURNING id',
        [u.nome, u.email, hashedPassword, u.perfil]
      );
      insertedUsuarios.push({
        id: result.rows[0].id,
        ...u
      });
      console.log(`  ✓ Usuario: ${u.nome}`);
    }

    // ========== CLIENTES ==========
    const clientes = [
      {
        tipo_pessoa: 'fisica',
        nome: 'João Silva',
        email: 'joao.silva@email.com',
        telefone: '11988765432',
        cidade: 'São Paulo'
      },
      {
        tipo_pessoa: 'juridica',
        nome: 'Empresa XYZ Ltda',
        email: 'contato@empresaxyz.com',
        telefone: '1133334444',
        cidade: 'São Paulo'
      },
      {
        tipo_pessoa: 'fisica',
        nome: 'Maria Santos',
        email: 'maria.santos@email.com',
        telefone: '11987654321',
        cidade: 'São Bernardo'
      },
    ];

    const insertedClientes = [];

    for (const c of clientes) {
      const result = await pool.query(
        'INSERT INTO clientes (tipo_pessoa, nome, email, telefone, cidade) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [c.tipo_pessoa, c.nome, c.email, c.telefone, c.cidade]
      );
      insertedClientes.push({
        id: result.rows[0].id,
        ...c
      });
      console.log(`  ✓ Cliente: ${c.nome}`);
    }

    // ========== PRODUTOS ==========
    const produtos = [
      {
        nome: 'Notebook Dell',
        descricao: 'Notebook Dell Inspiron 15',
        codigo_barras: '7890123456789',
        preco_custo: 2500.00,
        preco_venda: 3500.00,
        quantidade: 10,
        tipo: 'venda'
      },
      {
        nome: 'Mouse Logitech',
        descricao: 'Mouse sem fio',
        codigo_barras: '1234567890123',
        preco_custo: 50.00,
        preco_venda: 89.90,
        quantidade: 50,
        tipo: 'venda'
      },
      {
        nome: 'Teclado Mecânico',
        descricao: 'Teclado mecânico RGB',
        codigo_barras: '9876543210987',
        preco_custo: 200.00,
        preco_venda: 399.90,
        quantidade: 15,
        tipo: 'venda'
      },
      {
        nome: 'Projetor Epson',
        descricao: 'Projetor para aluguel ou venda',
        codigo_barras: '5555555555555',
        preco_custo: 2000.00,
        preco_venda: 3000.00,
        quantidade: 5,
        tipo: 'ambos',
        valor_locacao: 200.00
      },
    ];

    const insertedProdutos = [];

    for (const p of produtos) {
      const result = await pool.query(
        `INSERT INTO produtos 
         (nome, descricao, codigo_barras, preco_custo, preco_venda, quantidade, tipo, valor_locacao, criado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [p.nome, p.descricao, p.codigo_barras, p.preco_custo, p.preco_venda, p.quantidade, p.tipo, p.valor_locacao || null, insertedUsuarios[0].id]
      );
      insertedProdutos.push({
        id: result.rows[0].id,
        ...p
      });
      console.log(`  ✓ Produto: ${p.nome}`);
    }

    // ========== VENDA ==========
    const vendaResult = await pool.query(
      `INSERT INTO vendas (usuario_id, cliente_id, valor_total, forma_pagamento, frete_valor)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [insertedUsuarios[2].id, insertedClientes[0].id, 489.90, 'pix', 10.00]
    );
    const vendaId = vendaResult.rows[0].id;

    // ========== VENDA_ITENS ==========
    await pool.query(
      `INSERT INTO venda_itens (venda_id, produto_id, quantidade, valor_unitario)
       VALUES ($1, $2, $3, $4)`,
      [vendaId, insertedProdutos[1].id, 3, 89.90]
    );

    await pool.query(
      `INSERT INTO venda_itens (venda_id, produto_id, quantidade, valor_unitario)
       VALUES ($1, $2, $3, $4)`,
      [vendaId, insertedProdutos[2].id, 1, 399.90]
    );

    console.log(`  ✓ Venda: ID ${vendaId} criada com 2 itens`);

    // ========== LOCACAO ==========
    const locacaoResult = await pool.query(
      `INSERT INTO locacoes (cliente_id, produto_id, quantidade, valor_total, data_inicio, quantidade_dias, forma_pagamento)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [insertedClientes[1].id, insertedProdutos[3].id, 1, 6000.00, '2026-03-06', 30, 'pix']
    );
    const locacaoId = locacaoResult.rows[0].id;

    await pool.query(
      `INSERT INTO locacao_itens (locacao_id, produto_id, quantidade, valor_diario)
       VALUES ($1, $2, $3, $4)`,
      [locacaoId, insertedProdutos[3].id, 1, 200.00]
    );

    console.log(`  ✓ Locação: ID ${locacaoId} criada`);

    console.log('\n✅ Database populated successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - ${insertedUsuarios.length} usuários criados`);
    console.log(`  - ${insertedClientes.length} clientes criados`);
    console.log(`  - ${insertedProdutos.length} produtos criados`);
    console.log(`  - 1 venda criada`);
    console.log(`  - 1 locação criada`);
    console.log('\n💡 Login de teste:');
    console.log(`  Email: admin@sistema.com`);
    console.log(`  Senha: 123456`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
