// Hapus baris require axios
const PAKASIR_API_KEY = "TSyxACAxxJrmEx4OsGsKcs45EJ2sWyzH"; // Pastikan API Key benar

exports.handler = async function(event, context) {
    // Cek method harus POST
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { amount, order_id } = JSON.parse(event.body);

        // Pakai fetch bawaan (pengganti axios)
        const response = await fetch('https://app.pakasir.com/api/transactioncreate/qris', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: PAKASIR_API_KEY,
                project: 'dhikzxcloud',
                amount: amount,
                order_id: order_id
            })
        });

        const data = await response.json();

        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || "Internal Server Error" })
        };
    }
};
