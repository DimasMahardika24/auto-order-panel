// netlify/functions/config.js
const CONFIG = {
    PTERO_DOMAIN: "https://panel.cicakgoreng.web.id",
    PTERO_API_KEY: "ptla_0qNsCOTVe1SvBHsuGvpCsmk1GMT3IyHyDNHhVtYpy04",
    PAKASIR_API_KEY: "TSyxACAxxJrmEx4OsGsKcs45EJ2sWyzH",
    LOCATION_ID: 1,
    NEST_ID: 5,
    EGG_ID: 15,
    PACKAGES: {
        'Standard':  { ram: 2048, disk: 5000,  cpu: 100, price: 5000 },
        'Reguler':   { ram: 3000, disk: 10000, cpu: 150, price: 9000 },
        'Luxury':    { ram: 4000, disk: 15000, cpu: 150, price: 15000 },
        'Supreme':   { ram: 6000, disk: 20000, cpu: 200, price: 20000 },
        'Visionary': { ram: 8000, disk: 30000, cpu: 250, price: 25000 }
    }
};
module.exports = CONFIG;
