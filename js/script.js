let moradorEmEdicaoId = null;

function formatarNome(nome) {
  return nome.toLowerCase().split(' ').map(palavra => {
    return palavra.charAt(0).toUpperCase() + palavra.slice(1);
  }).join(' ');
}

document.getElementById('formMorador').addEventListener('submit', async function (e) {
  e.preventDefault(); 

    const capitalizar = (str) => {
    return str.toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
  };
  
      const nomeFinal = tratarNomeProprio(document.getElementById('nome').value);

    const cpfValor = document.getElementById('cpf').value;

  if (!validarCPF(cpfValor)) {
      alert("O CPF informado é inválido. Por favor, confira os números.");
      document.getElementById('cpf').focus();
      return; 
  }

  const dadosMorador = {
    bloco: document.getElementById('bloco').value,
    numero_apartamento: document.getElementById('numero_apartamento').value,
    nome: nomeFinal,// <--- nome formatado bonitinho
    cpf: document.getElementById('cpf').value,
    telefone: document.getElementById('telefone').value,
    email: document.getElementById('email').value || "Não informado",
    proprietario: document.getElementById('proprietario').value === "true",
    ativo: document.getElementById('ativo').value === "true"
  };

const url = moradorEmEdicaoId 
              ? `http://localhost:3000/moradores/${moradorEmEdicaoId}` 
              : 'http://localhost:3000/moradores';
  
  const metodo = moradorEmEdicaoId ? 'PUT' : 'POST';

  try {
    // Enviando dados ao server 
    const response = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosMorador)
    });
const resultado = await response.json(); 
    if (response.ok) {
      alert(moradorEmEdicaoId ? 'Atualizado com sucesso!' : 'Cadastrado com sucesso!');
      
      // zerando tudo
      moradorEmEdicaoId = null;
      this.reset();
      document.querySelector('.btn-menu').textContent = "Salvar Morador";
      document.querySelector('.btn-menu').style.background = "#333";
      
      listarMoradores();

    } else {

      alert('Erro: ' + (resultado.erro || 'Erro ao processar solicitação'));    
    }
  } catch (error) {
    alert('Não foi possível conectar ao servidor.');
  }
});


function validarApto(input) {
  input.value = input.value.replace(/[^0-9]/g, '');

  if (input.value.startsWith('0')) {
    input.value = input.value.substring(1);
  }
}

function mascaraCPF(input) {
  let v = input.value.replace(/\D/g, "");

  if (v.length <= 11) {
    v = v.replace(/(\d{3})(\d)/, "$1.$2");

    v = v.replace(/(\d{3})(\d)/, "$1.$2");

    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  input.value = v;
}

function mascaraTelefone(input) {
  let v = input.value.replace(/\D/g, ""); 

  if (v.length > 0) {
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
  }

  if (v.length <= 13) {
        v = v.replace(/(\d{4})(\d)/, "$1-$2");
  } else {
        v = v.replace(/(\d{5})(\d)/, "$1-$2");
  }

  input.value = v;
}

function validarEmailAoDigitar(input) {
  input.value = input.value.toLowerCase();

  input.value = input.value.replace(/\s/g, "");
}

 
document.getElementById('email').addEventListener('blur', function () {
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regexEmail.test(this.value) && this.value !== "") {
    alert("Favor, insira formato de e-mail válido.");
    this.style.borderColor = "red";
  } else {
    this.style.borderColor = "";
  }
});


function voltarMenu() {
  window.location.href = 'index.html';
}


console.log("Retornando ao menu principal");


// selediona o morador no Backend E lista na tela morador
async function listarMoradores() {
  const tabela = document.getElementById('corpoTabelaMoradores');

  if (!tabela) {
    console.error("Erro: Elemento 'corpoTabelaMoradores' não encontrado no HTML.");
    return;
  }
  try {
    const response = await fetch('http://localhost:3000/moradores');

    if (!response.ok) throw new Error('Falha ao conectar com o servidor');

    const moradores = await response.json();
    tabela.innerHTML = '';

    moradores.forEach(m => {
      const tr = document.createElement('tr');

      // Trata campos nulos ou booleano
      const statusBadge = m.ativo
        ? '<span class="badge bg-success">Ativo</span>'
        : '<span class="badge bg-secondary">Inativo</span>';

      //  const emaiDisplay = m.email && m.email !== "Não infou" ? m.email : "---";

      tr.innerHTML = `
                <td>${m.bloco} - ${m.numero_apartamento}</td>
                <td>${m.nome}</td>
                <td>${m.cpf}</td>
                <td>${m.telefone}</td>
                <td>${statusBadge}</td>
                <td class="text-center" style="white-space: nowrap;">
                    <button class="btn-editar-mini" onclick="prepararEdicao(${JSON.stringify(m).replace(/"/g, '&quot;')})">
                        Editar
                    </button>
                    <button class="btn-excluir-mini" onclick="excluirMorador(${m.id})">
                        Excluir
                    </button>
                </td>
            `;
      tabela.appendChild(tr);
    });
  } catch (error) {
    console.error("Erro detalhado:", error);
    tabela.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar dados do servidor.</td></tr>`;
  }
}



document.addEventListener('DOMContentLoaded', () => {
    console.log("Página carregada, chamando listagem");
    listarMoradores();
});

function prepararEdicao(morador) {
    moradorEmEdicaoId = morador.id; 
    
    document.getElementById('bloco').value = morador.bloco;
    document.getElementById('numero_apartamento').value = morador.numero_apartamento;
    document.getElementById('nome').value = morador.nome;
    document.getElementById('cpf').value = morador.cpf;
    document.getElementById('telefone').value = morador.telefone;
    document.getElementById('email').value = morador.email;
    document.getElementById('proprietario').value = morador.proprietario.toString();
    document.getElementById('ativo').value = morador.ativo.toString();

    const btnSalvar = document.querySelector('.btn-menu');
    btnSalvar.textContent = "Atualizar Morador";
    btnSalvar.style.background = "#28a745"; 

    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// deleta morador.. precisa ajustar para 2 confirmação .. 

async function excluirMorador(id) {
    if (!confirm("Tem certeza que deseja excluir este morador?")) return;

    try {
        const response = await fetch(`http://localhost:3000/moradores/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert("Morador excluído!");
            listarMoradores(); 
        } else {
            alert("Erro ao excluir morador.");
        }
    } catch (error) {
        console.error("Erro ao deletar:", error);
    }
}

function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, ''); // tira o pontos e traço
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false; // Rejeita CPFs errado

    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true;
}


function tratarNomeProprio(nome) {
    const preposicoes = ['de', 'da', 'do', 'dos', 'das', 'e'];
    
    return nome.toLowerCase().trim().split(/\s+/).map((palavra, index) => {
        if (preposicoes.includes(palavra) && index !== 0) {
            return palavra;
        }
              return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    }).join(' ');
}