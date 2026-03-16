const CONFIG = { domain: "https://panel.cicakgoreng.web.id", expireSeconds: 300 };
const IS_TESTING = true; 

const paketList = [
  { id: 'Standard', ram: '2GB', cpu: '100%', disk: '5GB', price: 5000 },
  { id: 'Reguler', ram: '3GB', cpu: '150%', disk: '10GB', price: 9000 },
  { id: 'Luxury', ram: '4GB', cpu: '150%', disk: '15GB', price: 15000 },
  { id: 'Supreme', ram: '6GB', cpu: '200%', disk: '20GB', price: 20000 },
  { id: 'Visionary', ram: '8GB', cpu: '250%', disk: '30GB', price: 25000 }
];

let selectedPaket = null;
let intervalCheck = null;
let intervalTimer = null;
let timeLeft = CONFIG.expireSeconds;

const listPaket = document.getElementById('list_paket');
const inpUser = document.getElementById('inp_user');
const inpPass = document.getElementById('inp_pass');
const btnBuy = document.getElementById('btn_buy');
const modalQr = document.getElementById('modal_qr');
const modalSuccess = document.getElementById('modal_success');

// Init List Paket
listPaket.innerHTML = paketList.map(p => `
  <div onclick="selectPaket('${p.id}')" id="pkt_${p.id}" class="paket-card">
    <div class="flex flex-col">
        <span class="text-lg font-bold text-white">Paket ${p.id}</span>
        <span class="text-[10px] text-slate-500 mb-2">${p.cpu} CPU | ${p.ram} RAM | ${p.disk} Disk</span>
        <span class="text-emerald-400 font-bold text-base">Rp ${p.price.toLocaleString()}</span>
    </div>
  </div>
`).join('');

function selectPaket(id) {
  selectedPaket = paketList.find(p => p.id === id);
  document.querySelectorAll('.paket-card').forEach(c => c.classList.remove('active'));
  document.getElementById(`pkt_${id}`).classList.add('active');
  checkForm();
}

function checkForm() {
  const u = inpUser.value.trim();
  const p = inpPass.value.trim();
  if (selectedPaket && u.length >= 6 && p.length >= 3) {
      btnBuy.disabled = false; btnBuy.classList.remove('opacity-50');
      btnBuy.innerText = `Beli Sekarang - Rp ${selectedPaket.price.toLocaleString()}`;
  } else {
      btnBuy.disabled = true; btnBuy.classList.add('opacity-50');
  }
}

[inpUser, inpPass].forEach(i => i.addEventListener('input', checkForm));

// LOGIKA BELI
btnBuy.onclick = async () => {
    if(!selectedPaket) return;
    const user = inpUser.value.trim();
    const pass = inpPass.value.trim();

    // ISI DETAIL SEBELUM MODAL MUNCUL (BIAR GAK TITIK-TITIK)
    document.getElementById('det_item').innerText = `Paket ${selectedPaket.id}`;
    document.getElementById('det_price').innerText = `Rp ${selectedPaket.price.toLocaleString()}`;
    document.getElementById('img_qr').src = 'https://i.gifer.com/ZKZg.gif';
    modalQr.classList.add('show');

    try {
        const orderId = `DHIKZX-${Date.now()}`;
        const res = await fetch('/.netlify/functions/create', {
            method: 'POST', body: JSON.stringify({ amount: selectedPaket.price, order_id: orderId })
        });
        const data = await res.json();
        const qr = data.qris_string || data.payment?.payment_number;
        
        document.getElementById('img_qr').src = `https://quickchart.io/qr?text=${encodeURIComponent(qr)}&size=300`;
        startTimer();
        startChecking(orderId, user, pass);
    } catch(e) { 
        alert("Gagal membuat pesanan");
        modalQr.classList.remove('show');
    }
};

function startTimer() {
    timeLeft = CONFIG.expireSeconds;
    if(intervalTimer) clearInterval(intervalTimer);
    intervalTimer = setInterval(() => {
        timeLeft--;
        let m = Math.floor(timeLeft/60);
        let s = timeLeft%60;
        document.getElementById('qr_timer').innerText = `${m}m ${s}s`;
        if(timeLeft <= 0) { clearInterval(intervalTimer); location.reload(); }
    }, 1000);
}

function startChecking(orderId, user, pass) {
    if(intervalCheck) clearInterval(intervalCheck);
    intervalCheck = setInterval(async () => {
        try {
            const res = await fetch('/.netlify/functions/check', { method: 'POST', body: JSON.stringify({ order_id: orderId, password: pass })});
            const data = await res.json();
            if(data.status === 'SUCCESS' && data.data) {
                clearInterval(intervalCheck); clearInterval(intervalTimer);
                showSuccess(data.data);
                saveHistory(data.data, orderId);
            }
        } catch(e) {}
    }, 4000);
}

function showSuccess(data) {
    modalQr.classList.remove('show');
    document.getElementById('res_user').innerText = data.user;
    document.getElementById('res_pass').innerText = data.pass;
    document.getElementById('res_url').innerText = data.url;
    modalSuccess.classList.add('show');
}

// LOGIKA HISTORY
function saveHistory(data, orderId) {
    let hist = JSON.parse(localStorage.getItem('dhikzx_history') || '[]');
    hist.unshift({ ...data, orderId, date: new Date().toLocaleDateString('id-ID') });
    localStorage.setItem('dhikzx_history', JSON.stringify(hist));
}

function loadHistory(filter = '') {
    const body = document.getElementById('hist_body');
    const hist = JSON.parse(localStorage.getItem('dhikzx_history') || '[]');
    body.innerHTML = '';
    const filtered = filter ? hist.filter(h => h.user.includes(filter)) : hist;

    if(filtered.length === 0) {
        body.innerHTML = `<p class="text-center text-slate-500 py-10">Data tidak ditemukan</p>`;
        return;
    }

    filtered.forEach(h => {
        const card = document.createElement('div');
        card.className = "bg-slate-800/40 border border-slate-700 p-5 rounded-3xl hover:border-emerald-500/50 transition-all";
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div><p class="text-[10px] text-emerald-500 font-bold uppercase">${h.date}</p><h4 class="text-white font-bold">Akun Panel Active</h4></div>
                <div class="bg-emerald-500/20 text-emerald-400 text-[10px] px-3 py-1 rounded-full">ACTIVE</div>
            </div>
            <div class="bg-slate-900 rounded-2xl p-4 space-y-2 mb-4 text-[11px] font-mono">
                <div class="flex justify-between"><span class="text-slate-500">USER</span><span class="text-white">${h.user}</span></div>
                <div class="flex justify-between"><span class="text-slate-500">PASS</span><span class="text-white">${h.pass}</span></div>
            </div>
            <a href="${h.url}" target="_blank" class="block w-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 py-3 rounded-2xl text-center text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all">BUKA PANEL</a>
        `;
        body.innerHTML += card.outerHTML;
    });
}

function openHistoryModal() {
    loadHistory();
    document.getElementById('modal_history').classList.add('show');
}

function checkMyHistory() {
    loadHistory(document.getElementById('hist_username').value.trim());
}

// UI EVENTS
document.getElementById('btn_open_sidebar').onclick = () => {
    document.getElementById('sidebar_menu').classList.add('show');
    document.getElementById('sidebar_overlay').classList.add('show');
};
document.getElementById('close_sidebar').onclick = () => {
    document.getElementById('sidebar_menu').classList.remove('show');
    document.getElementById('sidebar_overlay').classList.remove('show');
};
document.getElementById('close_history').onclick = () => document.getElementById('modal_history').classList.remove('show');
document.getElementById('close_qr').onclick = () => location.reload();
