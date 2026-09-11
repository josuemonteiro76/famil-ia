import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, where, serverTimestamp } 
from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
// === IMPORTAÇÃO DA AUTENTICAÇÃO ===
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

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
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let currentUser = null; // Armazena o usuário logado
let unsubscribeFunctions = []; // Guarda as conexões para fechar ao deslogar

M.Modal.init(document.querySelectorAll('.modal'));

// ==========================================
// 1. SISTEMA DE LOGIN / LOGOUT
// ==========================================

// COLOQUE OS MESMOS E-MAILS AQUI PARA O APP MOSTRAR O AVISO
const emailsAutorizados = [
    "SEU_EMAIL@gmail.com",
    "EMAIL_ESPOSA@gmail.com",
    "EMAIL_FILHO@gmail.com"
];

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Verifica se o e-mail da pessoa está na lista
        if (emailsAutorizados.includes(user.email)) {
            // Logado e AUTORIZADO
            currentUser = user;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            iniciarBancoDeDados(); 
        } else {
            // Logado, mas NÃO AUTORIZADO
            M.toast({html: 'Acesso negado: Este e-mail não está autorizado.', classes: 'red rounded', displayLength: 5000});
            signOut(auth); // Desloga a pessoa na mesma hora
        }
    } else {
        // Usuário não está logado
        currentUser = null;
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
        
        unsubscribeFunctions.forEach(unsub => unsub());
        unsubscribeFunctions = [];
    }
});

document.getElementById('btn-login').addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(error => {
        M.toast({html: 'Erro ao fazer login!', classes: 'red rounded'});
    });
});

document.getElementById('btn-logout').addEventListener('click', () => {
    if(confirm("Deseja sair da sua conta?")) {
        signOut(auth);
    }
});

// ==========================================
// 2. NAVEGAÇÃO DE ABAS
// ==========================================
let currentTab = 'view-agenda';
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');
const appTitle = document.getElementById('app-title');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navItems.forEach(n => n.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));
        item.classList.add('active');
        currentTab = item.dataset.target;
        document.getElementById(currentTab).classList.add('active');
        appTitle.innerText = item.dataset.title;
    });
});

// ==========================================
// 3. SALVAR DADOS (Com ID do Usuário)
// ==========================================
const modalAdd = M.Modal.getInstance(document.getElementById('modal-add'));
const modalTitle = document.getElementById('modal-title');
const modalInput = document.getElementById('modal-input');
const modalDateWrapper = document.getElementById('modal-date-wrapper');
const modalDate = document.getElementById('modal-date');
const btnSave = document.getElementById('btn-save');

document.getElementById('main-fab').addEventListener('click', () => {
    modalInput.value = '';
    if(currentTab === 'view-agenda') {
        modalTitle.innerText = 'Novo Evento';
        modalDateWrapper.style.display = 'block';
        modalDate.value = new Date().toISOString().split('T')[0];
    } else {
        modalTitle.innerText = currentTab === 'view-todo' ? 'Nova Tarefa' : (currentTab === 'view-compras' ? 'Novo Item' : 'Nova Nota');
        modalDateWrapper.style.display = 'none';
    }
    M.updateTextFields();
    modalAdd.open();
    setTimeout(() => modalInput.focus(), 300);
});

btnSave.addEventListener('click', async () => {
    const texto = modalInput.value.trim();
    if (!texto) return M.toast({html: 'O campo não pode estar vazio!', classes: 'red rounded'});
    if (!currentUser) return; // Segurança

    const baseData = {
        texto,
        userId: currentUser.uid, // <--- O SEGREDO ESTÁ AQUI: Grava de quem é o dado!
        criadoEm: serverTimestamp()
    };

    try {
        if(currentTab === 'view-todo') {
            await addDoc(collection(db, "tarefas"), { ...baseData, concluida: false });
        } else if(currentTab === 'view-compras') {
            await addDoc(collection(db, "compras"), baseData);
        } else if(currentTab === 'view-memo') {
            await addDoc(collection(db, "memos"), baseData);
        } else if(currentTab === 'view-agenda') {
            await addDoc(collection(db, "agenda"), { ...baseData, dataIso: modalDate.value });
        }
        modalAdd.close();
        M.toast({html: 'Adicionado!', classes: 'green rounded'});
    } catch (e) {
        M.toast({html: 'Erro ao salvar.', classes: 'red rounded'});
    }
});

// ==========================================
// 4. LER DADOS (Filtrando pelo Usuário Logado)
// ==========================================
let dataRef = new Date();
let eventosAg = [];

// Função auxiliar para ordenar no lado do cliente
function ordenarPorData(docs) {
    return docs.sort((a, b) => {
        const timeA = a.criadoEm ? a.criadoEm.toMillis() : Date.now();
        const timeB = b.criadoEm ? b.criadoEm.toMillis() : Date.now();
        return timeB - timeA;
    });
}

function iniciarBancoDeDados() {
    // Filtro essencial: where("userId", "==", currentUser.uid)
    
    // Tarefas
    const unsubTarefas = onSnapshot(query(collection(db, "tarefas"), where("userId", "==", currentUser.uid)), (snap) => {
        const pendentes = document.getElementById('todo-list-pendentes');
        const concluidas = document.getElementById('todo-list-concluidas');
        pendentes.innerHTML = ''; concluidas.innerHTML = '';
        
        let docs = [];
        snap.forEach(d => docs.push({id: d.id, ...d.data()}));
        ordenarPorData(docs).forEach(t => {
            const li = document.createElement('li');
            li.className = 'collection-item';
            li.innerHTML = `
                <i class="material-icons icon-btn check" data-id="${t.id}" data-action="toggle-todo" data-status="${t.concluida}">${t.concluida ? 'check_box' : 'check_box_outline_blank'}</i>
                <span>${t.texto}</span>
                <i class="material-icons icon-btn delete" data-id="${t.id}" data-action="del-todo">delete_outline</i>
            `;
            (t.concluida ? concluidas : pendentes).appendChild(li);
        });
    });

    // Compras
    const unsubCompras = onSnapshot(query(collection(db, "compras"), where("userId", "==", currentUser.uid)), (snap) => {
        const list = document.getElementById('compras-list');
        list.innerHTML = '';
        let docs = [];
        snap.forEach(d => docs.push({id: d.id, ...d.data()}));
        ordenarPorData(docs).forEach(item => {
            list.innerHTML += `<li class="collection-item"><span>${item.texto}</span><i class="material-icons icon-btn delete" data-id="${item.id}" data-action="del-compra">delete_outline</i></li>`;
        });
    });

    // Memos
    const unsubMemos = onSnapshot(query(collection(db, "memos"), where("userId", "==", currentUser.uid)), (snap) => {
        const list = document.getElementById('memo-list');
        list.innerHTML = '';
        let docs = [];
        snap.forEach(d => docs.push({id: d.id, ...d.data()}));
        ordenarPorData(docs).forEach(memo => {
            list.innerHTML += `<div class="col s12"><div class="memo-card"><span>${memo.texto}</span><i class="material-icons icon-btn delete" data-id="${memo.id}" data-action="del-memo">delete_outline</i></div></div>`;
        });
    });

    // Agenda
    const unsubAgenda = onSnapshot(query(collection(db, "agenda"), where("userId", "==", currentUser.uid)), (snap) => {
        eventosAg = snap.docs.map(d => ({id: d.id, ...d.data()}));
        renderAgenda();
    });

    // Guardamos para poder desconectar se o usuário fizer logout
    unsubscribeFunctions = [unsubTarefas, unsubCompras, unsubMemos, unsubAgenda];
}

// Ações de Excluir / Concluir
document.getElementById('views-container').addEventListener('click', async (e) => {
    const target = e.target;
    if(target.classList.contains('icon-btn')) {
        const id = target.getAttribute('data-id');
        const action = target.getAttribute('data-action');
        
        if(action === 'toggle-todo') {
            const status = target.getAttribute('data-status') === 'true';
            await updateDoc(doc(db, "tarefas", id), { concluida: !status });
        } else if(action.startsWith('del-')) {
            if(confirm('Excluir este item?')) {
                const colecao = action.split('-')[1];
                const colName = colecao === 'todo' ? 'tarefas' : (colecao === 'compra' ? 'compras' : (colecao === 'memo' ? 'memos' : 'agenda'));
                await deleteDoc(doc(db, colName, id));
            }
        }
    }
});

function renderAgenda() {
    const cont = document.getElementById('agenda-container');
    if(!cont) return;
    cont.innerHTML = '';
    const dom = new Date(dataRef);
    dom.setDate(dom.getDate() - dom.getDay());
    const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hojeIso = new Date().toISOString().split('T')[0];
    const mes = dom.toLocaleString('pt-BR', { month: 'long' });
    document.getElementById('mes-ano-agenda').innerText = mes.charAt(0).toUpperCase() + mes.slice(1) + ' ' + dom.getFullYear();

    for(let i=0; i<7; i++) {
        const dia = new Date(dom);
        dia.setDate(dom.getDate() + i);
        const iso = dia.toISOString().split('T')[0];
        let htmlEv = eventosAg.filter(e => e.dataIso === iso).map(e => `
            <div class="evento-item">
                <span>${e.texto}</span>
                <i class="material-icons icon-btn delete" data-id="${e.id}" data-action="del-agenda">close</i>
            </div>
        `).join('');
        cont.innerHTML += `
            <div class="dia-linha ${iso === hojeIso ? 'hoje' : ''}">
                <div class="dia-data">
                    <span class="dia-semana">${nomesDias[i]}</span>
                    <span class="dia-numero">${dia.getDate()}</span>
                </div>
                <div class="dia-eventos">${htmlEv}</div>
            </div>`;
    }
}

// Swipe Agenda
const agendaCont = document.getElementById('view-agenda');
let touchX = 0;
agendaCont.addEventListener('touchstart', e => touchX = e.changedTouches[0].screenX, {passive: true});
agendaCont.addEventListener('touchend', e => {
    const fimX = e.changedTouches[0].screenX;
    if(fimX < touchX - 50) { dataRef.setDate(dataRef.getDate() + 7); renderAgenda(); }
    if(fimX > touchX + 50) { dataRef.setDate(dataRef.getDate() - 7); renderAgenda(); }
}, {passive: true});
