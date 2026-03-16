// tesssss.zip/tesssss/script.js (Final: Limits + History + Webhook Sync + Modern UI)

const CONFIG = {
  domain: "https://panel.cicakgoreng.web.id", 
  expireSeconds: 300 // 5 Menit Timer
};

const IS_TESTING = true; 

// Data Paket (Sudah disesuaikan agar tidak kegedean)
const paketList = [
  { id: 'Standard', ram: '1GB', cpu: '50%', disk: '2GB', price: 5000 },
  { id: 'Reguler', ram: '2GB', cpu: '80%', disk: '5GB', price: 9000 },
  { id: 'Luxury', ram: '3GB', cpu: '100%', disk: '7GB', price: 15000 },
  { id: 'Supreme', ram: '4GB', cpu: '150%', disk: '10GB', price: 20000 },
  { id: 'Visionary', ram: '6GB', cpu: '200%', disk: '15GB', price: 25000 }
];

let selectedPaket = null;
let intervalCheck = null;
let intervalTimer = null;
let timeLeft = CONFIG.expireSeconds;
let gracePeriodTimeout = null; 

// Elements
const listPaket = document.getElementById('list_paket');
const inpUser = document.getElementById('inp_user');
const inpPass = document.getElementById('inp_pass');
const btnBuy = document.getElementById('btn_buy');
const modalQr = document.getElementById('modal_qr');
const modalSuccess = document.getElementById('modal_success');
const btnCopyAll = document.getElementById('btn_copy_all');
const modalExpired = document.getElementById('modal_expired');
const closeExpired = document.getElementById('close_expired'); 
const modalKonfirmasiTutup = document.getElementById('modal_konfirmasi_tutup');
const btnBatalKonfirmasi = document.getElementById('btn_batal_konfirmasi');
const btnLanjutTutup = document.getElementById('btn_lanjut_tutup');
const modalErrorUser = document.getElementById('modal_error_user');
const closeErrorUser = document.getElementById('close_error_user');
const errorUserMsg = document.getElementById('error_user_msg');

// Sidebar & Modals
const btnOpenSidebar = document.getElementById('btn_open_sidebar');
const closeSidebar = document.getElementById('close_sidebar');
const sidebarMenu = document.getElementById('sidebar_menu');
const sidebarOverlay = document.getElementById('sidebar_overlay');
const modalHistory = document.getElementById('modal_history');
const closeHistory = document.getElementById('close_history');
const modalInfo = document.getElementById('modal_info');
const closeInfo = document.getElementById('close_info');

// Init List Paket
listPaket.innerHTML = paketList.map(p => `
  <div onclick="selectPaket('${p.id}')" id="pkt_${p.id}" class="paket-card group relative overflow-hidden">
    <div class="flex flex-col">
        <span class="text-xl font-bold text-white mb-1">Paket ${p.id}</span>
        <div class="text-xs text-slate-400 mb-3">
            CPU: ${p.cpu} | RAM: ${p.ram} | Disk: ${p.disk}
        </div>
        <div class="mt-auto text-emerald-400 font-bold text-lg">
            Rp ${p.price.toLocaleString()}<span class="text-xs font-normal text-slate-500">/bulan</span>
        </div>
    </div>
  </div>
`).join('');

// --- SYSTEM STORAGE & CHECKING ---
function saveOrderToLocal(orderData) {
    localStorage.setItem('pending_order', JSON.stringify(orderData));
}
function clearOrderFromLocal() {
    localStorage.removeItem('pending_order');
}

// LOGIKA UTAMA SYNC (FITUR ASLI)
function checkPendingOrder() {
    const savedData = localStorage.getItem('pending_order');
    if (!savedData) return;
    const data = JSON.parse(savedData);
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - data.startTime) / 1000);
    const remainingTime = CONFIG.expireSeconds - elapsedSeconds;

    selectedPaket = paketList.find(p => p.id === data.paketId);

    if (remainingTime <= 0) {
        finalSyncCheck(data);
        return;
    }

    timeLeft = remainingTime;
    
    document.getElementById('det_item').innerText = `Panel Pterodactyl ${selectedPaket.id}`;
    document.getElementById('det_price').innerText = `Rp ${selectedPaket.price.toLocaleString()}`;
    document.getElementById('img_qr').src = `https://quickchart.io/qr?text=${encodeURIComponent(data.qrString)}&size=300`;
    
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    document.getElementById('qr_timer').innerText = `${m}m ${s}s`;

    modalQr.classList.add('show');
    resumeTimer(); 
    startChecking(data.orderId, data.username, data.password); 
}

async function finalSyncCheck(data) {
    try {
        const res = await fetch('/.netlify/functions/check', {
            method: 'POST', body: JSON.stringify({ order_id: data.orderId, password: data.password }) 
        });
        const resData = await res.json();
        const status = (resData.status || (resData.transaction ? resData.transaction.status : null) || "").toUpperCase();

        if (status === 'SUCCESS' && resData.data) {
            saveTransactionHistory({
                orderId: data.orderId,
                date: new Date().toLocaleDateString('id-ID'),
                paket: data.paketId,
                user: resData.data.user,
                pass: resData.data.pass,
                url: resData.data.url,
                spec: resData.data.spec
            });
            modalSuccess.classList.add('show');
            clearOrderFromLocal();
        } else {
            clearOrderFromLocal();
        }
    } catch (e) {
        clearOrderFromLocal();
    }
}

// --- LOGIKA SAFETY CLOSE ---
if(document.getElementById('close_qr')) document.getElementById('close_qr').onclick = () => { modalKonfirmasiTutup.classList.add('show'); };
if (btnBatalKonfirmasi) btnBatalKonfirmasi.onclick = () => { modalKonfirmasiTutup.classList.remove('show'); };
if (btnLanjutTutup) btnLanjutTutup.onclick = () => { fullStopSystem(); };
if(closeExpired) closeExpired.onclick = () => { fullStopSystem(); };
if(closeErrorUser) closeErrorUser.onclick = () => modalErrorUser.classList.remove('show');

function fullStopSystem() {
    clearInterval(intervalCheck); clearInterval(intervalTimer); 
    if(gracePeriodTimeout) clearTimeout(gracePeriodTimeout);
    modalQr.classList.remove('show'); modalKonfirmasiTutup.classList.remove('show'); modalExpired.classList.remove('show');
    clearOrderFromLocal();
}

function resumeTimer() {
    if(intervalTimer) clearInterval(intervalTimer); 
    intervalTimer = setInterval(() => {
        timeLeft--;
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        document.getElementById('qr_timer').innerText = `${m}m ${s}s`;
        
        if(timeLeft <= 0) { 
            clearInterval(intervalTimer); 
            modalQr.classList.remove('show'); 
            modalExpired.classList.add('show'); 
            handleGracePeriod();
        }
    }, 1000);
}

function handleGracePeriod() {
    const savedData = JSON.parse(localStorage.getItem('pending_order'));
    if(savedData) {
         document.querySelector('#modal_expired p').innerHTML = `Waktu habis. <span class="text-emerald-400 animate-pulse">Mengecek pembayaran...</span>`;
    }
    if(gracePeriodTimeout) clearTimeout(gracePeriodTimeout);
    gracePeriodTimeout = setTimeout(() => {
        clearInterval(intervalCheck);
        const lastData = JSON.parse(localStorage.getItem('pending_order'));
        if(lastData) finalSyncCheck(lastData);
    }, 600000);
}

function selectPaket(id) {
  selectedPaket = paketList.find(p => p.id === id);
  document.querySelectorAll('.paket-card').forEach(c => c.classList.remove('active'));
  document.getElementById(`pkt_${id}`).classList.add('active');
  checkForm();
}

function checkForm() {
  const userVal = inpUser.value.trim();
  const passVal = inpPass.value.trim();
  btnBuy.disabled = true; btnBuy.classList.add('opacity-50');
  if (!selectedPaket) { btnBuy.innerText = 'Pilih Paket Dulu'; return; }
  const safeRegex = /^[a-zA-Z0-9]+$/;
  if (!safeRegex.test(userVal) || userVal.length < 6 || userVal.length > 22) { btnBuy.innerText = 'Username (6-22 Huruf/Angka)'; return; }
  if (!safeRegex.test(passVal) || passVal.length < 3 || passVal.length > 10) { btnBuy.innerText = 'Password (3-10 Huruf/Angka)'; return; } 
  btnBuy.disabled = false; btnBuy.classList.remove('opacity-50');
  btnBuy.innerHTML = `Order Sekarang <span class="ml-1 opacity-70">• Rp ${selectedPaket.price.toLocaleString()}</span>`;
}

[inpUser, inpPass].forEach(el => el.addEventListener('input', checkForm));

async function checkUsernameAvailability(username) {
    try {
        const res = await fetch('/.netlify/functions/check_user', { method: 'POST', body: JSON.stringify({ username }) });
        const data = await res.json();
        return data.is_available;
    } catch (e) { return true; }
}

btnBuy.onclick = async () => {
  const user = inpUser.value.trim();
  const pass = inpPass.value.trim();
  const originalText = btnBuy.innerHTML;
  btnBuy.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Checking...`;
  btnBuy.disabled = true;

  const isAvailable = await checkUsernameAvailability(user);
  if (!isAvailable) {
    errorUserMsg.innerHTML = `Username <b>${user}</b> sudah digunakan!`;
    modalErrorUser.classList.add('show');
    btnBuy.disabled = false; btnBuy.innerHTML = originalText;
    return;
  }

  const orderId = `DHIKZX-${selectedPaket.id}-${user}-${Date.now()}`; 
  modalQr.classList.add('show');
  btnBuy.disabled = false; btnBuy.innerHTML = originalText;
  document.getElementById('det_item').innerText = `Panel ${selectedPaket.id}`;
  document.getElementById('det_price').innerText = `Rp ${selectedPaket.price.toLocaleString()}`;
  document.getElementById('img_qr').src = 'https://i.gifer.com/ZKZg.gif';
  
  resumeTimer();

  try {
    const res = await fetch('/.netlify/functions/create', { method: 'POST', body: JSON.stringify({ amount: selectedPaket.price, order_id: orderId }) });
    const data = await res.json();
    const qrString = data.qris_string || (data.payment ? data.payment.payment_number : null);
    document.getElementById('img_qr').src = `https://quickchart.io/qr?text=${encodeURIComponent(qrString)}&size=300`;
    saveOrderToLocal({ orderId, username: user, password: pass, paketId: selectedPaket.id, qrString, startTime: Date.now() });
    startChecking(orderId, user, pass); 
  } catch (e) { modalQr.classList.remove('show'); }
};

// --- RIWAYAT (HISTORY) - TAMPILAN BARU DIMAS ---
function saveTransactionHistory(data) {
    let history = JSON.parse(localStorage.getItem('dhikzx_history') || '[]');
    if (history.some(h => h.orderId === data.orderId)) return; 
    history.unshift(data);
    localStorage.setItem('dhikzx_history', JSON.stringify(history));
}

function loadHistory(filterUser = '') {
    const container = document.getElementById('hist_body_container'); 
    const history = JSON.parse(localStorage.getItem('dhikzx_history') || '[]');
    container.innerHTML = ''; 

    const filtered = filterUser ? history.filter(h => h.user.toLowerCase().includes(filterUser.toLowerCase())) : history;

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center py-12 text-slate-500 italic">Data tidak ditemukan.</div>`;
        return;
    }

    filtered.forEach(trx => {
        const card = document.createElement('div');
        card.className = 'bg-slate-800/50 border border-slate-700 p-5 rounded-2xl hover:border-emerald-500/50 transition-all';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div><span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Layanan</span><h4 class="text-xl font-bold text-white">Paket ${trx.paket}</h4></div>
                <div class="text-right"><span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tanggal</span><p class="text-sm text-slate-300 font-mono">${trx.date}</p></div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center"><p class="text-[10px] text-slate-500 mb-1">Username</p><p class="text-emerald-400 font-mono font-bold text-base select-all">${trx.user}</p></div>
                <div class="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center"><p class="text-[10px] text-slate-500 mb-1">Password</p><p class="text-white font-mono font-bold text-base select-all">${trx.pass}</p></div>
            </div>
            <div class="flex gap-2">
                <a href="${trx.url || CONFIG.domain}" target="_blank" class="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-center py-3 rounded-xl text-sm font-bold transition-all">Login Panel</a>
                <button onclick="copyHistData('${trx.user}', '${trx.pass}', this)" class="px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all"><i class="fa-solid fa-copy"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
}

function copyHistData(u, p, btn) {
    navigator.clipboard.writeText(`User: ${u}\nPass: ${p}`);
    const old = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-check"></i>';
    setTimeout(() => btn.innerHTML = old, 2000);
}

function checkMyHistory() { loadHistory(document.getElementById('hist_username').value.trim()); }

// --- CORE CHECKING LOGIC ---
function startChecking(orderId, user, pass) {
  if(intervalCheck) clearInterval(intervalCheck);
  intervalCheck = setInterval(async () => {
    try {
        const res = await fetch('/.netlify/functions/check', { method: 'POST', body: JSON.stringify({ order_id: orderId, password: pass }) });
        const data = await res.json();
        const status = (data.status || (data.transaction ? data.transaction.status : null) || "").toUpperCase();
        
        if (status === 'SUCCESS' && data.data) {
            clearInterval(intervalCheck); clearInterval(intervalTimer);
            if(gracePeriodTimeout) clearTimeout(gracePeriodTimeout);
            modalQr.classList.remove('show'); modalExpired.classList.remove('show'); clearOrderFromLocal(); 
            document.getElementById('res_user').innerText = data.data.user;
            document.getElementById('res_pass').innerText = data.data.pass;
            saveTransactionHistory({ orderId, date: new Date().toLocaleDateString('id-ID'), paket: selectedPaket.id, user: data.data.user, pass: data.data.pass, url: data.data.url });
            modalSuccess.classList.add('show');
        } 
    } catch(e) {}
  }, 4000); 
}

document.addEventListener('DOMContentLoaded', () => {
    if (btnCopyAll) btnCopyAll.onclick = () => {
        const u = document.getElementById('res_user').innerText;
        const p = document.getElementById('res_pass').innerText;
        navigator.clipboard.writeText(`User: ${u}\nPass: ${p}`).then(() => alert("Copied!"));
    };
    checkPendingOrder();
});

// Modal Helpers
btnUserProfile.onclick = () => document.getElementById('modal_developer').classList.add('show');
document.getElementById('close_developer').onclick = () => document.getElementById('modal_developer').classList.remove('show');
function toggleSidebar(s) { 
    if(s) { sidebarMenu.classList.add('show'); sidebarOverlay.classList.add('show'); }
    else { sidebarMenu.classList.remove('show'); sidebarOverlay.classList.remove('show'); }
}
btnOpenSidebar.onclick = () => toggleSidebar(true);
closeSidebar.onclick = () => toggleSidebar(false);
sidebarOverlay.onclick = () => toggleSidebar(false);
function openHistoryModal() { loadHistory(); modalHistory.classList.add('show'); toggleSidebar(false); }
closeHistory.onclick = () => modalHistory.classList.remove('show');
function openInfoModal() { modalInfo.classList.add('show'); toggleSidebar(false); }
closeInfo.onclick = () => modalInfo.classList.remove('show');
