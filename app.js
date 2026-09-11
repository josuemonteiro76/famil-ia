import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp } 
from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// ====> COLE AQUI SUAS CREDENCIAIS DO FIREBASE <====
const firebaseConfig = {
  apiKey: "AIzaSyAe1MszEPOYDrK6p7D3ytYz72r82ovGfts",
  authDomain: "famil-ia-51cd7.firebaseapp.com",
  projectId: "famil-ia-51cd7",
  storageBucket: "famil-ia-51cd7.firebasestorage.app",
  messagingSenderId: "1063653704238",
  appId: "1:1063653704238:web:92c692f63a9eb7378615bf"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// 1. NAVEGAÇÃO ENTRE ABAS
// ==========================================
const navButtons = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        navButtons.forEach(b => b.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    });
});

// Utilidade global para pedir textos (Prompt)
function pedirTexto(mensagem) {
    const texto = prompt(mensagem);
    return texto ? texto.trim() : null;
}

// ==========================================
// 2. TO-DO LIST (Tarefas)
// ==========================================
const listPendentes = document.getElementById('todo-list-pendentes');
const listConcluidas = document.getElementById('todo-list-concluidas');

onSnapshot(query(collection(db, "tarefas"), orderBy("criadoEm", "desc")), (snapshot) => {
    listPendentes.innerHTML = '';
    listConcluidas.innerHTML = '';
    snapshot.forEach((docSnap) => {
        const task = docSnap.data();
        const id = docSnap.id;
        const li = document.createElement('li');
        
        li.innerHTML = `
            <span>${task.texto}</span>
            <div>
                ${!task.concluida ? `<button class="btn-icon btn-check" onclick="window.toggleTarefa('${id}', true)">✔</button>` : `<button class="btn-icon" onclick="window.toggleTarefa('${id}', false)">↩</button>`}
                <button class="btn-icon btn-delete" onclick="window.deleteDocFb('tarefas', '${id}')">🗑️</button>
            </div>
        `;
        
        if (task.concluida) listConcluidas.appendChild(li);
        else listPendentes.appendChild(li);
    });
});

document.getElementById('btn-nova-tarefa').onclick = async () => {
    const texto = pedirTexto("Qual a nova tarefa?");
    if (texto) await addDoc(collection(db, "tarefas"), { texto, concluida: false, criadoEm: serverTimestamp() });
};

window.toggleTarefa = async (id, status) => { await updateDoc(doc(db, "tarefas", id), { concluida: status }); };

// ==========================================
// 3. COMPRAS
// ==========================================
const listCompras = document.getElementById('compras-list');
onSnapshot(query(collection(db, "compras"), orderBy("criadoEm", "desc")), (snapshot) => {
    listCompras.innerHTML = '';
    snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.texto}</span><button class="btn-icon btn-delete" onclick="window.deleteDocFb('compras', '${docSnap.id}')">🗑️</button>`;
        listCompras.appendChild(li);
    });
});

document.getElementById('btn-nova-compra').onclick = async () => {
    const texto = pedirTexto("Item para comprar:");
    if (texto) await addDoc(collection(db, "compras"), { texto, criadoEm: serverTimestamp() });
};

// ==========================================
// 4. MEMO (Bloco de Notas)
// ==========================================
const listMemo = document.getElementById('memo-list');
onSnapshot(query(collection(db, "memos"), orderBy("criadoEm", "desc")), (snapshot) => {
    listMemo.innerHTML = '';
    snapshot.forEach((docSnap) => {
        const memo = docSnap.data();
        const li = document.createElement('li');
        li.innerHTML = `<span>${memo.texto}</span><button class="btn-icon btn-delete" onclick="window.deleteDocFb('memos', '${docSnap.id}')">🗑️</button>`;
        listMemo.appendChild(li);
    });
});

document.getElementById('btn-novo-memo').onclick = async () => {
    const texto = pedirTexto("Digite sua nota/lembrete:");
    if (texto) await addDoc(collection(db, "memos"), { texto, criadoEm: serverTimestamp() });
};

// Função Global de Deletar
window.deleteDocFb = async (colecao, id) => {
    if(confirm("Deseja excluir?")) await deleteDoc(doc(db, colecao, id));
};

// ==========================================
// 5. AGENDA (Swipe e Calendário)
// ==========================================
let dataReferencia = new Date(); // Inicia na semana atual
let eventosAgenda = [];

// Escuta os eventos no banco de dados (Trazemos todos para simplificar a busca no JS)
onSnapshot(collection(db, "agenda"), (snapshot) => {
    eventosAgenda = [];
    snapshot.forEach(docSnap => {
        eventosAgenda.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderizarAgenda(); // Atualiza a tela assim que baixar os dados
});

// Adicionar Evento na Agenda
document.getElementById('btn-novo-evento').onclick = async () => {
    const dataIso = prompt("Qual a data? (Formato AAAA-MM-DD)", dataReferencia.toISOString().split('T')[0]);
    if (!dataIso) return;
    const texto = pedirTexto("Qual é o evento?");
    if (texto) await addDoc(collection(db, "agenda"), { dataIso, texto, criadoEm: serverTimestamp() });
};

function renderizarAgenda() {
    const container = document.getElementById('agenda-container');
    container.innerHTML = '';
    
    // Calcula o Domingo da semana atual da 'dataReferencia'
    const domingo = new Date(dataReferencia);
    domingo.setDate(domingo.getDate() - domingo.getDay());
    
    const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hojeIso = new Date().toISOString().split('T')[0];

    // Atualiza o título do mês
    document.getElementById('mes-ano-agenda').innerText = domingo.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    for (let i = 0; i < 7; i++) {
        const diaAtual = new Date(domingo);
        diaAtual.setDate(domingo.getDate() + i);
        const dataIso = diaAtual.toISOString().split('T')[0];
        const isHoje = dataIso === hojeIso ? 'hoje' : '';

        // Filtra eventos deste dia específico
        const eventosDoDia = eventosAgenda.filter(e => e.dataIso === dataIso);
        let eventosHtml = eventosDoDia.map(e => `
            <div class="evento-item">
                ${e.texto} 
                <button class="del-evento" onclick="window.deleteDocFb('agenda', '${e.id}')">✕</button>
            </div>
        `).join('');

        const linha = document.createElement('div');
        linha.className = `dia-linha ${isHoje}`;
        linha.innerHTML = `
            <div class="dia-data">
                <span class="dia-semana">${nomesDias[i]}</span>
                <span class="dia-numero">${diaAtual.getDate()}</span>
            </div>
            <div class="dia-eventos">${eventosHtml}</div>
        `;
        container.appendChild(linha);
    }
}

// Lógica do Swipe (Deslizar o dedo)
let touchstartX = 0;
let touchendX = 0;

const agendaContainer = document.getElementById('agenda-container');

agendaContainer.addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX;
}, {passive: true});

agendaContainer.addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX;
    lidarComSwipe();
}, {passive: true});

function lidarComSwipe() {
    const limiteSwipe = 50; // Distância mínima para considerar um swipe
    if (touchendX < touchstartX - limiteSwipe) {
        // Deslizou pra Esquerda -> Próxima Semana
        dataReferencia.setDate(dataReferencia.getDate() + 7);
        renderizarAgenda();
    }
    if (touchendX > touchstartX + limiteSwipe) {
        // Deslizou pra Direita -> Semana Anterior
        dataReferencia.setDate(dataReferencia.getDate() - 7);
        renderizarAgenda();
    }
}