import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
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

// Inicializa a interface visual assim que o script carrega
M.Modal.init(document.querySelectorAll('.modal'));
M.updateTextFields();

// Navegação de Abas
let currentTab = 'view-agenda';
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');
const appTitle = document.getElementById('app-title');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault(); // Impede o surgimento do link estranho #! na barra de endereços
        
        navItems.forEach(n => n.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));
        
        item.classList.add('active');
        currentTab = item.dataset.target;
        document.getElementById(currentTab).classList.add('active');
        appTitle.innerText = item.dataset.title;
    });
});

// Modal de Adição
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

// Salvar no Firebase
btnSave.addEventListener('click', async () => {
    const texto = modalInput.value.trim();
    if (!texto) {
        M.toast({html: 'O campo não pode estar vazio!', classes: 'red rounded'});
        return;
    }

    try {
        if(currentTab === 'view-todo') {
            await addDoc(collection(db, "tarefas"), { texto, concluida: false, criadoEm: serverTimestamp() });
        } else if(currentTab === 'view-compras') {
            await addDoc(collection(db, "compras"), { texto, criadoEm: serverTimestamp() });
        } else if(currentTab === 'view-memo') {
            await addDoc(collection(db, "memos"), { texto, criadoEm: serverTimestamp() });
        } else if(currentTab === 'view-agenda') {
            await addDoc(collection(db, "agenda"), { texto, dataIso: modalDate.value, criadoEm: serverTimestamp() });
        }
        modalAdd.close();
        M.toast({html: 'Adicionado!', classes: 'green rounded'});
    } catch (e) {
        M.toast({html: 'Erro ao salvar. Verifique a internet.', classes: 'red rounded'});
    }
});

// Banco de Dados em Tempo Real (To-Do, Compras, Memos)
onSnapshot(query(collection(db, "tarefas"), orderBy("criadoEm", "desc")), (snap) => {
    const pendentes = document.getElementById('todo-list-pendentes');
    const concluidas = document.getElementById('todo-list-concluidas');
    pendentes.innerHTML = ''; concluidas.innerHTML = '';
    
    snap.forEach(docSnap => {
        const t = docSnap.data();
        const li = document.createElement('li');
        li.className = 'collection-item';
        li.innerHTML = `
            <i class="material-icons icon-btn check" data-id="${docSnap.id}" data-action="toggle-todo" data-status="${t.concluida}">${t.concluida ? 'check_box' : 'check_box_outline_blank'}</i>
            <span>${t.texto}</span>
            <i class="material-icons icon-btn delete" data-id="${docSnap.id}" data-action="del-todo">delete_outline</i>
        `;
        (t.concluida ? concluidas : pendentes).appendChild(li);
    });
});

onSnapshot(query(collection(db, "compras"), orderBy("criadoEm", "desc")), (snap) => {
    const list = document.getElementById('compras-list');
    list.innerHTML = '';
    snap.forEach(docSnap => {
        list.innerHTML += `<li class="collection-item"><span>${docSnap.data().texto}</span><i class="material-icons icon-btn delete" data-id="${docSnap.id}" data-action="del-compra">delete_outline</i></li>`;
    });
});

onSnapshot(query(collection(db, "memos"), orderBy("criadoEm", "desc")), (snap) => {
    const list = document.getElementById('memo-list');
    list.innerHTML = '';
    snap.forEach(docSnap => {
        list.innerHTML += `<div class="col s12"><div class="memo-card"><span>${docSnap.data().texto}</span><i class="material-icons icon-btn delete" data-id="${docSnap.id}" data-action="del-memo">delete_outline</i></div></div>`;
    });
});

// Cliques nos botões de excluir/concluir
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

// ==========================================
// AGENDA COM SWIPE
// ==========================================
let dataRef = new Date();
let eventosAg = [];

onSnapshot(collection(db, "agenda"), (snap) => {
    eventosAg = snap.docs.map(d => ({id: d.id, ...d.data()}));
    renderAgenda();
});

function renderAgenda() {
    const cont = document.getElementById('agenda-container');
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

// Deslizar o dedo (Swipe) na Agenda
let touchX = 0;
const agendaCont = document.getElementById('view-agenda');
agendaCont.addEventListener('touchstart', e => touchX = e.changedTouches[0].screenX, {passive: true});
agendaCont.addEventListener('touchend', e => {
    const fimX = e.changedTouches[0].screenX;
    if(fimX < touchX - 50) { dataRef.setDate(dataRef.getDate() + 7); renderAgenda(); }
    if(fimX > touchX + 50) { dataRef.setDate(dataRef.getDate() - 7); renderAgenda(); }
}, {passive: true});
