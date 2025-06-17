// server/api/map-data.get.ts
import { getScanCollection } from '~/server/api/db'; // Import MongoDB collection

export default defineEventHandler(async () => {
    const scanCollection = await getScanCollection();
    if (scanCollection) {
        try {
            // Aggregate to get the latest scan for each unique (x,y) coordinate
            const pipeline = [
                // Sort by timestamp descending to ensure $first gets the latest
                { $sort: { timestamp: -1 } },
                // Group by coordinates and take the first (latest) fields
                {
                    $group: {
                        _id: { x: "$x", y: "$y" },
                        latest_scan_id: { $first: "$_id" }, // Store the ID of the latest document
                        networks: { $first: "$networks" },
                        device_mac: { $first: "$device_mac" },
                        timestamp: { $first: "$timestamp" }
                    }
                },
                // Project to reshape the output and include _id components
                {
                    $project: {
                        _id: 0, // Exclude default _id from group
                        x: "$_id.x",
                        y: "$_id.y",
                        networks: "$networks",
                        device_mac: "$device_mac",
                        timestamp: "$timestamp"
                    }
                }
            ];
            const mapRecords = await scanCollection.aggregate(pipeline).toArray();
            return mapRecords;
        } catch (error: any) {
            console.error(`Error fetching map data: ${error.message}`);
            throw createError({
                statusCode: 500,
                statusMessage: 'Internal server error fetching map data'
            });
        }
    } else {
        return { message: "MongoDB not connected." };
    }
});
