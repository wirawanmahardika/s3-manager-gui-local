import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    const username = Bun.env.USERNAME;
    const password = Bun.env.PASSWORD;

    const body = await request.json();
    if (body.username !== username) return new Response('Invalid kredensial', { status: 401 });
    if (body.password !== password) return new Response('Invalid kredensial', { status: 401 });
    return new Response('Berhasil login', { status: 200 });
}
