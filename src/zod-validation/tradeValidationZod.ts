import * as z from 'zod';
const data = z.object({
    data: z.string(),
});

const zodMessage = z.object({
    id: z.string(),
    message: data
});

const zodMessages = z.array(zodMessage);
const zodObject = z.object({
    name: z.string(),
    messages: zodMessages
});

const tradeValidationZod = z.array(zodObject);
export default tradeValidationZod;
