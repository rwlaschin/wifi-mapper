// server/api/toggle-scan.post.ts
import { setMode, currentMode } from '~/server/api/db';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { enable } = body; // Expects a boolean: true to enable, false to disable

    // Determine the new mode based on 'enable'
    // If enable is true, we want to go into 'tracking' mode
    // If enable is false, we want to go into 'idle' mode
    const newMode = enable ? 'tracking' : 'idle';

    setMode(newMode); // Update the global mode state in db.ts

    return {
        success: true,
        scanning_active: currentMode === 'tracking', // Confirm the new state
        current_mode: currentMode // Also return the current mode
    };
});
