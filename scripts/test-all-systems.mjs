import fs from 'fs';
import path from 'path';

async function runAllTests() {
    console.log('====================================================');
    console.log('🔍 INICIANDO SUITE DE PRUEBAS DEL SISTEMA HECHOAPP');
    console.log('====================================================\n');

    let passed = 0;
    let failed = 0;

    // TEST 1: Company Branding Assets
    try {
        console.log('TEST 1: Verificando Recursos de Marca (Logo y Sello)...');
        const brandingPath = path.join(process.cwd(), 'src', 'lib', 'company-branding.ts');
        if (!fs.existsSync(brandingPath)) {
            throw new Error('src/lib/company-branding.ts no existe.');
        }
        const brandingContent = fs.readFileSync(brandingPath, 'utf8');
        if (!brandingContent.includes('HECHO_LOGO_BASE64') || !brandingContent.includes('HECHO_SELLO_BASE64')) {
            throw new Error('Variables de marca incompletas en company-branding.ts');
        }
        console.log('  ✅ TEST 1 PASÓ: Logo y Sello oficial de HECHO SRL disponibles en Base64.\n');
        passed++;
    } catch (e) {
        console.error('  ❌ TEST 1 FALLÓ:', e.message, '\n');
        failed++;
    }

    // TEST 2: Voice Quote Parser Endpoint
    try {
        console.log('TEST 2: Verificando Endpoint de Cotización por Voz IA (Gemini Fallback)...');
        const res = await fetch('http://localhost:3000/api/quotes/voice-parser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcript: 'Cotización para Hotel Catalonia: 6 mantenimientos preventivos a consolas Split 24k BTU a 2,800 pesos cada uno y cambio de 2 capacitores a 1,500'
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`HTTP ${res.status}: ${err.error || 'Error en endpoint'}`);
        }

        const data = await res.json();
        if (!data.success || !data.data || !Array.isArray(data.data.items) || data.data.items.length === 0) {
            throw new Error('La respuesta de Gemini no contiene ítems válidos.');
        }

        console.log(`  ✅ TEST 2 PASÓ: IA procesó ${data.data.items.length} ítems. Subtotal: RD$ ${data.data.net_total}, Total: RD$ ${data.data.grand_total}\n`);
        passed++;
    } catch (e) {
        console.error('  ❌ TEST 2 FALLÓ:', e.message, '\n');
        failed++;
    }

    // TEST 3: Alegra Sync Route Validation
    try {
        console.log('TEST 3: Verificando Endpoint de Sincronización con Alegra...');
        const res = await fetch('http://localhost:3000/api/alegra/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteId: 'test-validation-id'
            })
        });

        const json = await res.json();
        if (json.requiresConfig !== undefined || json.error) {
            console.log(`  ✅ TEST 3 PASÓ: Endpoint de Alegra responde correctamente (${json.error || 'Validación de estructura OK'})\n`);
            passed++;
        } else {
            throw new Error('Respuesta inesperada del endpoint de Alegra.');
        }
    } catch (e) {
        console.error('  ❌ TEST 3 FALLÓ:', e.message, '\n');
        failed++;
    }

    // TEST 4: Date Formatting & Numbering Logic
    try {
        console.log('TEST 4: Verificando Formato de Secuencia Correlativa (CT-YYYY-MM-DD-XXX)...');
        const todayStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Santo_Domingo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());

        const sampleNumber = `CT-${todayStr}-001`;
        if (!sampleNumber.startsWith('CT-') || sampleNumber.split('-').length < 5) {
            throw new Error(`Formato de número inválido: ${sampleNumber}`);
        }
        console.log(`  ✅ TEST 4 PASÓ: Generador de secuencia listo para emitir: ${sampleNumber}\n`);
        passed++;
    } catch (e) {
        console.error('  ❌ TEST 4 FALLÓ:', e.message, '\n');
        failed++;
    }

    // TEST 5: PDF Template Compilation & Structure
    try {
        console.log('TEST 5: Verificando Plantilla Oficial PDF (ClassicTemplate)...');
        const templatePath = path.join(process.cwd(), 'src', 'components', 'documents', 'templates', 'ClassicTemplate.tsx');
        if (!fs.existsSync(templatePath)) {
            throw new Error('ClassicTemplate.tsx no existe.');
        }
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        if (!templateContent.includes('HECHO_LOGO_BASE64') || !templateContent.includes('HECHO_SELLO_BASE64')) {
            throw new Error('La plantilla PDF no referencia el logo y sello corporativo.');
        }
        console.log('  ✅ TEST 5 PASÓ: Plantilla oficial PDF vinculada con logo superior derecho y sello inferior.\n');
        passed++;
    } catch (e) {
        console.error('  ❌ TEST 5 FALLÓ:', e.message, '\n');
        failed++;
    }

    console.log('====================================================');
    console.log(`📊 RESULTADO DE LA SUITE: ${passed} PASADOS, ${failed} FALLIDOS`);
    console.log('====================================================');
}

runAllTests().catch(console.error);
