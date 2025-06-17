// server/api/clear-fingerprints.post.ts
import { getFingerprintCollection } from '~/server/api/db';

export default defineEventHandler(async () => {
    const fingerprintCollection = await getFingerprintCollection();
    if (!fingerprintCollection) {
        throw createError({
            statusCode: 500,
            statusMessage: "MongoDB fingerprint collection not available."
        });
    }

    try {
        const result = await fingerprintCollection.deleteMany({});
        console.log(`Cleared ${result.deletedCount} fingerprints from the database.`);
        return { success: true, deletedCount: result.deletedCount, message: "All fingerprints cleared." };
    } catch (error: any) {
        console.error(`Error clearing fingerprints: ${error.message}`);
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to clear fingerprints.'
        });
    }
});
