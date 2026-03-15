const CONFIG = require('./config');

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { order_id, password: inputPass } = JSON.parse(event.body);
        
        let status;
        let data;

        // --- CHECK STATUS PEMBAYARAN ---
        if (order_id.includes('TESTMODE')) {
            status = 'SUCCESS';
            data = { transaction: { status: 'SUCCESS' } };
        } else {
            const params = new URLSearchParams({
                api_key: CONFIG.PAKASIR_API_KEY, 
                project: 'dhikzxcloud', 
                order_id: order_id
            });
            const response = await fetch(`https://app.pakasir.com/api/transactiondetail?${params}`);
            data = await response.json();
            status = (data.transaction ? data.transaction.status : data.status || "").toUpperCase();
        }

        // --- JIKA SUKSES BAYAR ---
        if (status.includes('SUCCESS') || status.includes('COMPLETED')) {
            const parts = order_id.split('-'); 
            const paketId = parts[1]; 
            const username = parts[2];
            
            // Password dari input user atau random
            const finalPassword = inputPass || (username + Math.floor(100 + Math.random() * 900));

            try {
                // EKSEKUSI LOGIC PEMBUATAN PANEL
                const result = await createPanelLogic(username, finalPassword, paketId);
                
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        status: 'SUCCESS',
                        message: 'Panel Ready',
                        data: {
                            url: CONFIG.PTERO_DOMAIN,
                            user: result.username,
                            pass: result.password,
                            spec: `${result.spec.ram}MB RAM`
                        }
                    })
                };
            } catch (errPtero) {
                console.log("Error Create Panel:", errPtero);
                return {
                    statusCode: 200, 
                    body: JSON.stringify({ status: 'PAID_BUT_ERROR', message: errPtero.message })
                };
            }
        }

        // Jika Belum Lunas
        return { statusCode: 200, body: JSON.stringify(data) };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};

// --- FUNGSI CREATE PANEL ---
async function createPanelLogic(username, password, paketId) {
    const pak = CONFIG.PACKAGES[paketId];
    if (!pak) throw new Error(`Paket ID ${paketId} tidak ditemukan di config.`);

    const headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CONFIG.PTERO_API_KEY}`
    };

    let userId;
    const email = `${username}@dhikzx.store`;
    
    // 1. Cari atau Buat User
    const resUser = await fetch(`${CONFIG.PTERO_DOMAIN}/api/application/users`, {
        method: 'POST', headers: headers, 
        body: JSON.stringify({ email, username, first_name: username, last_name: "Member", password })
    });
    const dataUser = await resUser.json();

    if (!resUser.ok) {
        // Cek jika user sudah ada (conflict)
        const searchUser = await fetch(`${CONFIG.PTERO_DOMAIN}/api/application/users?filter[username]=${username}`, { headers });
        const searchData = await searchUser.json();
        
        if (searchData.data && searchData.data.length > 0) {
            userId = searchData.data[0].attributes.id;
            // Update Password agar sinkron dengan yang diketik di web
            await fetch(`${CONFIG.PTERO_DOMAIN}/api/application/users/${userId}`, {
                method: 'PATCH', headers,
                body: JSON.stringify({ email, username, first_name: username, last_name: "Member", password })
            });
        } else {
            throw new Error(`Gagal Create User: ${dataUser.errors[0]?.detail}`);
        }
    } else {
        userId = dataUser.attributes.id;
    }

    // 2. Cek Server Duplikat
    const resList = await fetch(`${CONFIG.PTERO_DOMAIN}/api/application/servers?filter[name]=${username}`, { headers });
    const dataList = await resList.json();
    
    if (dataList.data && dataList.data.length > 0) {
        const existingServer = dataList.data.find(s => s.attributes.user === userId);
        if (existingServer) return { username, password, spec: pak };
    }

    // 3. Buat Server Baru
    const resServer = await fetch(`${CONFIG.PTERO_DOMAIN}/api/application/servers`, {
        method: 'POST', headers: headers, 
        body: JSON.stringify({
            name: `${username} Server`,
            user: userId, 
            egg: CONFIG.EGG_ID, 
            docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
            startup: "npm start",
            environment: { "INST": "npm", "USER_UPLOAD": "0", "AUTO_UPDATE": "0", "CMD_RUN": "npm start" },
            limits: { memory: pak.ram, swap: 0, disk: pak.disk, io: 500, cpu: pak.cpu },
            feature_limits: { databases: 5, backups: 5, allocations: 5 },
            deploy: { locations: [CONFIG.LOCATION_ID], dedicated_ip: false, port_range: [] }
        })
    });

    if (!resServer.ok) throw new Error("Gagal Create Server Pterodactyl");

    return { username, password, spec: pak };
}
            data = { transaction: { status: 'SUCCESS' } };
        } else {
            const params = new URLSearchParams({
                api_key: PAKASIR_API_KEY, project: 'dhikzxcloud', order_id: order_id
            });
            const response = await fetch(`https://app.pakasir.com/api/transactiondetail?${params}`);
            data = await response.json();
            status = (data.transaction ? data.transaction.status : data.status || "").toUpperCase();
        }

        // --- JIKA SUKSES BAYAR ---
        if (status.includes('SUCCESS') || status.includes('COMPLETED')) {
            const parts = order_id.split('-'); 
            const paketId = parts[1]; 
            const username = parts[2];
            
            // Gunakan password input user, atau fallback ke random jika kosong
            const finalPassword = inputPass || (username + Math.floor(100 + Math.random() * 900));

            try {
                // EKSEKUSI LOGIC PEMBUATAN PANEL
                const result = await createPanelLogic(username, finalPassword, paketId);
                
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        status: 'SUCCESS',
                        message: 'Panel Ready',
                        data: {
                            url: PTERO_DOMAIN,
                            user: result.username,
                            pass: result.password, // Password ini sekarang PASTI sinkron
                            spec: result.spec
                        }
                    })
                };
            } catch (errPtero) {
                console.log("Error Create Panel:", errPtero);
                return {
                    statusCode: 200, 
                    body: JSON.stringify({ status: 'PAID_BUT_ERROR', message: errPtero.message })
                };
            }
        }

        // Jika Belum Lunas
        return { statusCode: 200, body: JSON.stringify(data) };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};

// --- FUNGSI CREATE PANEL (SMART LOGIC) ---
async function createPanelLogic(username, password, paketId) {
    const pak = PACKAGES[paketId];
    if (!pak) throw new Error(`Paket ID ${paketId} tidak ditemukan.`);

    const headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PTERO_API_KEY}`
    };

    let userId;
    const email = `${username}@dhikzx.store`;
    
    // 1. Coba Buat User Baru
    const userBody = {
        email: email, username: username, first_name: username, last_name: "Member", password: password
    };

    const resUser = await fetch(`${PTERO_DOMAIN}/api/application/users`, {
        method: 'POST', headers: headers, body: JSON.stringify(userBody)
    });
    const dataUser = await resUser.json();

    if (!resUser.ok) {
        // Jika Error karena User SUDAH ADA (misal dibuat oleh Webhook)
        const errorDetail = JSON.stringify(dataUser.errors || {});
        if (errorDetail.includes("username") || errorDetail.includes("email")) {
            
            // A. Cari ID User
            const searchUser = await fetch(`${PTERO_DOMAIN}/api/application/users?filter[username]=${username}`, { headers });
            const searchData = await searchUser.json();
            
            if (searchData.data && searchData.data.length > 0) {
                userId = searchData.data[0].attributes.id;
                
                // B. [PENTING] UPDATE PASSWORD USER 
                // Agar password di panel sama dengan yang diketik user di web saat ini
                await fetch(`${PTERO_DOMAIN}/api/application/users/${userId}`, {
                    method: 'PATCH', headers: headers,
                    body: JSON.stringify({
                        username: username, email: email, first_name: username, last_name: "Member", password: password
                    })
                });

            } else {
                throw new Error("User conflict tapi ID tidak ditemukan.");
            }
        } else {
            throw new Error(`Gagal Create User: ${dataUser.errors[0]?.detail}`);
        }
    } else {
        userId = dataUser.attributes.id;
    }

    // 2. Cek Apakah Server Sudah Ada? (Mencegah Duplikat)
    // Server name format: "username Server" (Sesuai format di webhook)
    const resList = await fetch(`${PTERO_DOMAIN}/api/application/servers?filter[name]=${username}`, { headers });
    const dataList = await resList.json();
    
    // Jika user sudah punya server (dibuat webhook), kembalikan data itu saja
    if (dataList.data && dataList.data.length > 0) {
        // Cek apakah server ini milik user yang sama
        const existingServer = dataList.data.find(s => s.attributes.user === userId);
        if (existingServer) {
            return { username, password, spec: pak }; // Return sukses tanpa buat baru
        }
    }

    // 3. Jika Server Belum Ada -> Buat Baru
    const resEgg = await fetch(`${PTERO_DOMAIN}/api/application/nests/${NEST_ID}/eggs/${EGG_ID}`, { headers });
    const dataEgg = await resEgg.json();
    const startup_cmd = dataEgg.attributes.startup;

    const serverBody = {
        name: `${username} Server`, // Samakan format nama dengan Webhook
        description: "Auto Create via Dhikzx Cloud",
        user: userId,
        egg: parseInt(EGG_ID),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: startup_cmd,
        environment: { "INST": "npm", "USER_UPLOAD": "0", "AUTO_UPDATE": "0", "CMD_RUN": "npm start" },
        limits: { memory: pak.ram, swap: 0, disk: pak.disk, io: 500, cpu: pak.cpu },
        feature_limits: { databases: 5, backups: 5, allocations: 5 },
        deploy: { locations: [parseInt(LOCATION_ID)], dedicated_ip: false, port_range: [] }
    };

    const resServer = await fetch(`${PTERO_DOMAIN}/api/application/servers`, {
        method: 'POST', headers: headers, body: JSON.stringify(serverBody)
    });

    if (!resServer.ok) {
        throw new Error("Gagal Create Server Pterodactyl");
    }

    return { username, password, spec: pak };
}
