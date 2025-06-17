// server/api/status.get.ts
import { currentMode, getScanCollection } from '~/server/api/db'; // Import only what's needed

export default defineEventHandler(async () => {
    let mongoConnected = false;
    try {
        // Attempt to get a collection. If it succeeds, MongoDB is connected.
        // If initMongo() within getScanCollection() throws, it means connection failed.
        const collection = await getScanCollection();
        mongoConnected = !!collection; // True if a collection instance is returned
    } catch (error) {
        console.error("Error checking MongoDB connection status:", error);
        mongoConnected = false;
    }
    
    return {
        scanning_active: currentMode === 'tracking', // Reflects if tracking mode is active
        mongo_connected: mongoConnected,
        current_mode: currentMode // Expose the current mode for the frontend
    };
});
