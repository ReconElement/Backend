import * as z from 'zod';
const loginZodValidation = z.object({
    username: z.string(),
    password: z.string()
});

export default loginZodValidation;