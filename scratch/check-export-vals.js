const http = require('http');

http.get('http://localhost:3000/api/export/consolidated', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const { data: orgData, organizations } = JSON.parse(data);
        
        const accounts = require('./src/lib/all-accounts.json');
        const analyticalAccounts = accounts.filter(acc => acc.type === 'Analítica');

        organizations.forEach(org => {
            const orgExpenses = orgData[org.id] || {};
            let accData = orgExpenses['1.12.1.5'];
            
            if (!accData) {
                if (orgExpenses['1.11.1.5']) {
                    accData = orgExpenses['1.11.1.5'];
                }
            }
            if (!accData) {
                accData = { total: 0, finalistica: 0 };
            }
            if (['CRA-PA', 'CRA-MT', 'CRA-SP'].includes(org.name)) {
                console.log(`${org.name}: Cota Parte Export Value = ${accData.total}`);
            }
        });
    });
});
