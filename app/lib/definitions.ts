import * as z from 'zod';

export const LoginSchema = z.object({
    username: z.string().min(2, { error: 'Name must be at least 2 characters long.' }).trim(),
    password: z
        .string()
        .min(6, { error: 'Be at least 6 characters long' })
        .regex(/[a-zA-Z]/, { error: 'Contain at least one letter.' })
        .regex(/[0-9]/, { error: 'Contain at least one number.' })
        // .regex(/[^a-zA-Z0-9]/, { error: 'Contain at least one special character.' })
        .trim(),
});

export type FormState =
    | {
          errors?: {
              username?: string[];
              password?: string[];
          };
          message?: string;
      }
    | undefined;

export type SessionPayload = {
    id: string;
    expiresAt: number;
};
