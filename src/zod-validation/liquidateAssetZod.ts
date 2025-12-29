import * as z from 'zod';
const liquidateAssetZod = z.object({
    id: z.uuid(),
    quantity: z.number()
});

export default liquidateAssetZod;
