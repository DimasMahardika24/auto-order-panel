const CONFIG = require('./config');

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const body = JSON.parse(event.body);
        const { order_id, status, project } = body;

        // Validasi Project dari CONFIG (opsional, bisa hardcode atau tambah di config)
        if (project !== 'dhikzxcloud') return { statusCode: 403, body: "Invalid Project" };

        if (status === 'PAID' || status === 'SUCCESS') {
            const parts = order_id.split('-');
            const paketId = parts[1];
            const username = parts[2];
            const password = parts[3] || (username + "123!");

            // Ambil Spek dari CONFIG
            const pak = CONFIG.PACKAGES[paketId];
            if (!pak) throw new Error("Paket tidak ditemukan");

            // --- LOGIKA CREATE PANEL ---
            // (Logika ini sama dengan di check.js, pastikan panggil CONFIG)
            const headers = {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${CONFIG.PTERO_API_KEY}`
            };

            // 1. Cari/Buat User
            let userId;
            const resUser = await fetch(`${CONFIG.PTERO_DOMAIN}/api/application/users`, {
                method: 'POST', headers,
                body: JSON.stringify({ email: `${username}@dhikzx.store`, username, first_name: username, last_name: "Member", password })
            });
            const dataUser = await resUser.json();

            if (!resUser.ok) {
                const searchUser = await fetch(`${CONFIG.PTERO_DOMAIN}/api/application/users?filter[username]=${username}`, { headers });
                const searchData = await searchUser.json();
                if (searchData.data?.length > 0) userId = searchData.data[0].attributes.id;
            } else {
                userId = dataUser.attributes.id;
            }

            // 2. Create Server
            await fetch(`${CONFIG.PTERO_DOMAIN}/api/application/servers`, {
                method: 'POST', headers,
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
        }

        return { statusCode: 200, body: "OK" };
    } catch (error) {
        console.error("Webhook Error:", error);
        return { statusCode: 500, body: error.message };
    }
};
