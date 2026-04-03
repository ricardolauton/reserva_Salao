let salaParaDesbloquearId = null;
let salaEmEdicaoId = null;

function toggleBloqueio(valor) {
    const secao = document.getElementById('secao-bloqueio');
    const mot = document.getElementById('mot_bloq');
    const resp = document.getElementById('resp_bloq');

    if (valor === "true") {
        secao.classList.remove('hidden');
        mot.required = true;
        resp.required = true;
    } else {
        secao.classList.add('hidden');
        mot.required = false;
        resp.required = false;
        mot.value = "";
        resp.value = "";
    }
}

function cancelarOperacao() {
    if (confirm("Deseja descartar as alterações atuais?")) {
        salaEmEdicaoId = null; // Limpa o ID de edição
        const form = document.getElementById('formSalao');
        form.reset();
        toggleBloqueio("false");
        
        // Restaura o botão original
        const btn = document.getElementById('btnSalvar');
        btn.textContent = "Salvar Espaço";
        btn.style.background = "#333";
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// LISTAGEM 
async function listarSalas() {
    const tabela = document.getElementById('corpoTabelaSalas');
    try {
        const res = await fetch('http://localhost:3000/salas');
        const salas = await res.json();
        tabela.innerHTML = '';

        salas.forEach(s => {
            const status = s.bloq_salao 
                ? `<span style="color:#e74c3c; font-weight:bold">🚫 Bloqueado</span>` 
                : `<span style="color:#27ae60; font-weight:bold">✅ Liberado</span>`;

            let botoesAcao = "";

            if (s.bloq_salao) {
                // REGRA: Se bloqueado, apenas Excluir e Liberar
                botoesAcao = `
                    <button class="btn-excluir-mini" onclick="excluirSala(${s.id})">Excluir</button>
                    <button class="btn-editar-mini" style="background:#27ae60 !important" onclick="abrirModalDesbloqueio(${s.id})">Liberar</button>
                `;
            } else {
                // REGRA: Se liberado, Excluir e Editar
                botoesAcao = `
                    <button class="btn-excluir-mini" onclick="excluirSala(${s.id})">Excluir</button>
                    <button class="btn-editar-mini" onclick='prepararEdicaoSala(${JSON.stringify(s)})'>Editar</button>
                `;
            }

            tabela.innerHTML += `
                <tr>
                    <td>${s.cod_salao}</td>
                    <td>${s.nome_salao}</td>
                    <td>${s.cap_salao}</td>
                    <td>${status}</td>
                    <td class="text-center" style="white-space:nowrap">
                        ${botoesAcao}
                    </td>
                </tr>
            `;
        });
    } catch (e) { console.error("Erro ao listar salas:", e); }
}

// Verificar duplicidade ao digitar salao
document.getElementById('cod_salao').addEventListener('blur', async function() {
    const codigo = this.value.trim().toUpperCase();
    if (!codigo || salaEmEdicaoId) return; // Não valida se estiver editando uma sala existente

    try {
        const res = await fetch(`http://localhost:3000/salas/verificar/${codigo}`);
        const data = await res.json();

        if (data.existe) {
            alert(`⚠️ Atenção: O código "${codigo}" já está sendo usado por outro espaço.`);
            this.value = ""; 
            this.focus();    
        }
    } catch (e) {
        console.error("Erro ao validar código único.");
    }
});


document.getElementById('formSalao').addEventListener('submit', async function (e) {
    e.preventDefault();

    const isBloqueado = document.getElementById('bloq_salao').value === "true";
    const mot = document.getElementById('mot_bloq').value.trim();
    const resp = document.getElementById('resp_bloq').value.trim();

    if (isBloqueado && (!mot || !resp)) {
        alert("⚠️ Erro: Para bloquear um espaço, você deve informar o Motivo e o Responsável.");
        return; // Interrompe o envio
    }

    const dados = {
        cod_salao: document.getElementById('cod_salao').value.trim().toUpperCase(),
        nome_salao: document.getElementById('nome_salao').value,
        cap_salao: parseInt(document.getElementById('cap_salao').value),
        bloq_salao: isBloqueado,
        mot_bloq: mot,
        resp_bloq: resp
    };

    const url = salaEmEdicaoId 
                ? `http://localhost:3000/salas/${salaEmEdicaoId}` 
                : 'http://localhost:3000/salas';
    const metodo = salaEmEdicaoId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            alert(salaEmEdicaoId ? 'Dados atualizados com sucesso!' : 'Novo espaço cadastrado!');
            // Reset completo após salvar
            salaEmEdicaoId = null;
            this.reset();
            toggleBloqueio("false");
            document.getElementById('btnSalvar').textContent = "Salvar Espaço";
            document.getElementById('btnSalvar').style.background = "#333";
            listarSalas();
        }
    } catch (error) {
        alert('Não foi possível salvar os dados. Verifique a conexão com o servidor.');
    }
});

function prepararEdicaoSala(sala) {
    if (sala.bloq_salao) {
        alert("Atenção: Não é permitido editar os dados de um salão enquanto ele estiver bloqueado.");
        return;
    }

    salaEmEdicaoId = sala.id;
    document.getElementById('cod_salao').value = sala.cod_salao;
    document.getElementById('nome_salao').value = sala.nome_salao;
    document.getElementById('cap_salao').value = sala.cap_salao;
    document.getElementById('bloq_salao').value = "false"; // Sempre false ao editar, pois só editamos liberados
    
    toggleBloqueio("false");
    
    const btn = document.getElementById('btnSalvar');
    btn.textContent = "Atualizar Dados";
    btn.style.background = "var(--success-green)";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// DESBLOQUEIO 
async function confirmarDesbloqueio() {
    const resp = document.getElementById('resp_liberacao').value.trim();
    const data = document.getElementById('data_liberacao').value;

    if(!resp || !data) {
        alert("Por favor, informe quem está liberando o espaço e a data.");
        return;
    }

    try {
        const res = await fetch(`http://localhost:3000/salas/desbloquear/${salaParaDesbloquearId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                resp_liberacao: resp,
                data_liberacao: data
            })
        });

        if (res.ok) {
            fecharModal();
            listarSalas();
            // Um alerta mais elegante ou apenas a atualização da lista
            console.log("Espaço liberado com sucesso!");
        }
    } catch (e) {
        alert("Erro técnico ao tentar liberar o espaço.");
    }
}

async function excluirSala(id) {
    if(!confirm("Tem certeza?")) return;
    try {
        await fetch(`http://localhost:3000/salas/${id}`, { method: 'DELETE' });
        listarSalas();
    } catch (e) { console.error(e); }
}

function abrirModalDesbloqueio(id) {
    salaParaDesbloquearId = id;
    
    // Preenche a data de hoje
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('data_liberacao').value = hoje;
    
    // Limpa o nome do responsável anterior
    document.getElementById('resp_liberacao').value = "";
    
    document.getElementById('modalDesbloqueio').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modalDesbloqueio').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', listarSalas);
