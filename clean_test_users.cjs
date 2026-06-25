const admin = require('firebase-admin');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: 'env' });

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("FIREBASE_SERVICE_ACCOUNT not found in env file.");
    process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const auth = admin.auth();

const isTestUser = (email) => {
    if (!email) return false;
    const lower = email.toLowerCase();
    if (lower.includes('preview.lane')) return true;
    if (lower.includes('proxy.test')) return true;
    if (lower.includes('curl.test')) return true;
    if (lower.includes('step4p5')) return true;
    if (lower.includes('preview-lane')) return true;
    // Pelo screenshot da Lane 01
    if (lower.includes('1782216701@example.com')) return true;
    if (lower.includes('jtorma49@gmail.com') && lower.includes('torma')) {
        // Wait, "Joao Guilherme Torma jtorma49@gmail.com" is in the screenshot. It says "0 bancos Nunca sincronizou". It could be a test user or real user?
        // Let's only delete if it has example.com or specific bots.
    }
    if (lower.endsWith('@example.com')) return true;
    
    return false;
};

async function clean() {
    let nextPageToken;
    let usersToDelete = [];

    do {
        const listUsersResult = await auth.listUsers(1000, nextPageToken);
        listUsersResult.users.forEach((userRecord) => {
            if (isTestUser(userRecord.email)) {
                usersToDelete.push(userRecord);
            }
        });
        nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`Found ${usersToDelete.length} test users to delete.`);

    for (const user of usersToDelete) {
        console.log(`Deleting user: ${user.email} (UID: ${user.uid})`);
        try {
            await db.collection('users').doc(user.uid).delete();
            await auth.deleteUser(user.uid);
            console.log(`✅ Deleted ${user.email}`);
        } catch (error) {
            console.error(`❌ Error deleting ${user.email}:`, error);
        }
    }

    console.log('Cleanup complete.');
}

clean().catch(console.error);
