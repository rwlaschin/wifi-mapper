// server/api/mode.post.ts
import { setMode, currentMode } from '~/server/api/db';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { mode } = body;
    console.log('[BACKEND] mode.post: Route hit. Received mode payload:', mode); // Added log
    if (!['idle', 'calibrating', 'tracking'].includes(mode)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid mode provided. Must be idle, calibrating, or tracking.'
        });
    }

    setMode(mode); // Update the global mode state

    return { success: true, newMode: currentMode };
});