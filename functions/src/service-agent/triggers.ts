import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

// 1. Evidence Created -> Draft Quote
export const onEvidenceCreated = functions.firestore
    .document('orgs/{orgId}/tickets/{ticketId}/evidence/{evidenceId}')
    .onCreate(async (snap, context) => {
        const { orgId, ticketId } = context.params;
        const evidenceData = snap.data();

        console.log(`Evidence created for Ticket ${ticketId}:`, evidenceData.type);

        // A. Logic to determine if we should Auto-Draft
        // For now, if "DIAGNOSIS" evidence is uploaded, we trigger the "Draft Agent"
        const ticketRef = db.doc(`orgs/${orgId}/tickets/${ticketId}`);
        const ticketSnap = await ticketRef.get();
        const ticket = ticketSnap.data();

        if (ticket && (ticket.serviceStatus === 'DIAGNOSIS_IN_PROGRESS' || ticket.serviceStatus === 'ON_SITE')) {
            // Update Status to EVIDENCE_READY
            await ticketRef.update({
                serviceStatus: 'EVIDENCE_READY',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Trigger Agent for Drafting
            // (In real app, we'd queue a Cloud Task or pubsub)
            await db.collection(`orgs/${orgId}/agentRuns`).add({
                ticketId,
                trigger: 'EVIDENCE_UPLOADED',
                status: 'RUNNING',
                startedAt: admin.firestore.FieldValue.serverTimestamp(),
                logs: [`Evidence ${snap.id} triggered Draft Quote run`]
            });

            // Audit
            await db.collection(`orgs/${orgId}/auditLogs`).add({
                ticketId,
                action: 'EVIDENCE_DETECTED',
                actorId: 'SYSTEM_TRIGGER',
                details: `Evidence ${snap.id} created`,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    });

// 2. Approval Updated -> Send to Client (if Approved)
export const onApprovalUpdated = functions.firestore
    .document('orgs/{orgId}/tickets/{ticketId}/approvals/{approvalId}')
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();

        // Check for transition to APPROVED
        if (newValue.status === 'APPROVED' && previousValue.status !== 'APPROVED') {
            const { orgId, ticketId } = context.params;
            console.log(`Approval ${context.params.approvalId} APPROVED. Generating PDF...`);

            // A. Generate PDF (Mock)
            // const pdfUrl = await generateQuotePDF(newValue.quoteId);
            const pdfUrl = "https://mock.com/quote.pdf"; // Mock

            // B. Update Ticket Status
            await db.doc(`orgs/${orgId}/tickets/${ticketId}`).update({
                serviceStatus: 'QUOTE_SENT',
                currentQuoteUrl: pdfUrl,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // C. Send WhatsApp to Client
            // await sendWhatsAppMessage(ticket.clientPhone, "Su cotización está lista: " + pdfUrl);
            await db.collection(`orgs/${orgId}/agentRuns`).add({
                ticketId,
                trigger: 'APPROVAL_GRANTED',
                status: 'RUNNING',
                startedAt: admin.firestore.FieldValue.serverTimestamp(),
                logs: [`Approval granted. Sending Quote PDF to client.`]
            });

            // Audit
            await db.collection(`orgs/${orgId}/auditLogs`).add({
                ticketId,
                action: 'QUOTE_APPROVED',
                actorId: 'ADMIN', // Or context auth user if available
                details: `Quote approved in ${context.params.approvalId}`,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

        }
    });

// 3. Payment Created -> PENDING_REVIEW
export const onPaymentCreated = functions.firestore
    .document('orgs/{orgId}/payments/{paymentId}')
    .onCreate(async (snap, context) => {
        const payment = snap.data();
        const { orgId } = context.params;

        // Assuming payment doc has ticketId reference or invoiceId
        // Let's assume ticketId is present for simplified correlation
        if (payment.ticketId) {
            console.log(`Payment created for Ticket ${payment.ticketId}`);

            // Update Ticket Status to PROOF_RECEIVED
            await db.doc(`orgs/${orgId}/tickets/${payment.ticketId}`).update({
                serviceStatus: 'PROOF_RECEIVED',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Trigger Verification Agent (e.g. OCR)
            await db.collection(`orgs/${orgId}/agentRuns`).add({
                ticketId: payment.ticketId,
                trigger: 'PAYMENT_UPLOADED',
                status: 'RUNNING',
                startedAt: admin.firestore.FieldValue.serverTimestamp(),
                logs: [`Payment ${snap.id} uploaded. Starting verification.`]
            });

            // Audit
            await db.collection(`orgs/${orgId}/auditLogs`).add({
                ticketId: payment.ticketId,
                action: 'PAYMENT_RECEIVED',
                actorId: 'CLIENT',
                details: `Payment uploaded: ${snap.id}`,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    });
