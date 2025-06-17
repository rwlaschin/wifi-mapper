// server/api/current-position.get.ts
import { currentPosition } from '~/server/api/db';

export default defineEventHandler(() => {
    return { x: currentPosition.x, y: currentPosition.y };
});
