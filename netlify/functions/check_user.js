// tesssss.zip/tesssss/netlify/functions/check_user.js

// Ambil konfigurasi Pterodactyl dari check.js
// Biasanya variabel-variabel ini harus diatur sebagai Netlify Environment Variables
// Tapi untuk konsistensi dengan file Anda yang lain, kita pakai konstanta yang sama
const PTERO_DOMAIN = "https://fyzz.ganteng.lightsecretconnected.my.id"; 
const PTERO_API_KEY = "ptla_NBtnfeeTGfHaWol39dDjMbjwd9HN8YZLvfCmHt5bSeh"; 

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { username } = JSON.parse(event.body);

        if (!username) {
            return { statusCode: 400, body: JSON.stringify({ message: "Username diperlukan." }) };
        }

        const headers = {
            "Accept": "application/json",
            "Authorization": `Bearer ${PTERO_API_KEY}`
        };

        // API Endpoint Pterodactyl untuk mencari user berdasarkan username
        // /api/application/users?filter[username]={username}
        const searchUrl = `${PTERO_DOMAIN}/api/application/users?filter[username]=${encodeURIComponent(username)}`;

        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: headers
        });

        const data = await response.json();
        
        // Cek jika API call gagal
        if (!response.ok) {
            console.error("Pterodactyl API Error:", data.errors);
            throw new Error(`Pterodactyl API Error (${response.status})`);
        }

        // Cek apakah ada data user yang ditemukan (panjang array data > 0)
        const userExists = data.meta.pagination.total > 0;

        return {
            statusCode: 200,
            body: JSON.stringify({
                is_available: !userExists, // Ketersediaan adalah kebalikan dari keberadaan
                message: userExists ? "Username sudah terdaftar." : "Username tersedia."
            })
        };

    } catch (error) {
        console.error("Function Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: "Internal Server Error saat cek user: " + error.message 
            })
        };
    }
};
