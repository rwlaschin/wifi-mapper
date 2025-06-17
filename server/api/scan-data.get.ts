// server/api/scan-data.get.ts
import { getScanCollection, currentPosition } from '~/server/api/db'; // Import MongoDB collection and current position

export default defineEventHandler(async () => {
    const scanCollection = await getScanCollection();
    if (scanCollection) {
        try {
            // Find the latest scan entry for the current position
            const latestScan: any = await scanCollection.findOne(
                { x: currentPosition.x, y: currentPosition.y },
                { sort: { timestamp: -1 } } // Sort by timestamp descending
            );
            if (latestScan) {
                // Convert ObjectId to string for consistent JSON serialization
                latestScan._id = latestScan._id.toString();
                return latestScan;
            } else {
                return { message: "No scan data available for current position." };
            }
        } catch (error: any) {
            console.error(`Error fetching latest scan data: ${error.message}`);
            throw createError({
                statusCode: 500,
                statusMessage: 'Internal server error fetching scan data'
            });
        }
    } else {
        return { message: "MongoDB not connected." };
    }
});
