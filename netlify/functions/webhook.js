// netlify/functions/webhook.js (FIXED VERSION)

const PTERO_DOMAIN = "https://fyzz.ganteng.lightsecretconnected.my.id"; 
const PTERO_API_KEY = "ptla_NBtnfeeTGfHaWol39dDjMbjwd9HN8YZLvfCmHt5bSeh"; 
const LOCATION_ID = 1; 
const NEST_ID = 5;     
const EGG_ID = 15;     

const PACKAGES = {
    'Standard': { ram: 2036, disk: 5000, cpu: 100 },
    'Reguler': { ram: 3000, disk: 10000, cpu: 150 },
    'Luxury': { ram: 4000, disk: 15000, cpu: 150 },
    'Supreme': { ram: 6000, disk: 20000, cpu: 200 },
    'Visionary': { ram: 8000, disk: 30000, cpu: 250 } 
};

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const body = JSON.parse(event.body);
        const { order_id, status, project } = body;

        if (project !== 'dhikzxcloud') return { statusCode: 403, body: "Invalid Project" };

        if (status === 'completed' || status === 'success') {
            const parts = order_id.split('-');
            if (parts.length < 3) return { statusCode: 400, body: "Invalid Order Format" };

            const paketId = parts[1];
            const username = parts[2];
            const finalPassword = username + "123"; // Password sementara

            await createPanelLogic(username, finalPassword, paketId);

            return { statusCode: 200, body: "Panel Created" };
        }
        return { statusCode: 200, body: "Ignored" };

    } catch (error) {
        console.error("Webhook Error:", error);
        return { statusCode: 500, body: "Error" };
    }
};

async function createPanelLogic(username, password, paketId) {
    const pak = PACKAGES[paketId];
    if (!pak) throw new Error(`Paket invalid: ${paketId}`);

    const headers = {
        "Accept": "application/json", "Content-Type": "application/json",
        "Authorization": `Bearer ${PTERO_API_KEY}`
    };

    let userId;
    const email = `${username}@dhikzx.store`;
    
    // Create User
    const resUser = await fetch(`${PTERO_DOMAIN}/api/application/users`, {
        method: 'POST', headers, 
        body: JSON.stringify({ email, username, first_name: username, last_name: "Member", password })
    });
    const dataUser = await resUser.json();

    if (!resUser.ok) {
        const searchUser = await fetch(`${PTERO_DOMAIN}/api/application/users?filter[username]=${username}`, { headers });
        const searchData = await searchUser.json();
        if (searchData.data?.length > 0) userId = searchData.data[0].attributes.id;
        else throw new Error("Gagal create/find user.");
    } else {
        userId = dataUser.attributes.id;
    }

    // Get Egg
    const resEgg = await fetch(`${PTERO_DOMAIN}/api/application/nests/${NEST_ID}/eggs/${EGG_ID}`, { headers });
    const dataEgg = await resEgg.json();
    
    // Create Server
    const serverBody = {
        name: `${username} Server`, // Nama disamakan dengan check.js
        description: "Auto Create via Dhikzx Cloud",
        user: userId,
        egg: parseInt(EGG_ID),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
        startup: dataEgg.attributes.startup,
        environment: { "INST": "npm", "USER_UPLOAD": "0", "AUTO_UPDATE": "0", "CMD_RUN": "npm start" },
        limits: { memory: pak.ram, swap: 0, disk: pak.disk, io: 500, cpu: pak.cpu },
        feature_limits: { databases: 1, backups: 0, allocations: 0 },
        deploy: { locations: [parseInt(LOCATION_ID)], dedicated_ip: false, port_range: [] }
    };

    await fetch(`${PTERO_DOMAIN}/api/application/servers`, {
        method: 'POST', headers, body: JSON.stringify(serverBody)
    });
}
