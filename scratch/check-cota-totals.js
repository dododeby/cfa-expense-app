const http = require('http');

http.get('http://localhost:3000/api/export/consolidated', (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        const parsed = JSON.parse(data);
        const { data: orgData, organizations } = parsed;
        
        for (const org of organizations) {
            const expenses = orgData[org.id] || {};
            const cota = expenses['1.11.1.5'] || expenses['1.12.1.5'];
            if (cota) {
                console.log(`${org.name}: ${cota.total}`);
            }
        }
    });
});
