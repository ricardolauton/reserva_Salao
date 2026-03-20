const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Conexão com o PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'dbcondominio',
    password: '@dmin',
    port: 5432,
});

// Testar conexão inicial
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Erro ao conectar ao banco:', err.stack);
    }
    console.log('Conexão com PostgreSQL (dbcondominio) estabelecida com sucesso!');
    release();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// ROTAS DE MORADORES (Sua implementação)
// ==========================================

app.post('/moradores', async (req, res) => {
    const { bloco, numero_apartamento, nome, cpf, telefone, email, proprietario, ativo } = req.body;
    try {
        const existe = await pool.query(
            'SELECT * FROM moradores WHERE cpf = $1 AND bloco = $2 AND numero_apartamento = $3',
            [cpf, bloco, numero_apartamento]
        );
        if (existe.rows.length > 0) {
            return res.status(400).json({ erro: 'Este CPF já está cadastrado para este apartamento neste bloco.' });
        }
        const query = `INSERT INTO moradores (bloco, numero_apartamento, nome, cpf, telefone, email, proprietario, ativo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
        await pool.query(query, [bloco, numero_apartamento, nome, cpf, telefone, email, proprietario, ativo]);
        res.status(201).json({ mensagem: 'Morador cadastrado com sucesso!' });
    } catch (err) {
        console.error('Erro ao inserir morador:', err);
        res.status(500).json({ erro: 'Erro ao salvar no banco de dados.' });
    }
});

app.get('/moradores', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM moradores ORDER BY bloco ASC, numero_apartamento ASC');
        res.json(resultado.rows);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao buscar dados.' });
    }
});

app.put('/moradores/:id', async (req, res) => {
    const { id } = req.params;
    const { bloco, numero_apartamento, nome, cpf, telefone, email, proprietario, ativo } = req.body;
    try {
        await pool.query(
            `UPDATE moradores SET bloco=$1, numero_apartamento=$2, nome=$3, cpf=$4, telefone=$5, email=$6, proprietario=$7, ativo=$8 WHERE id=$9`,
            [bloco, numero_apartamento, nome, cpf, telefone, email, proprietario, ativo, id]
        );
        res.json({ mensagem: 'Atualizado com sucesso' });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao atualizar' });
    }
});

app.delete('/moradores/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM moradores WHERE id = $1', [id]);
        res.json({ mensagem: 'Morador removido com sucesso!' });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao excluir morador.' });
    }
});

// ==========================================
// ROTAS DE SALAS E BLOQUEIOS (Nova Implementação)
// ==========================================

// 1. Cadastrar Sala (Com transação para o histórico)
app.post('/salas', async (req, res) => {
    let { cod_salao, nome_salao, cap_salao, bloq_salao, mot_bloq, resp_bloq } = req.body;

   cod_salao = cod_salao.trim().toUpperCase();

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const resSala = await client.query(
            `INSERT INTO salas (cod_salao, nome_salao, cap_salao, bloq_salao) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [cod_salao, nome_salao, cap_salao, bloq_salao]
        );

        const idSala = resSala.rows[0].id;

        if (bloq_salao) {
            await client.query(
                `INSERT INTO bloqueio_salas (id_sala, motivo_bloqueio, responsavel_bloqueio) 
                 VALUES ($1, $2, $3)`,
                [idSala, mot_bloq, resp_bloq]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ mensagem: 'Sala cadastrada com sucesso!' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);

        // Código 23505 é o erro de 'Unique Violation' no Postgres
        if (err.code === '23505') {
            return res.status(400).json({ erro: "Este Código de Salão já está em uso. Escolha um código único." });
        }

        res.status(500).json({ erro: "Erro ao processar a requisição." });

    } finally {
        client.release();
    }
});

// 2. Listar Salas (Trazendo o status atual)
app.get('/salas', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM salas ORDER BY nome_salao ASC');
        res.json(resultado.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao listar salas.' });
    }
});

app.get('/salas/verificar/:codigo', async (req, res) => {
    const { codigo } = req.params;
    try {
        const resultado = await pool.query('SELECT id FROM salas WHERE cod_salao = $1', [codigo.toUpperCase()]);
        res.json({ existe: resultado.rows.length > 0 });
    } catch (err) {
        res.status(500).json({ erro: "Erro ao verificar código." });
    }
});

// 3. Desbloquear Sala (Finaliza registro no histórico e atualiza flag na sala)
app.put('/salas/desbloquear/:id', async (req, res) => {
    const { id } = req.params;
    const { resp_liberacao, data_liberacao } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Atualiza a tabela de histórico (bloqueio_salas)
        await client.query(
            `UPDATE bloqueio_salas 
             SET data_liberacao = $1, responsavel_liberacao = $2 
             WHERE id_sala = $3 AND data_liberacao IS NULL`,
            [data_liberacao, resp_liberacao, id]
        );

        // Atualiza a flag na tabela principal (salas)
        await client.query('UPDATE salas SET bloq_salao = FALSE WHERE id = $1', [id]);

        await client.query('COMMIT');
        res.json({ mensagem: 'Sala desbloqueada com sucesso!' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ erro: 'Erro ao processar desbloqueio.' });
    } finally {
        client.release();
    }
});

// 4. Excluir Sala
app.delete('/salas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM salas WHERE id = $1', [id]);
        res.json({ mensagem: 'Sala excluída com sucesso!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao excluir sala. Verifique se existem bloqueios vinculados.' });
    }
});

// ATUALIZAR/EDITAR SALA (Permite bloqueio de salas já existentes)
app.put('/salas/:id', async (req, res) => {

    let { cod_salao, nome_salao, cap_salao, bloq_salao, mot_bloq, resp_bloq } = req.body;
    const { id } = req.params;

    cod_salao = cod_salao.trim().toUpperCase();

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verificar o status atual da sala antes de atualizar
        const salaAtual = await client.query('SELECT bloq_salao FROM salas WHERE id = $1', [id]);
        const estavaBloqueada = salaAtual.rows[0].bloq_salao;

        // 2. Atualizar os dados básicos da sala
        await client.query(
            `UPDATE salas SET cod_salao=$1, nome_salao=$2, cap_salao=$3, bloq_salao=$4 WHERE id=$5`,
            [cod_salao, nome_salao, cap_salao, bloq_salao, id]
        );

        // 3. Lógica de Histórico: Se NÃO estava bloqueada e AGORA está, cria o registro
        if (!estavaBloqueada && bloq_salao === true) {
            await client.query(
                `INSERT INTO bloqueio_salas (id_sala, motivo_bloqueio, responsavel_bloqueio) 
                 VALUES ($1, $2, $3)`,
                [id, mot_bloq, resp_bloq]
            );
        }

        await client.query('COMMIT');
        res.json({ mensagem: 'Sala atualizada com sucesso!' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar sala.' });
    } finally {
        client.release();
    }
});

// Iniciar servidor
app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});


