// server/api/add-fingerprint.post.ts
import { addFingerprint, currentMode } from '~/server/api/db'; // Ensure currentMode is imported

export default defineEventHandler(async (event) => {
    console.log('[BACKEND] add-fingerprint: Route hit. Current server mode from db:', currentMode); // Added log
    if (currentMode !== 'calibrating') {
        throw createError({
            statusCode: 403,
            statusMessage: 'Fingerprints can only be added in "calibrating" mode.'
        });
    }

    const body = await readBody(event);
    const { x, y } = body;

    if (typeof x !== 'number' || typeof y !== 'number') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid coordinates provided. x and y must be numbers.'
        });
    }

    const success = await addFingerprint(x, y);

    if (success) {
        return { success: true, message: `Fingerprint recorded at (${x},${y}).` };
    } else {
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to record fingerprint.'
        });
    }
});