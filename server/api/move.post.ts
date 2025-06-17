// server/api/move.post.ts
import { currentPosition, setCurrentPosition } from '~/server/api/db'; // Import shared state/functions

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { x, y } = body;

    if (x !== undefined && y !== undefined) {
        setCurrentPosition(x, y); // Update the global current position
        console.log(`Moved to (${currentPosition.x},${currentPosition.y}) via API`);
        return currentPosition;
    } else {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid coordinates'
        });
    }
});
