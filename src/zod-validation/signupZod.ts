import * as z from 'zod';
const signupZodValidation = z.object({
    firstname: z.string(),
    lastname: z.string(),
    email: z.email(),
    username: z.string(),
    password: z.string()
});

export default signupZodValidation;


