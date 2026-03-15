const CONFIG = require('./config');

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { username } = JSON.parse(event.body);

        if (!username) {
            return { statusCode: 400, body: JSON.stringify({ message: "Username diperlukan." }) };
        }

        const headers = {
            "Accept": "application/json",
            "Authorization": `Bearer ${CONFIG.PTERO_API_KEY}`
        };

        // URL API Pterodactyl mengambil domain dari CONFIG
        const searchUrl = `${CONFIG.PTERO_DOMAIN}/api/application/users?filter[username]=${encodeURIComponent(username)}`;

        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: headers
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error("Pterodactyl API Error:", data.errors);
            throw new Error(`Pterodactyl API Error (${response.status})`);
        }

        // Cek apakah ada data user yang ditemukan
        const userExists = data.meta.pagination.total > 0;

        return {
            statusCode: 200,
            body: JSON.stringify({
                is_available: !userExists, 
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
