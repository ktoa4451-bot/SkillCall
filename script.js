// ===== Данные репетиторов =====
const tutors = [
    { name: 'Анна Петрова', subject: 'Математика', rating: 4.9, emoji: '👩‍🏫' },
    { name: 'Игорь Смирнов', subject: 'Физика', rating: 4.8, emoji: '👨‍🔬' },
    { name: 'Мария Козлова', subject: 'Английский язык', rating: 5.0, emoji: '👩‍💼' },
    { name: 'Дмитрий Волков', subject: 'Химия', rating: 4.7, emoji: '👨‍🏫' },
    { name: 'Елена Соколова', subject: 'Русский язык', rating: 4.9, emoji: '👩‍🎓' },
    { name: 'Артём Морозов', subject: 'Информатика', rating: 4.8, emoji: '👨‍💻' }
];

// ===== Отрисовка карточек репетиторов =====
const tutorsGrid = document.getElementById('tutorsGrid');
tutors.forEach(tutor => {
    const card = document.createElement('div');
    card.className = 'tutor-card';
    card.innerHTML = `
        <div class="avatar">${tutor.emoji}</div>
        <h3>${tutor.name}</h3>
        <div class="tutor-card__subject">${tutor.subject}</div>
        <div class="tutor-card__rating">★ ${tutor.rating}</div>
        <button class="btn btn--primary" data-tutor="${tutor.name}">Записаться</button>
    `;
    tutorsGrid.appendChild(card);
});

// ===== Мобильное меню =====
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger.addEventListener('click', () => nav.classList.toggle('open'));

// ===== Модальное окно =====
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const bookingForm = document.getElementById('bookingForm');

function openModal(title = 'Запись на занятие') {
    modalTitle.textContent = title;
    modal.classList.add('open');
}
function closeModal() {
    modal.classList.remove('open');
    bookingForm.reset();
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
});

// ===== Кнопки, открывающие модалку =====
document.getElementById('loginBtn').addEventListener('click', () => openModal('Вход в аккаунт'));
document.getElementById('startBtn').addEventListener('click', () => openModal('Начать бесплатно'));
document.getElementById('heroStart').addEventListener('click', () => openModal('Подобрать репетитора'));

// Кнопки тарифов
document.querySelectorAll('[data-plan]').forEach(btn => {
    btn.addEventListener('click', () => openModal(`Тариф: ${btn.dataset.plan}`));
});

// Кнопки "Записаться" у репетиторов (делегирование)
tutorsGrid.addEventListener('click', e => {
    const btn = e.target.closest('[data-tutor]');
    if (btn) openModal(`Запись к ${btn.dataset.tutor}`);
});

// ===== Отправка формы =====
bookingForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = bookingForm.querySelector('input[type="text"]').value;
    alert(`Спасибо, ${name}! Заявка отправлена. Мы свяжемся с вами.`);
    closeModal();
});

// ===== Кнопка "Демо-звонок" — скролл к комнате =====
document.getElementById('demoCall').addEventListener('click', () => {
    document.getElementById('call').scrollIntoView({ behavior: 'smooth' });
});

// ===== Комната звонка: переключатели =====
const micBtn = document.getElementById('micBtn');
const camBtn = document.getElementById('camBtn');
const camToggle = document.getElementById('camToggle');
const endBtn = document.getElementById('endBtn');
const selfVideo = document.getElementById('selfVideo');

let micOn = true;
let camOn = true;

function updateCamUI() {
    const avatar = selfVideo.querySelector('.avatar');
    avatar.style.opacity = camOn ? '1' : '0.3';
    camBtn.textContent = camOn ? '📹' : '🚫';
    camBtn.classList.toggle('active', !camOn);
    if (camToggle) camToggle.textContent = camOn ? '📹' : '🚫';
}

micBtn.addEventListener('click', () => {
    micOn = !micOn;
    micBtn.textContent = micOn ? '🎤' : '🔇';
    micBtn.classList.toggle('active', !micOn);
});

camBtn.addEventListener('click', () => {
    camOn = !camOn;
    updateCamUI();
});

camToggle.addEventListener('click', () => {
    camOn = !camOn;
    updateCamUI();
});

endBtn.addEventListener('click', () => {
    if (confirm('Завершить звонок?')) {
        alert('Звонок завершён. Спасибо за урок!');
    }
});

// ===== Чат =====
const chat = document.getElementById('chat');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    const msg = document.createElement('div');
    msg.className = 'chat__msg chat__msg--student';
    msg.innerHTML = `<strong>Вы:</strong> ${text}`;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
    chatInput.value = '';

    // Имитация ответа репетитора
    setTimeout(() => {
        const reply = document.createElement('div');
        reply.className = 'chat__msg chat__msg--tutor';
        reply.innerHTML = `<strong>Анна:</strong> Хорошо, сейчас объясню этот момент 👍`;
        chat.appendChild(reply);
        chat.scrollTop = chat.scrollHeight;
    }, 1200);
});

// ===== Плавный скролл по навигации =====
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
        const id = link.getAttribute('href');
        if (id.length > 1) {
            e.preventDefault();
            document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
            nav.classList.remove('open');
        }
    });
});

// ===== Инициализация =====
updateCamUI();