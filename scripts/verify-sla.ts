
import { calculateSLAStatus } from "../src/lib/service-state-machine";
import { ServiceTicket } from "../src/types/service";
import { Timestamp } from "firebase/firestore";

function mockTicket(hoursAgo: number, slaHours: number, status: any = 'CREATED'): ServiceTicket {
    const now = Date.now();
    const createdMillis = now - (hoursAgo * 60 * 60 * 1000);

    return {
        id: "test_ticket",
        ticketId: "T-123",
        serviceStatus: status,
        createdAt: Timestamp.fromMillis(createdMillis),
        slaResolutionTimeHours: slaHours,
        // ... (other required fields mock)
        title: "Test",
        description: "Test",
        status: "OPEN",
        priority: "MEDIUM",
        createdByUserId: "user1",
        locationId: "loc1"
    } as any as ServiceTicket;
}

function verifySLA() {
    console.log("🚀 Starting SLA Logic Verification...");

    // 1. Test ON_TRACK (Created 1 hour ago, SLA 24h)
    const t1 = mockTicket(1, 24);
    const s1 = calculateSLAStatus(t1);
    console.log(`[ON_TRACK Check] Expected: ON_TRACK, Got: ${s1}`);
    if (s1 !== 'ON_TRACK') throw new Error("Failed ON_TRACK check");

    // 2. Test AT_RISK (Created 20 hours ago, SLA 24h. Remaining 4h < 20% of 24h? 20% is 4.8h. Yes.)
    const t2 = mockTicket(20, 24);
    const s2 = calculateSLAStatus(t2);
    console.log(`[AT_RISK Check] Expected: AT_RISK, Got: ${s2}`);
    if (s2 !== 'AT_RISK') throw new Error("Failed AT_RISK check");

    // 3. Test BREACHED (Created 25 hours ago, SLA 24h)
    const t3 = mockTicket(25, 24);
    const s3 = calculateSLAStatus(t3);
    console.log(`[BREACHED Check] Expected: BREACHED, Got: ${s3}`);
    if (s3 !== 'BREACHED') throw new Error("Failed BREACHED check");

    // 4. Test CLOSED (Success) (Created 10h ago, Closed 1 hour later (9h ago). SLA 24h)
    const t4 = mockTicket(10, 24, 'CLOSED');
    // We need to inject resolvedAt
    (t4 as any).resolvedAt = Timestamp.fromMillis(t4.createdAt.toMillis() + (1 * 60 * 60 * 1000));
    const s4 = calculateSLAStatus(t4);
    console.log(`[CLOSED Success Check] Expected: ON_TRACK, Got: ${s4}`);
    if (s4 !== 'ON_TRACK') throw new Error("Failed CLOSED Success check");

    console.log("🎉 ALL SLA TESTS PASSED");
}

verifySLA();
