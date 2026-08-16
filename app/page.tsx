'use client';

import { login } from '@/app/actions/auth';
import { useActionState } from 'react';

export default function Login() {
    const [state, action, pending] = useActionState(login, undefined);

    return (
        <form action={action} className="w-full h-screen grid place-items-center">
            <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
                <legend className="fieldset-legend">Login</legend>

                {/* Pesan Kesalahan Kredensial Umum */}
                {state?.message && (
                    <div className="alert alert-error text-sm p-2 mb-2">
                        <span>{state.message}</span>
                    </div>
                )}

                <label className="label">Username</label>
                <input
                    type="text"
                    className={`input ${state?.errors?.username ? 'input-error' : ''}`}
                    name="username"
                    placeholder="Username"
                />
                {state?.errors?.username && (
                    <p className="text-error text-xs mt-1">{state.errors.username[0]}</p>
                )}

                <label className="label mt-2">Password</label>
                <input
                    type="password"
                    className={`input ${state?.errors?.password ? 'input-error' : ''}`}
                    name="password"
                    placeholder="Password"
                />
                {state?.errors?.password && (
                    <ul className="text-error text-xs mt-1 list-disc list-inside">
                        {state.errors.password.map((err) => (
                            <li key={err}>{err}</li>
                        ))}
                    </ul>
                )}

                <button type="submit" disabled={pending} className="btn btn-neutral mt-4">
                    {pending ? 'Logging in...' : 'Login'}
                </button>
            </fieldset>
        </form>
    );
}
