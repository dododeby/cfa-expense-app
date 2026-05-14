const http = require('http');

http.get('http://localhost:3000/api/export/consolidated', (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        const { data: orgData, organizations } = JSON.parse(data);
        
        const targetCra = organizations.find(o => o.name === 'CRA-AC');
        if (!targetCra) return;
        
        const expenses = orgData[targetCra.id] || {};
        console.log(`Expenses for ${targetCra.name}:`);
        for (const [id, details] of Object.entries(expenses)) {
            console.log(`- ${id}: ${details.name} (Total: ${details.total})`);
        }

    });
});
