const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(__dirname,));



// Conexão com o PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'dbcondominio',
    password: '@dmin', 
    port: 5432,
});

/*
// SALVA MORADOR
app.post('/moradores', async (req, res) => {
    const { bloco, numero_apartamento, nome, cpf, telefone, email, proprietario, ativo } = req.body;
    
    try {
        const query = `
            INSERT INTO moradores (bloco, numero_apartamento, nome, cpf,  telefone, email, proprietario, ativo) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        const values = [bloco, numero_apartamento, nome, cpf,  telefone, email, proprietario, ativo];
        
        await pool.query(query, values);
        res.status(201).json({ mensagem: 'Morador cadastrado com sucesso!' });
    } catch (err) {
        console.error('Erro ao inserir no banco:', err);
        res.status(500).json({ erro: 'Erro ao salvar no banco de dados.' });
    }
});
*/ 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// testar MESMO CPF EM APs DIFERENTES
app.post('/moradores', async (req, res) => {
    const { bloco, numero_apartamento, nome, cpf, telefone, email, proprietario, ativo } = req.body;
    
    try {
        const existe = await pool.query(
            'SELECT * FROM moradores WHERE cpf = $1 AND bloco = $2 AND numero_apartamento = $3',
            [cpf, bloco, numero_apartamento]
        );

        if (existe.rows.length > 0) {
            // checa se cara existe
            return res.status(400).json({ erro: 'Este CPF já está cadastrado para este apartamento neste bloco.' });
        }

        const query = `
            INSERT INTO moradores (bloco, numero_apartamento, nome, cpf, telefone, email, proprietario, ativo) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        const values = [bloco, numero_apartamento, nome, cpf, telefone, email, proprietario, ativo];
        
        await pool.query(query, values);
        res.status(201).json({ mensagem: 'Morador cadastrado com sucesso!' });
        
    } catch (err) {
        console.error('Erro ao inserir no banco:', err);
        res.status(500).json({ erro: 'Erro ao salvar no banco de dados.' });
    }
});


// alteracao morad
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



// excluir morad
app.delete('/moradores/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM moradores WHERE id = $1', [id]);
        res.json({ mensagem: 'Morador removido com sucesso!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao excluir morador.' });
    }
});


// grava lista
app.get('/moradores', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM moradores ORDER BY bloco ASC, numero_apartamento ASC');
        console.log("informação lida no banco com sucesso:", resultado.rows); 
        res.json(resultado.rows);
    } catch (err) {
        console.error('Erro no SELECT:', err);
        res.status(500).json({ erro: 'Erro ao buscar dados.' });
    }
});

// Testar conexão  verifica servidor 
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Erro ao conectar ao banco:', err.stack);
    }
    console.log('Conexão com PostgreSQL (dbcondominio) estabelecida com sucesso!');
    release();
});

app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});


