const https = require('https');

const url = 'https://firestore.googleapis.com/v1/projects/hecho-srl-free/databases/(default)/documents/users';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (!json.documents) {
                console.log("No documents found:", json);
                return;
            }
            console.log(`=== FOUND ${json.documents.length} USERS ===`);
            json.documents.forEach(doc => {
                const fields = doc.fields;
                const pathParts = doc.name.split('/');
                const id = pathParts[pathParts.length - 1];
                
                const email = fields.email ? fields.email.stringValue : 'N/A';
                const rol = fields.rol ? fields.rol.stringValue : (fields.role ? fields.role.stringValue : 'N/A');
                const nombre = fields.nombre ? fields.nombre.stringValue : 'N/A';
                const name = fields.name ? fields.name.stringValue : 'N/A';
                const displayName = fields.displayName ? fields.displayName.stringValue : 'N/A';
                
                console.log(`ID: ${id}`);
                console.log(`  email: ${email}`);
                console.log(`  rol: ${rol}`);
                console.log(`  nombre: ${nombre}`);
                console.log(`  name: ${name}`);
                console.log(`  displayName: ${displayName}`);
                console.log('---------------------------------------');
            });
        } catch (e) {
            console.error("Error parsing response:", e);
        }
    });
}).on('error', (err) => {
    console.error("HTTP Request Error:", err);
});
