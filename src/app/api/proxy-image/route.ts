
import { NextRequest, NextResponse } from 'next/server';

async function handleProxy(url: string | null | undefined) {
    if (!url || typeof url !== 'string' || !url.trim()) {
        return new NextResponse('Missing or invalid URL', { status: 400 });
    }

    const trimmedUrl = url.trim();

    // If it's a data URL, we don't need proxying, but return bad request rather than failing fetch
    if (trimmedUrl.startsWith('data:')) {
        return new NextResponse('Data URLs do not require proxying', { status: 400 });
    }

    try {
        const response = await fetch(trimmedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/*,*/*'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const headers = new Headers();
        headers.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type');

        return new NextResponse(blob, { headers });
    } catch (error) {
        console.error('Proxy error fetching image:', trimmedUrl, error);
        return new NextResponse('Error fetching image', { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');
    return handleProxy(url);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        return handleProxy(body?.url);
    } catch {
        return new NextResponse('Invalid JSON body', { status: 400 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
