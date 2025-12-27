import * as z from 'zod';
const liquidateAssetZod = z.object({
    id: z.uuid()
});

export default liquidateAssetZod;
