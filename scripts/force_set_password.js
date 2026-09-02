const admin = require('firebase-admin');

const serviceAccount = {
    projectId: "hecho-srl-free",
    clientEmail: "firebase-adminsdk-fbsvc@hecho-srl-free.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCd6ElCEI/WgOU8\n11fdlRSvKhpoSlE11FU1tpN5/droQJZxd8AU+Du36lgykhaJCG85nkpmH+A1YZCn\n2vTeMy1nwvbsogkekW2DrQhX7GVARuN3k/bxQKzEri0fPMJQewv8W8Zktu23/A0Y\n5EGK5aX6dr7q3EVNE23+dsoI0BAIHNjj/RD9HU2D/xwoVrGrhHpZmKO55lw+xhbW\nJomjbhYi0bh7EACTVRv2rGpv3wmK5r4S7ppsVF2UjjCBPOi7+3AGJm8Ah7+td3Ob\nTwFOkpW//NtKut517ziifHyTwZB7D2c59XYh8lLa8VusEWNWmUW3jkb1nhHoQLAZ\nHLkyJcfRAgMBAAECggEABvOrR/yNLJMjpHxRiriNvtFydK1y6lUFBFabowcFTGzN\ngsTUIMg17tijFeTfF5zWsrlwipL0Lr1zHiSyW5bytIr9jnjqwF0ELoQfZimK4pvM\nV18dA82GXalSZLnqzxq/shZDQ3tXN16iH/qqlQgbuM1iBdp5NZW5pbaKmf04+3Zh\n8kX1j+p+SeoGcHtYGjbrrrw5p8iu2XZfWTNtBwwd+d6UoXZ64jF38OZukWX5Vx24\nhiZDOGLLY25EaR201xoCj4JNlLmV8phFygLTd8IZIPPY2j+h4+qUbLOD/c16hVeI\n85PPaITZ5yOO3/XGDAXKDg/2ExFdMdofvfhw80CtrQKBgQDQMz/PlnrJ9KkbItHO\n5DwL1d1dLto48jmXsNYi6PpsGs2NEPML7WfFDENwO/hwJDl10sQGVVsMREotWHn0\niVtJ2AC0qknox/QyrlIgNV9OHvKwRFXiqzm9AwLARnIdXbWBSib+tp4zyL7mQsCr\n0t/vBuqpBaOP31tT+eAovVWZTQKBgQDCKSDSahFtRoHqLHeix16fY6/iQiwiZhrP\nQoZ7fivLCfxF2fGgRoOhorUnBmb3WupFC7mvSyqUyvB3tnLK9OguYsZQ54R5Hjvz\nEI6jP4ZLSNjaYr0Tycep9TxRvBERZcq7q6QOYagQbpZz8h6QLqCCpTEf5d59wbVf\nTszdJMrGlQKBgQCOyTcQFTGs48A+PgkKDPkpXMjuKT28JFNfNwYE9ycXkOI7xs4I\n9g5e02REyrw9nHpT1fJeLZe9t+/vXWh2TuVupVcGkGsT3F4bi/YC5Nex6gOi45rL\nU4bLnA788tM8VJIwUzyfH3ssJJbXsBwXOw4dDe9Nb/KWryYhV5NmHUNhWQKBgQCa\nHLEbsutANG3cJQ2U2/DkTOkHi4SijS8Mgf5iuUQjdjqSayqaED5dJtvpLPC/t58p\nzOPHGr+iuO5j5yJ4rCo631YQU6PXy0LEbMj7FOoQibLurN7tfQUJh0koi0F08LoZ\nemTOsX8IA+9R+sV9pjTrXhl++yM96GqBSvfbNF/rfQKBgCUsrq304Rci8CtSTDTw\niT2nq68tQMSlGndALnlYkoH4hV9YIhnAb2WF0Y/D2+E49nGJcHAIJzkxALpdvq3S\nRBDvHiiFAJ0eynHrb9T+/FBcT8KDDhLIUbfKsFKn/RkpbTRvN+tuJZ9X+pLDcBfY\ndesm+luFp0GiszZgkCxk+dad\n-----END PRIVATE KEY-----\n"
};

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

async function updateJohanna() {
    const uid = 'I3a1lK1m1yWbOaLeAvSagmA6tVI3';
    const email = 'jcarolina03@gmail.com';
    const password = 'Johanna2026*';
    const name = 'Johanna Guzman';

    console.log(`Actualizando usuario en Firebase Auth [${uid}]...`);
    await admin.auth().updateUser(uid, {
        email: email,
        displayName: name,
        password: password,
        emailVerified: true
    });

    console.log(`Actualizando usuario en Firestore users/${uid}...`);
    await admin.firestore().collection('users').doc(uid).set({
        uid: uid,
        nombre: name,
        displayName: name,
        email: email,
        telefono: '',
        rol: 'GERENTE_TICKETS',
        activo: true,
        allowVideoUpload: true,
        assignedLocations: [],
        allowedDeviceIds: [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`\n✅ ¡USUARIO ACTUALIZADO Y LISTO PARA ENTRAR EN VERCEL!`);
    console.log(`👉 Correo: ${email}`);
    console.log(`👉 Clave temporal: ${password}`);
    console.log(`👉 Rol asignado: GERENTE_TICKETS (Acceso a Gestión de Tickets y Operaciones)`);
}

updateJohanna().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
