
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { orgId, jobId, type, input } = body;

        if (!orgId || !jobId || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Configuration
        // Use 127.0.0.1 instead of localhost to avoid Node 18+ IPv6 resolution issues
        const WORKER_URL = process.env.PYTHON_WORKER_URL || "http://127.0.0.1:8000";
        const WORKER_TOKEN = process.env.PY_WORKER_TOKEN || "dev-token";

        console.log(`[API] Proxying Job ${jobId} to Worker at ${WORKER_URL}`);

        // Forward to Python Worker
        const res = await fetch(`${WORKER_URL}/v1/jobs/run`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${WORKER_TOKEN}`
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[API] Worker Error ${res.status}: ${errText}`);
            return NextResponse.json({ error: "Worker failed to accept job", details: errText }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("[API] Proxy Error:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
