process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const admin = require('firebase-admin');

const serviceAccount = {
    projectId: "hecho-srl-free",
    clientEmail: "firebase-adminsdk-fbsvc@hecho-srl-free.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCd6ElCEI/WgOU8\n11fdlRSvKhpoSlE11FU1tpN5/droQJZxd8AU+Du36lgykhaJCG85nkpmH+A1YZCn\n2vTeMy1nwvbsogkekW2DrQhX7GVARuN3k/bxQKzEri0fPMJQewv8W8Zktu23/A0Y\n5EGK5aX6dr7q3EVNE23+dsoI0BAIHNjj/RD9HU2D/xwoVrGrhHpZmKO55lw+xhbW\nJomjbhYi0bh7EACTVRv2rGpv3wmK5r4S7ppsVF2UjjCBPOi7+3AGJm8Ah7+td3Ob\nTwFOkpW//NtKut517ziifHyTwZB7D2c59XYh8lLa8VusEWNWmUW3jkb1nhHoQLAZ\nHLkyJcfRAgMBAAECggEABvOrR/yNLJMjpHxRiriNvtFydK1y6lUFBFabowcFTGzN\ngsTUIMg17tijFeTfF5zWsrlwipL0Lr1zHiSyW5bytIr9jnjqwF0ELoQfZimK4pvM\nV18dA82GXalSZLnqzxq/shZDQ3tXN16iH/qqlQgbuM1iBdp5NZW5pbaKmf04+3Zh\n8kX1j+p+SeoGcHtYGjbrrrw5p8iu2XZfWTNtBwwd+d6UoXZ64jF38OZukWX5Vx24\nhiZDOGLLY25EaR201xoCj4JNlLmV8phFygLTd8IZIPPY2j+h4+qUbLOD/c16hVeI\n85PPaITZ5yOO3/XGDAXKDg/2ExFdMdofvfhw80CtrQKBgQDQMz/PlnrJ9KkbItHO\n5DwL1d1dLto48jmXsNYi6PpsGs2NEPML7WfFDENwO/hwJDl10sQGVVsMREotWHn0\niVtJ2AC0qknox/QyrlIgNV9OHvKwRFXiqzm9AwLARnIdXbWBSib+tp4zyL7mQsCr\n0t/vBuqpBaOP31tT+eAovVWZTQKBgQDCKSDSahFtRoHqLHeix16fY6/iQiwiZhrP\nQoZ7fivLCfxF2fGgRoOhorUnBmb3WupFC7mvSyqUyvB3tnLK9OguYsZQ54R5Hjvz\nEI6jP4ZLSNjaYr0Tycep9TxRvBERZcq7q6QOYagQbpZz8h6QLqCCpTEf5d59wbVf\nTszdJMrGlQKBgQCOyTcQFTGs48A+PgkKDPkpXMjuKT28JFNfNwYE9ycXkOI7xs4I\n9g5e02REyrw9nHpT1fJeLZe9t+/vXWh2TuVupVcGkGsT3F4bi/YC5Nex6gOi45rL\nU4bLnA788tM8VJIwUzyfH3ssJJbXsBwXOw4dDe9Nb/KWryYhV5NmHUNhWQKBgQCa\nHLEbsutANG3cJQ2U2/DkTOkHi4SijS8Mgf5iuUQjdjqSayqaED5dJtvpLPC/t58p\nzOPHGr+iuO5j5yJ4rCo631YQU6PXy0LEbMj7FOoQibLurN7tfQUJh0koi0F08LoZ\nemTOsX8IA+9R+sV9pjTrXhl++yM96GqBSvfbNF/rfQKBgCUsrq304Rci8CtSTDTw\niT2nq68tQMSlGndALnlYkoH4hV9YIhnAb2WF0Y/D2+E49nGJcHAIJzkxALpdvq3S\nRBDvHiiFAJ0eynHrb9T+/FBcT8KDDhLIUbfKsFKn/RkpbTRvN+tuJZ9X+pLDcBfY\ndesm+luFp0GiszZgkCxk+dad\n-----END PRIVATE KEY-----\n"
};

// We will try both storageBuckets just in case
const BUCKET_NAME = "hecho-srl-free.firebasestorage.app";

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: BUCKET_NAME
});

const bucket = admin.storage().bucket();

async function configureLifecycle() {
    console.log(`Fetching bucket metadata for ${BUCKET_NAME}...`);
    try {
        const [metadata] = await bucket.getMetadata();
        console.log("Current bucket metadata fetched successfully.");
        console.log("Current lifecycle rules:", JSON.stringify(metadata.lifecycle, null, 2));

        const existingRules = (metadata.lifecycle && metadata.lifecycle.rule) || [];
        
        // Filter out any existing rule targeting 'tickets/videos/' to avoid duplicates
        const filteredRules = existingRules.filter(rule => {
            return !(rule.condition && rule.condition.matchesPrefix && rule.condition.matchesPrefix.includes('tickets/videos/'));
        });

        // Rule to delete videos older than 60 days
        const videoLifecycleRule = {
            action: { type: 'Delete' },
            condition: {
                age: 60,
                matchesPrefix: ['tickets/videos/']
            }
        };

        const updatedRules = [...filteredRules, videoLifecycleRule];

        console.log("Updating lifecycle rules to:", JSON.stringify(updatedRules, null, 2));

        await bucket.setMetadata({
            lifecycle: {
                rule: updatedRules
            }
        });

        console.log("Lifecycle rules updated successfully!");
        
        // Verify changes
        const [newMetadata] = await bucket.getMetadata();
        console.log("Verified updated lifecycle rules:", JSON.stringify(newMetadata.lifecycle, null, 2));
    } catch (error) {
        console.error("Error configuring lifecycle rule:", error);
    }
}

configureLifecycle();
