// tesssss.zip/tesssss/script.js (Final: Limits + History + Webhook Sync)

const CONFIG = {
  domain: "https://fyzz.ganteng.lightsecretconnected.my.id", 
  expireSeconds: 300 // 5 Menit Timer
};

const IS_TESTING = false; 

// Data Paket
const paketList = [
  { id: 'Standard', ram: '2GB', cpu: '100%', disk: '5GB', price: 5000 },
  { id: 'Reguler', ram: '3GB', cpu: '150%', disk: '10GB', price: 9000 },
  { id: 'Luxury', ram: '4GB', cpu: '150%', disk: '15GB', price: 15000 },
  { id: 'Supreme', ram: '6GB', cpu: '200%', disk: '20GB', price: 20000 },
  { id: 'Visionary', ram: '8GB', cpu: '250%', disk: '30000', price: 25000 }
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

// LOGIKA UTAMA SYNC
function checkPendingOrder() {
    const savedData = localStorage.getItem('pending_order');
    if (!savedData) return;
    const data = JSON.parse(savedData);
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - data.startTime) / 1000);
    const remainingTime = CONFIG.expireSeconds - elapsedSeconds;

    selectedPaket = paketList.find(p => p.id === data.paketId);

    if (remainingTime <= 0) {
        console.log("Waktu lokal habis. Melakukan Final Sync Check...");
        finalSyncCheck(data);
        return;
    }

    timeLeft = remainingTime;
    
    document.getElementById('det_item').innerText = `Panel Pterodactyl ${selectedPaket.id}`;
    document.getElementById('det_desc').innerText = `RAM ${selectedPaket.ram} | Disk ${selectedPaket.disk} | CPU ${selectedPaket.cpu}`;
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

            document.getElementById('res_url').innerText = resData.data.url;
            document.getElementById('res_user').innerText = resData.data.user;
            document.getElementById('res_pass').innerText = resData.data.pass;
            document.getElementById('res_spec').innerText = "Detail Paket Tersimpan di Riwayat";
            
            modalSuccess.classList.add('show');
            clearOrderFromLocal();
        } else {
            clearOrderFromLocal();
        }
    } catch (e) {
        console.error("Sync Error:", e);
        clearOrderFromLocal();
    }
}

// --- LOGIKA SAFETY CLOSE ---
document.getElementById('close_qr').onclick = () => { modalKonfirmasiTutup.classList.add('show'); };
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
         document.querySelector('#modal_expired p').innerHTML = `
            Waktu pembayaran habis.<br>
            <span class="text-xs text-emerald-400 animate-pulse">
               <i class="fa-solid fa-spinner fa-spin"></i> Menunggu pembayaran susulan...
            </span>
        `;
    }
    if(gracePeriodTimeout) clearTimeout(gracePeriodTimeout);
    gracePeriodTimeout = setTimeout(() => {
        clearInterval(intervalCheck);
        const lastData = JSON.parse(localStorage.getItem('pending_order'));
        if(lastData) finalSyncCheck(lastData);
        else document.querySelector('#modal_expired p').innerHTML = "Waktu Habis Total.";
    }, 600000);
}

[inpUser, inpPass].forEach(el => el.addEventListener('input', checkForm));

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
  
  // --- VALIDASI USERNAME (6 - 22 Karakter) ---
  if (!safeRegex.test(userVal)) { btnBuy.innerText = 'Username: Hanya huruf & angka'; return; }
  if (userVal.length < 6) { btnBuy.innerText = `Username Kurang (${userVal.length}/6)`; return; } 
  if (userVal.length > 22) { btnBuy.innerText = `Username Kepanjangan (${userVal.length}/22)`; return; } 

  // --- VALIDASI PASSWORD (3 - 10 Karakter) ---
  if (!safeRegex.test(passVal)) { btnBuy.innerText = 'Password: Hanya huruf & angka'; return; }
  if (passVal.length < 3) { btnBuy.innerText = `Password Kurang (${passVal.length}/3)`; return; } 
  if (passVal.length > 10) { btnBuy.innerText = `Password Kepanjangan (${passVal.length}/10)`; return; } 

  // Jika Lolos Semua
  btnBuy.disabled = false; btnBuy.classList.remove('opacity-50');
  btnBuy.innerHTML = `Order Sekarang <span class="ml-1 opacity-70">• Rp ${selectedPaket.price.toLocaleString()}</span>`;
}

async function checkUsernameAvailability(username) {
    try {
        const res = await fetch('/.netlify/functions/check_user', { method: 'POST', body: JSON.stringify({ username }) });
        const data = await res.json();
        if (!res.ok) return true; 
        return data.is_available;
    } catch (e) { return true; }
}

btnBuy.onclick = async () => {
  const user = inpUser.value.trim();
  const pass = inpPass.value.trim();
  const originalText = btnBuy.innerHTML;
  btnBuy.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Mengecek Username...`;
  btnBuy.disabled = true;

  const isAvailable = await checkUsernameAvailability(user);
  if (!isAvailable) {
    errorUserMsg.innerHTML = `Mohon Maaf, Username <b>${user}</b> saat ini sudah digunakan!`;
    modalErrorUser.classList.add('show');
    btnBuy.disabled = false; btnBuy.innerHTML = originalText;
    return;
  }

  const orderIdSuffix = IS_TESTING ? 'TESTMODE' : Date.now();
  const orderId = `DHIKZX-${selectedPaket.id}-${user}-${orderIdSuffix}`; 
  
  modalQr.classList.add('show');
  btnBuy.disabled = false; btnBuy.innerHTML = originalText;

  document.getElementById('det_item').innerText = `Panel Pterodactyl ${selectedPaket.id}`;
  document.getElementById('det_desc').innerText = `RAM ${selectedPaket.ram} | Disk ${selectedPaket.disk} | CPU ${selectedPaket.cpu}`;
  document.getElementById('det_price').innerText = `Rp ${selectedPaket.price.toLocaleString()}`;
  document.getElementById('img_qr').src = 'https://i.gifer.com/ZKZg.gif';
  
  timeLeft = CONFIG.expireSeconds;
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  document.getElementById('qr_timer').innerText = `${m}m ${s}s`;

  resumeTimer();

  try {
    const res = await fetch('/.netlify/functions/create', {
        method: 'POST', body: JSON.stringify({ amount: selectedPaket.price, order_id: orderId })
    });
    if(!res.ok) throw new Error("Gagal connect ke Netlify Function");
    const data = await res.json();
    const qrString = data.qris_string || (data.payment ? data.payment.payment_number : null);
    if(!qrString) throw new Error("QR Kosong");
    
    document.getElementById('img_qr').src = `https://quickchart.io/qr?text=${encodeURIComponent(qrString)}&size=300`;
    saveOrderToLocal({ orderId: orderId, username: user, password: pass, paketId: selectedPaket.id, qrString: qrString, startTime: Date.now() });
    startChecking(orderId, user, pass); 
  } catch (e) { alert("Error: " + e.message); modalQr.classList.remove('show'); }
};

// --- RIWAYAT (HISTORY) FIX ---
function saveTransactionHistory(data) {
    let history = JSON.parse(localStorage.getItem('dhikzx_history') || '[]');
    const exists = history.some(h => h.orderId === data.orderId);
    if (exists) return; 
    history.unshift(data);
    localStorage.setItem('dhikzx_history', JSON.stringify(history));
}

function loadHistory(filterUser = '') {
    const listContainer = document.getElementById('hist_body'); 
    const history = JSON.parse(localStorage.getItem('dhikzx_history') || '[]');
    
    listContainer.innerHTML = ''; 

    const filteredHistory = filterUser 
        ? history.filter(h => h.user.toLowerCase().includes(filterUser.toLowerCase()))
        : history;

    if (filteredHistory.length === 0) {
        listContainer.innerHTML = `
            <tr>
                <td colspan="3" class="p-8 text-center text-slate-500 text-xs">
                   <i class="fa-solid fa-ghost text-2xl mb-2 block"></i>
                   Belum ada data transaksi.
                </td>
            </tr>`;
        return;
    }

    filteredHistory.forEach(trx => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors';
        
        tr.innerHTML = `
            <td class="p-3 text-xs text-slate-400 font-mono">${trx.date}</td>
            <td class="p-3">
                <div class="text-white text-sm font-bold">Paket ${trx.paket}</div>
                <div class="text-[10px] text-slate-500 font-mono">
                   User: <span class="text-emerald-400">${trx.user}</span><br>
                   Pass: <span class="select-all cursor-pointer hover:text-white">${trx.pass}</span>
                </div>
            </td>
            <td class="p-3 text-right align-middle">
                <a href="${trx.url}" target="_blank" class="inline-block bg-emerald-600/20 text-emerald-400 text-[10px] px-2 py-1 rounded border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition-all">
                   Login <i class="fa-solid fa-arrow-up-right-from-square ml-1"></i>
                </a>
            </td>
        `;
        listContainer.appendChild(tr);
    });
}

function checkMyHistory() {
    const inputVal = document.getElementById('hist_username').value.trim();
    loadHistory(inputVal);
}

// --- CORE CHECKING LOGIC ---
function startChecking(orderId, user, pass) {
  if(intervalCheck) clearInterval(intervalCheck);
  intervalCheck = setInterval(async () => {
    try {
        const res = await fetch('/.netlify/functions/check', {
            method: 'POST', body: JSON.stringify({ order_id: orderId, password: pass }) 
        });
        const data = await res.json();
        const status = (data.status || (data.transaction ? data.transaction.status : null) || "").toUpperCase();
        
        if (status === 'SUCCESS' && data.data) {
            clearInterval(intervalCheck); 
            clearInterval(intervalTimer);
            if(gracePeriodTimeout) clearTimeout(gracePeriodTimeout);

            modalQr.classList.remove('show'); 
            modalKonfirmasiTutup.classList.remove('show');
            modalExpired.classList.remove('show'); 
            
            clearOrderFromLocal(); 
            
            document.getElementById('res_url').innerText = data.data.url;
            document.getElementById('res_user').innerText = data.data.user;
            document.getElementById('res_pass').innerText = data.data.pass;
            
            const ram = data.data.spec.ram; 
            const disk = data.data.spec.disk;
            const cpu = data.data.spec.cpu;

            document.getElementById('res_spec').innerHTML = `
                <div class="text-xs text-slate-500">Spesifikasi Panel</div>
                <p class="text-sm font-mono mb-2 text-slate-300">
                    RAM: ${(ram/1024).toFixed(1)}GB | Disk: ${(disk/1024).toFixed(1)}GB | CPU: ${cpu}%
                </p>
            `;
            
            saveTransactionHistory({
                orderId: orderId, 
                date: new Date().toLocaleDateString('id-ID'),
                paket: selectedPaket ? selectedPaket.id : 'Custom',
                user: data.data.user,
                pass: data.data.pass,
                url: data.data.url,
                spec: { ram, disk, cpu }
            });
            
            modalSuccess.classList.add('show');
        } 
        else if (status === 'PAID_BUT_ERROR') {
             fullStopSystem();
             alert("✅ PEMBAYARAN SUKSES! Tapi gagal buat panel. Lapor admin!");
        } 
        else if (status === 'FAILURE' || status === 'FAILED') {
             fullStopSystem();
             alert("Pembayaran GAGAL.");
        }
    } catch(e) { console.error("Error Polling:", e); }
  }, 4000); 
}

document.addEventListener('DOMContentLoaded', () => {
    const btnCopy = document.getElementById('btn_copy_all');
    if (btnCopy) btnCopy.onclick = () => copyAllPanelData(btnCopy);
    checkPendingOrder();
});

function copyAllPanelData(btn) {
    const url = document.getElementById('res_url').innerText;
    const user = document.getElementById('res_user').innerText;
    const pass = document.getElementById('res_pass').innerText;
    const spec = document.getElementById('res_spec').querySelector('p')?.innerText || '-';
    const formattedData = `📦 Detail Akun Panel Anda\n————————————————————————\n☁ Login URL: ${url}\n👤 Username: ${user}\n🔑 Password: ${pass}\n🖥 Spesifikasi: ${spec}\n👑 Owner: wa.me/6285810287828\n————————————————————————\n⚠ Harap simpan data ini baik-baik!`;
    navigator.clipboard.writeText(formattedData).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-check mr-2"></i> Data Berhasil Dicopy!`;
        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
    });
}

const btnUserProfile = document.getElementById('btn_user_profile');
const modalDeveloper = document.getElementById('modal_developer');
const closeDeveloper = document.getElementById('close_developer');
btnUserProfile.onclick = () => modalDeveloper.classList.add('show');
closeDeveloper.onclick = () => modalDeveloper.classList.remove('show');

function toggleSidebar(show) {
    if (show) { sidebarMenu.classList.add('show'); sidebarOverlay.classList.add('show'); } 
    else { sidebarMenu.classList.remove('show'); sidebarOverlay.classList.remove('show'); }
}
btnOpenSidebar.onclick = () => toggleSidebar(true);
closeSidebar.onclick = () => toggleSidebar(false);
sidebarOverlay.onclick = () => toggleSidebar(false);
function openHistoryModal() { loadHistory(); modalHistory.classList.add('show'); toggleSidebar(false); }
if(closeHistory) closeHistory.onclick = () => modalHistory.classList.remove('show');
function openInfoModal() { modalInfo.classList.add('show'); toggleSidebar(false); }
if(closeInfo) closeInfo.onclick = () => modalInfo.classList.remove('show');
