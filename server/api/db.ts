// server/api/db.ts
import { MongoClient, Db, Collection } from 'mongodb';
import { exec } from 'child_process';
import { parseWifiInfo } from '~/utils/wifiParser'; // Import the parser utility

// --- MongoDB Configuration ---
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/"; // Fallback for safety

const DB_NAME = "wifi_tracker_db";
const SCAN_COLLECTION_NAME = "scan_data";
const FINGERPRINT_COLLECTION_NAME = "fingerprints"; // New collection for calibration data

// These are no longer exported directly
let mongoClient: MongoClient | null = null;
let dbInstance: Db | null = null;
let scanCollectionInstance: Collection | null = null;
let fingerprintCollectionInstance: Collection | null = null; // New collection instance

/**
 * Initializes the MongoDB client and connects to the database.
 * This function should be called once when the server starts, and can be awaited
 * by other functions to ensure the connection is ready.
 */
export const initMongo = async () => {
    try {
        if (!mongoClient) {
            mongoClient = new MongoClient(MONGO_URI);
            await mongoClient.connect();
            dbInstance = mongoClient.db(DB_NAME);
            scanCollectionInstance = dbInstance.collection(SCAN_COLLECTION_NAME);
            fingerprintCollectionInstance = dbInstance.collection(FINGERPRINT_COLLECTION_NAME); // Initialize new collection
            console.log(`Connected to MongoDB: ${MONGO_URI} / ${DB_NAME}`);
        }
    } catch (error: any) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        mongoClient = null; // Ensure client is null if connection fails
        dbInstance = null;
        scanCollectionInstance = null;
        fingerprintCollectionInstance = null;
        // Propagate the error so calling functions can handle connection failure
        throw new Error(`Failed to connect to MongoDB: ${error.message}`);
    }
};

/**
 * Returns the MongoDB collection for scan data, ensuring connection is initialized.
 * @returns Promise<Collection | null> The MongoDB collection or null if connection fails.
 */
export const getScanCollection = async (): Promise<Collection | null> => {
    // If mongoClient is not initialized, try to initialize it.
    // This will implicitly handle connection and populate scanCollectionInstance.
    if (!mongoClient) {
        await initMongo();
    }
    return scanCollectionInstance;
};

/**
 * Returns the MongoDB collection for fingerprints, ensuring connection is initialized.
 * @returns Promise<Collection | null> The MongoDB collection or null if connection fails.
 */
export const getFingerprintCollection = async (): Promise<Collection | null> => {
    // If mongoClient is not initialized, try to initialize it.
    // This will implicitly handle connection and populate fingerprintCollectionInstance.
    if (!mongoClient) {
        await initMongo();
    }
    return fingerprintCollectionInstance;
};

// --- Global State for Scanning and Tracking ---
export let currentPosition = { x: 0, y: 0 }; // Current estimated position
export let currentMode: 'idle' | 'calibrating' | 'tracking' = 'idle'; // New mode state
const SCAN_INTERVAL_SECONDS = 5;
let scanIntervalId: NodeJS.Timeout | null = null;

/**
 * Sets the current estimated position of the user.
 * This will now primarily be set by the localization algorithm.
 */
export const setCurrentPosition = (x: number, y: number) => {
    currentPosition.x = x;
    currentPosition.y = y;
};

/**
 * Sets the current operating mode of the application.
 */
export const setMode = (mode: 'idle' | 'calibrating' | 'tracking') => {
    currentMode = mode;
    console.log(`Application mode set to: ${currentMode}`);
    if (currentMode !== 'tracking') {
        // If not tracking, stop any ongoing automatic scanning
        stopWifiScanner();
    } else {
        // If switching to tracking, ensure scanner is running for localization
        startWifiScanner();
    }
};


// --- Fingerprinting / Localization Logic ---

/**
 * Records a new fingerprint at a given (x,y) coordinate.
 */
export const addFingerprint = async (x: number, y: number): Promise<boolean> => {
    const fingerprintCollection = await getFingerprintCollection(); // Awaits initMongo internally if needed
    if (!fingerprintCollection) {
        console.error("Cannot add fingerprint: MongoDB fingerprint collection not available after init.");
        return false;
    }

    try {
        const process = await new Promise<any>((resolve, reject) => {
            exec('system_profiler SPAirPortDataType', (error, stdout, stderr) => {
                if (error) reject(error);
                else resolve({ stdout, stderr });
            });
        });

        const scanData = parseWifiInfo(process.stdout);
        const fingerprint = {
            x,
            y,
            timestamp: new Date(),
            networks: scanData.networks.filter(net => net.rssi !== null) // Only store networks with valid RSSI
        };
        await fingerprintCollection.insertOne(fingerprint);
        console.log(`Fingerprint recorded at (${x},${y}) with ${fingerprint.networks.length} networks.`);
        return true;
    } catch (error: any) {
        console.error(`Error recording fingerprint: ${error.message}`);
        return false;
    }
};

/**
 * Calculates Euclidean distance between two Wi-Fi signatures (SSID -> RSSI maps).
 * Only considers SSIDs present in BOTH signatures to ensure a fair comparison.
 */
const calculateDistance = (scan1: { name: string; rssi: number }[], scan2: { name: string; rssi: number }[]): number => {
    let distance = 0;
    const scan1Map = new Map(scan1.map(n => [n.name, n.rssi]));
    const scan2Map = new Map(scan2.map(n => [n.name, n.rssi]));

    const allSsids = new Set([...scan1Map.keys(), ...scan2Map.keys()]);

    for (const ssid of allSsids) {
        const rssi1 = scan1Map.has(ssid) ? scan1Map.get(ssid)! : -100; // Assume -100 dBm if not present
        const rssi2 = scan2Map.has(ssid) ? scan2Map.get(ssid)! : -100;

        distance += Math.pow(rssi1 - rssi2, 2);
    }
    return Math.sqrt(distance);
};


/**
 * Localizes the current position based on the latest Wi-Fi scan and stored fingerprints (K-Nearest Neighbors).
 */
const localizePosition = async (): Promise<{ x: number; y: number } | null> => {
    const fingerprintCollection = await getFingerprintCollection(); // Awaits initMongo internally if needed
    if (!fingerprintCollection) {
        console.error("Cannot localize position: MongoDB fingerprint collection not available after init.");
        return null;
    }

    const scanCollection = await getScanCollection(); // Awaits initMongo internally if needed
    if (!scanCollection) {
        console.error("Cannot localize position: MongoDB scan collection not available after init.");
        return null;
    }

    let latestScanNetworks: { name: string; rssi: number }[] | null = null;
    try {
        const process = await new Promise<any>((resolve, reject) => {
            exec('system_profiler SPAirPortDataType', (error, stdout, stderr) => {
                if (error) reject(error);
                else resolve({ stdout, stderr });
            });
        });
        const currentScanData = parseWifiInfo(process.stdout);
        latestScanNetworks = currentScanData.networks.filter(net => net.rssi !== null);

        // Optionally, save this current scan to scan_data collection for historical tracking
        await scanCollection.insertOne({
            timestamp: new Date(),
            x: currentPosition.x, // Store with the currently estimated position (will be updated shortly)
            y: currentPosition.y,
            networks: latestScanNetworks,
            device_mac: currentScanData.device_mac
        });

    } catch (error: any) {
        console.error(`Error getting latest Wi-Fi scan for localization: ${error.message}`);
        return null;
    }

    if (!latestScanNetworks || latestScanNetworks.length === 0) {
        console.warn("No Wi-Fi networks detected for localization.");
        return null;
    }

    const fingerprints = await fingerprintCollection.find({}).toArray();

    if (fingerprints.length === 0) {
        console.warn("No fingerprints recorded. Please calibrate first.");
        return null;
    }

    // Calculate distances to all fingerprints
    const distances = fingerprints.map(fp => ({
        x: fp.x,
        y: fp.y,
        distance: calculateDistance(latestScanNetworks!, fp.networks)
    }));

    // Sort by distance and take the K-nearest neighbors (e.g., K=3)
    const K = 3; // Number of nearest neighbors to consider
    const nearestNeighbors = distances.sort((a, b) => a.distance - b.distance).slice(0, K);

    if (nearestNeighbors.length === 0) {
        console.warn("No nearest neighbors found for localization.");
        return null;
    }

    // Simple centroid (average) of the K-nearest neighbors for the estimated position
    let estimatedX = 0;
    let estimatedY = 0;
    let totalWeight = 0; // Using inverse distance as weight (closer is higher weight)

    for (const neighbor of nearestNeighbors) {
        const weight = 1 / (neighbor.distance + 0.01); // Add small epsilon to avoid division by zero
        estimatedX += neighbor.x * weight;
        estimatedY += neighbor.y * weight;
        totalWeight += weight;
    }

    const newX = totalWeight > 0 ? Math.round(estimatedX / totalWeight) : currentPosition.x;
    const newY = totalWeight > 0 ? Math.round(estimatedY / totalWeight) : currentPosition.y;

    return { x: newX, y: newY };
};


/**
 * Core scanning function that runs in a background interval.
 * Its behavior depends on the currentMode.
 */
export const startWifiScanner = () => {
    if (scanIntervalId) {
        clearInterval(scanIntervalId); // Clear any existing interval
    }

    scanIntervalId = setInterval(async () => {
        if (currentMode === 'tracking') {
            console.log("Tracking mode: Localizing position...");
            const estimatedPosition = await localizePosition();
            if (estimatedPosition) {
                setCurrentPosition(estimatedPosition.x, estimatedPosition.y);
                console.log(`Estimated position: (${currentPosition.x},${currentPosition.y})`);
            } else {
                console.warn("Could not estimate position in tracking mode.");
            }
        } else if (currentMode === 'calibrating') {
            // In calibrating mode, we don't automatically record fingerprints in interval.
            // Fingerprints are recorded via a specific API call from the frontend.
            console.log("Calibrating mode: Waiting for explicit fingerprint record request.");
        } else {
            console.log("Idle mode: Scanner is active but not performing localization or calibration.");
        }

        // Always perform a scan to update scan_data for current location if idle/calibrating
        // (This maintains the general scan_data history which is separate from localization)
        if (currentMode !== 'tracking') {
            const scanCollection = await getScanCollection(); // Awaits initMongo internally if needed
            if (scanCollection) {
                exec('system_profiler SPAirPortDataType', async (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error executing system_profiler for idle/calibrating scan: ${error.message}`);
                        return;
                    }
                    try {
                        const scanData = parseWifiInfo(stdout);
                        await scanCollection.insertOne({
                            timestamp: new Date(),
                            x: currentPosition.x, // Store with the currently set manual position
                            y: currentPosition.y,
                            networks: scanData.networks,
                            device_mac: scanData.device_mac
                        });
                        // console.log(`Idle/Calibrating mode: Scan data saved at (${currentPosition.x},${currentPosition.y}).`);
                    } catch (parseError: any) {
                        console.error(`Error parsing or saving idle/calibrating scan data: ${parseError.message}`);
                    }
                });
            }
        }

    }, SCAN_INTERVAL_SECONDS * 1000); // Scan every 5 seconds
    console.log("Wi-Fi scanner interval started.");
};


/**
 * Stops the background Wi-Fi scanning interval.
 */
export const stopWifiScanner = () => {
    if (scanIntervalId) {
        clearInterval(scanIntervalId);
        scanIntervalId = null;
        console.log("Wi-Fi scanning interval stopped.");
    }
};

// Immediately initialize MongoDB when this module is loaded (server startup)
// And start scanner in idle mode initially
initMongo().then(() => {
    startWifiScanner(); // Start the background scanner immediately in idle mode
}).catch(console.error);

// Add a hook to stop scanner when Nuxt server is closing
process.on('exit', () => {
    stopWifiScanner();
    // No direct mongoClient.close() here; rely on process exit handling or initMongo cleanup
});

// For graceful shutdown in development (e.g., Ctrl+C)
process.on('SIGINT', () => {
    stopWifiScanner();
    // No direct mongoClient.close() here; rely on process exit handling or initMongo cleanup
    process.exit(0); // Exit process after cleanup
});
