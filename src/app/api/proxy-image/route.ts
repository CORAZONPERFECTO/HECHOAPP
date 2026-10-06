import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAllowedImageUrl } from '@/lib/server-auth';

// Tope de tamaño para que el proxy no sirva de relay de archivos grandes.
const MAX_PROXY_BYTES = 15 * 1024 * 1024;

async function handleProxy(req: NextRequest, url: string | null | undefined) {
    const authz = await requireAuth(req);
    if (!authz.ok) return authz.response;

    if (!url || typeof url !== 'string' || !url.trim()) {
        return new NextResponse('Missing or invalid URL', { status: 400 });
    }

    const trimmedUrl = url.trim();

    // Solo hosts de almacenamiento propios: evita SSRF hacia servicios internos / metadatos.
    if (!isAllowedImageUrl(trimmedUrl)) {
        return new NextResponse('URL not allowed', { status: 400 });
    }

    try {
        // redirect: 'error' impide saltar a un host no permitido vía redirección.
        const response = await fetch(trimmedUrl, {
            redirect: 'error',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/*,*/*'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('Content-Type') || 'image/jpeg';
        if (!contentType.startsWith('image/')) {
            return new NextResponse('Only images are allowed', { status: 415 });
        }

        const blob = await response.blob();
        if (blob.size > MAX_PROXY_BYTES) {
            return new NextResponse('Image too large', { status: 413 });
        }

        const headers = new Headers();
        headers.set('Content-Type', contentType);
        // private: contenido autenticado, no debe cachearse en CDNs compartidos.
        headers.set('Cache-Control', 'private, max-age=3600');

        return new NextResponse(blob, { headers });
    } catch (error) {
        console.error('Proxy error fetching image:', trimmedUrl, error);
        return new NextResponse('Error fetching image', { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');
    return handleProxy(request, url);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        return handleProxy(request, body?.url);
    } catch {
        return new NextResponse('Invalid JSON body', { status: 400 });
    }
}
