'use server';
import { LoginSchema, FormState } from '@/app/lib/definitions';
import { createSession } from '../lib/session';
import { redirect } from 'next/navigation';

export async function login(_: FormState, formData: FormData) {
    const validatedFields = LoginSchema.safeParse({
        username: formData.get('username'),
        password: formData.get('password'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    if (validatedFields.data.username !== Bun.env.USERNAME)
        return { message: 'Invalid Credentials' };
    if (validatedFields.data.password !== Bun.env.PASSWORD)
        return { message: 'Invalid Credentials' };

    await createSession();
    return redirect('/dashboard');
}
