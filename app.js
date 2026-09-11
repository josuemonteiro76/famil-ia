// Importa o Firebase diretamente (sem precisar de instalação complexa)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp } 
from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// SUBSTITUA ESTE BLOCO PELAS SUAS CREDENCIAIS DO FIREBASE (Veja o Passo 2)
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "ID",
  appId: "APP_ID"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');

// Ouve as atualizações do banco em TEMPO REAL
const q = query(collection(db, "tarefas"), orderBy("criadoEm", "desc"));
onSnapshot(q, (snapshot) => {
    list.innerHTML = '';
    snapshot.forEach((doc) => {
        renderTask(doc.id, doc.data());
    });
});

// Adicionar nova tarefa
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = input.value.trim();
    if (!texto) return;

    input.value = ''; // Limpa o campo
    await addDoc(collection(db, "tarefas"), {
        texto: texto,
        concluida: false,
        criadoEm: serverTimestamp()
    });
});

// Desenha a tarefa na tela
function renderTask(id, task) {
    const li = document.createElement('li');
    if (task.concluida) li.classList.add('concluida');

    const span = document.createElement('span');
    span.textContent = task.texto;
    span.onclick = () => toggleTask(id, task.concluida); // Clicar no texto conclui a tarefa

    const btnDelete = document.createElement('button');
    btnDelete.textContent = '✕';
    btnDelete.className = 'delete-btn';
    btnDelete.onclick = () => deleteTask(id);

    li.appendChild(span);
    li.appendChild(btnDelete);
    list.appendChild(li);
}

// Alternar status (Concluída/Pendente)
async function toggleTask(id, currentStatus) {
    await updateDoc(doc(db, "tarefas", id), {
        concluida: !currentStatus
    });
}

// Excluir tarefa
async function deleteTask(id) {
    await deleteDoc(doc(db, "tarefas", id));
}