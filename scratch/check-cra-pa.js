const http = require('http');

http.get('http://localhost:3000/api/export/consolidated', (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        const { data: orgData, organizations } = JSON.parse(data);
        
        const targetCra = organizations.find(o => o.name === 'CRA-PA');
        if (!targetCra) return;
        
        const expenses = orgData[targetCra.id] || {};
        console.log(`Expenses for ${targetCra.name}:`);
        for (const [id, details] of Object.entries(expenses)) {
            if (id === '1.11.1.5' || id === '1.12.1.5' || (details.name || '').toLowerCase().includes('cota')) {
                console.log(`- ${id}: ${details.name} (Total: ${details.total})`);
            }
        }

    });
});
