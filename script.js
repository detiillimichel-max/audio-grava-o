// -------------------- ESTADO --------------------
let recordings = [];
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let currentlyPlayingId = null;
let audioElement = document.getElementById('audio-player');

const listEl = document.getElementById('recording-list');
const recordBtn = document.getElementById('record-btn');
const modal = document.getElementById('modal');
const modalInput = document.getElementById('recording-name-input');
const modalSave = document.getElementById('modal-save');
const modalCancel = document.getElementById('modal-cancel');

let pendingBlob = null; // blob temporário aguardando nome

// -------------------- INICIALIZAÇÃO --------------------
loadFromStorage();
renderList();

// -------------------- EVENTOS --------------------
recordBtn.addEventListener('click', toggleRecording);
modalSave.addEventListener('click', saveRecordingWithName);
modalCancel.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

// -------------------- FUNÇÕES PRINCIPAIS --------------------
async function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            pendingBlob = blob;
            // Para o stream
            stream.getTracks().forEach(track => track.stop());

            // Abre o modal para nomear
            const now = new Date();
            const defaultName = `Gravação ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            modalInput.value = defaultName;
            modal.classList.remove('hidden');
            modalInput.focus();
            modalInput.select();
        };

        // CORREÇÃO AQUI: Passamos 1000ms para garantir que os dados de áudio sejam processados corretamente
        mediaRecorder.start(1000); 
        isRecording = true;
        recordBtn.classList.add('recording');
        
        // CORREÇÃO AQUI: Prevenção de erro caso a classe do ícone varie
        const iconSpan = recordBtn.querySelector('.mic-icon') || recordBtn.querySelector('.icon');
        if (iconSpan) iconSpan.textContent = '⏹️';

    } catch (err) {
        alert('Permissão para acessar o microfone negada ou navegador sem suporte.');
        console.error(err);
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.classList.remove('recording');
        
        // CORREÇÃO AQUI: Prevenção de erro caso a classe do ícone varie
        const iconSpan = recordBtn.querySelector('.mic-icon') || recordBtn.querySelector('.icon');
        if (iconSpan) iconSpan.textContent = '🎤';
    }
}

async function saveRecordingWithName() {
    const name = modalInput.value.trim() || 'Sem nome';
    closeModal();

    if (!pendingBlob) return;

    try {
        const base64 = await blobToBase64(pendingBlob);
        const now = new Date();
        const newRecording = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            name: name,
            date: now.toISOString(),
            duration: pendingBlob.size, // placeholder, calcularemos depois
            audioData: base64
        };

        // Calcula duração real (carrega em um AudioContext para pegar a duração)
        const duration = await getAudioDuration(base64);
        newRecording.duration = duration;

        recordings.push(newRecording);
        saveToStorage();
        renderList();
        pendingBlob = null;

    } catch (e) {
        alert('Erro ao salvar o áudio.');
        console.error(e);
    }
}

function closeModal() {
    modal.classList.add('hidden');
    pendingBlob = null;
}

// -------------------- PLAYBACK --------------------
function togglePlay(recordingId) {
    const recording = recordings.find(r => r.id === recordingId);
    if (!recording) return;

    // Se já está tocando esse, pausa
    if (currentlyPlayingId === recordingId) {
        audioElement.pause();
        currentlyPlayingId = null;
        updatePlayButtons();
        return;
    }

    // Para qualquer áudio tocando
    audioElement.pause();

    // Carrega o novo
    try {
        audioElement.src = recording.audioData;
        audioElement.play().catch(e => console.warn('Play bloqueado pelo navegador'));
        currentlyPlayingId = recordingId;
        updatePlayButtons();

        // Quando terminar, reseta
        audioElement.onended = () => {
            currentlyPlayingId = null;
            updatePlayButtons();
        };
    } catch (e) {
        alert('Não foi possível reproduzir este áudio.');
    }
}

function updatePlayButtons() {
    document.querySelectorAll('.btn-play').forEach(btn => {
        const id = btn.dataset.id;
        if (id === currentlyPlayingId) {
            btn.textContent = '⏹️';
            btn.classList.add('playing');
        } else {
            btn.textContent = '▶️';
            btn.classList.remove('playing');
        }
    });
}

// -------------------- CRUD --------------------
function deleteRecording(id) {
    if (!confirm('Excluir esta gravação?')) return;
    recordings = recordings.filter(r => r.id !== id);
    if (currentlyPlayingId === id) {
        audioElement.pause();
        currentlyPlayingId = null;
    }
    saveToStorage();
    renderList();
}

function renameRecording(id) {
    const rec = recordings.find(r => r.id === id);
    if (!rec) return;
    const newName = prompt('Novo nome:', rec.name);
    if (newName !== null && newName.trim() !== '') {
        rec.name = newName.trim();
        saveToStorage();
        renderList();
    }
}

// -------------------- RENDERIZAÇÃO --------------------
function renderList() {
    if (recordings.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <span style="font-size: 48px; display: block; margin-bottom: 12px;">🎧</span>
                Nenhuma gravação ainda.<br>
                Toque no botão para começar.
            </div>
        `;
        return;
    }

    // Ordena por data (mais recente primeiro)
    const sorted = [...recordings].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Agrupa por mês/ano
    const groups = {};
    const months = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    sorted.forEach(rec => {
        const d = new Date(rec.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
        if (!groups[key]) groups[key] = { label, items: [] };
        groups[key].items.push(rec);
    });

    let html = '';
    for (const key in groups) {
        const group = groups[key];
        html += `<div class="month-group" style="margin-top: 20px;">`;
        html += `<div class="month-title" style="font-size: 14px; font-weight: 600; color: #8e8e93; text-transform: uppercase; padding: 6px 0 8px 0; border-bottom: 1px solid #e5e5ea; margin-bottom: 12px;">${group.label}</div>`;

        group.items.forEach(rec => {
            const d = new Date(rec.date);
            const day = d.getDate();
            const monthLabel = months[d.getMonth()];
            const dateStr = `${day} de ${monthLabel}`;
            const durStr = formatDuration(rec.duration);

            html += `
                <div class="recording-item" data-id="${rec.id}">
                    <div class="item-info" onclick="renameRecording('${rec.id}')" title="Clique para renomear" style="cursor: pointer;">
                        <div class="item-name">${escHtml(rec.name)}</div>
                        <div class="item-meta">${durStr} - ${dateStr}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-play" data-id="${rec.id}" onclick="togglePlay('${rec.id}')">▶️</button>
                        <button class="btn-delete" onclick="deleteRecording('${rec.id}')" aria-label="Excluir">🗑️</button>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
    }

    listEl.innerHTML = html;
    updatePlayButtons();
}

// -------------------- UTILITÁRIOS --------------------
function blobToBase64(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

function getAudioDuration(base64) {
    return new Promise((resolve) => {
        const audio = new Audio(base64);
        audio.onloadedmetadata = () => {
            resolve(audio.duration);
        };
        audio.onerror = () => resolve(0);
        // Fallback se demorar
        setTimeout(() => resolve(0), 2000);
    });
}

function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function escHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// -------------------- PERSISTÊNCIA (localStorage) --------------------
function saveToStorage() {
    try {
        localStorage.setItem('audio_recordings', JSON.stringify(recordings));
    } catch (e) {
        alert('Armazenamento cheio! Tente excluir algumas gravações antigas.');
    }
}

function loadFromStorage() {
    try {
        const data = localStorage.getItem('audio_recordings');
        if (data) {
            recordings = JSON.parse(data);
        }
    } catch (e) {
        recordings = [];
    }
}
    
