"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappWebhook = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();
exports.whatsappWebhook = functions.https.onRequest(async (req, res) => {
    // 1. Verification Request (GET)
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'nexus-verification-token';
        if (mode && token) {
            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                console.log('WEBHOOK_VERIFIED');
                res.status(200).send(challenge);
            }
            else {
                res.sendStatus(403);
            }
        }
        else {
            res.sendStatus(404); // Should likely be 400 or 404
        }
        return;
    }
    // 2. Event Notification (POST)
    if (req.method === 'POST') {
        try {
            const body = req.body;
            console.log('Incoming Webhook:', JSON.stringify(body, null, 2));
            // Check if this is a message
            if (body.object === 'whatsapp_business_account') {
                for (const entry of body.entry) {
                    for (const change of entry.changes) {
                        if (change.value.messages) {
                            for (const message of change.value.messages) {
                                await handleIncomingMessage(message, change.value.metadata);
                            }
                        }
                    }
                }
            }
            res.sendStatus(200);
        }
        catch (error) {
            console.error('Error processing webhook:', error);
            res.sendStatus(500);
        }
        return;
    }
    res.sendStatus(405); // Method not allowed
});
async function handleIncomingMessage(message, metadata) {
    var _a;
    const from = message.from; // Phone number
    const textBody = ((_a = message.text) === null || _a === void 0 ? void 0 : _a.body) || '';
    const messageType = message.type;
    // const phoneId = metadata.phone_number_id;
    // A. Resolve Conversation by Phone Number
    // Simple resolution: Find active conversation for this phone
    // In production, we might need a more robust lookup including OrgId validation
    // const conversationsRef = db.collection('conversations'); // Global or Org-specific?
    // For MVP, assuming global conversations or root collection search is okay.
    // Ideally: /orgs/{orgId}/conversations
    // But we don't know OrgId from just phone number easily unless mapped.
    // LETS ASSUME A 'contacts' collection map phone->orgId
    // For this implementation, I'll search across all active tickets to find one associated with this phone? No, that's expensive.
    // STRATEGY: 
    // 1. Look for an active conversation doc with participant.phone == from
    // 2. If not found, ignore or auto-reply "Not registered".
    // Using a Collection Group query for 'conversations' might be needed if they are deep in orgs
    // But for MVP let's assume `root/conversations` for now as per "Schema Strategy" note in plan?
    // Plan said `/orgs/{orgId}/conversations`. 
    // To solve this: we need a fast lookup `phone_index/{phoneNumber}` -> { orgId, userId }
    // FALLBACK FOR DEMO: query collectionGroup 'conversations' where 'participants_phones' array-contains from
    // Requires index.
    const snapshot = await db.collectionGroup('conversations')
        .where('status', '==', 'ACTIVE')
        .where('participantPhones', 'array-contains', from)
        .limit(1)
        .get();
    if (snapshot.empty) {
        console.log(`No active conversation found for ${from}`);
        return;
    }
    const conversationDoc = snapshot.docs[0];
    const conversationData = conversationDoc.data();
    // const conversationId = conversationDoc.id;
    const ticketId = conversationData.ticketId;
    // B. Save Message
    const newMessage = {
        role: 'USER',
        content: textBody,
        type: messageType,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        whatsappId: message.id,
        metadata: message
    };
    await conversationDoc.ref.collection('messages').add(newMessage);
    // C. Trigger Agent Run
    // We create a generic 'agentRuns' doc to cue the background worker
    // Or we could trigger it directly if simple.
    // Let's create an 'agentRun' request.
    await db.collection(`orgs/${conversationData.orgId}/agentRuns`).add({
        ticketId: ticketId,
        trigger: 'WEBHOOK',
        status: 'RUNNING',
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        logs: [`Received message from ${from}`],
        context: {
            lastMessageId: message.id,
            text: textBody
        }
    });
    // D. Audit Log
    try {
        await db.collection(`orgs/${conversationData.orgId}/auditLogs`).add({
            ticketId: ticketId,
            action: 'MESSAGE_RECEIVED',
            actorId: 'WHATSAPP_USER',
            details: `Message from ${from}`,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            metadata: {
                messageType,
                textLength: textBody.length
            }
        });
    }
    catch (e) {
        console.warn("Failed to write audit log:", e);
    }
}
//# sourceMappingURL=webhook.js.map