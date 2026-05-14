const http = require('http');

http.get('http://localhost:3000/api/export/consolidated', (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            if (!parsed.success) {
                console.error('API failed', parsed);
                return;
            }

            const { data: orgData, organizations } = parsed;
            
            console.log('Organizations found:', organizations.length);
            
            // Look for any account that has "cota" in its name or ID
            const cotaVariations = new Set();
            let missingCRAs = [];

            for (const org of organizations) {
                const expenses = orgData[org.id] || {};
                let foundCota = false;
                let cotaValue = 0;
                
                for (const [accId, details] of Object.entries(expenses)) {
                    const nameLower = (details.name || '').toLowerCase();
                    if (nameLower.includes('cota') || accId === '1.11.1.5' || accId === '1.12.1.5') {
                        foundCota = true;
                        cotaValue = details.total;
                        cotaVariations.add(JSON.stringify({
                            id: accId,
                            name: details.name,
                            orgName: org.name
                        }));
                    }
                }
                
                if (!foundCota || cotaValue === 0) {
                    missingCRAs.push(org.name);
                }
            }

            console.log('\nFound Cota-Parte variations:');
            cotaVariations.forEach(v => console.log(v));
            
            console.log('\nCRAs with 0 or missing Cota-Parte:');
            console.log(missingCRAs.join(', '));

        } catch (e) {
            console.error('Failed to parse:', e.message);
        }
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
