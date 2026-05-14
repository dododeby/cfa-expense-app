const http = require('http');

http.get('http://localhost:3000/api/export/consolidated', (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        const { data: orgData, organizations } = JSON.parse(data);
        
        const missingCRAs = ['CFA', 'CRA-AC', 'CRA-AP', 'CRA-DF', 'CRA-MA', 'CRA-MS', 'CRA-MT', 'CRA-PB', 'CRA-PE', 'CRA-PI', 'CRA-RJ', 'CRA-RS', 'CRA-SE'];
        
        for (const orgName of missingCRAs) {
            const org = organizations.find(o => o.name === orgName);
            if (!org) continue;
            
            const expenses = orgData[org.id] || {};
            const expenseCount = Object.keys(expenses).length;
            
            console.log(`${orgName}: ${expenseCount} expenses recorded.`);
        }
    });
});
