<template>
    <div class="max-w-6xl mx-auto p-6">
        <UCard class="mb-8 bg-gray-800 text-white">
            <template #header>
                <h1 class="text-4xl font-bold text-center text-blue-300">
                    Automated Wi-Fi Signal Mapper
                </h1>
            </template>
        </UCard>

        <!-- Global Status and Controls -->
        <UCard class="mb-8 bg-gray-800 text-white">
            <template #header>
                <h2 class="text-2xl font-semibold text-gray-100">Application Status & Mode</h2>
            </template>
            <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                <div class="flex-1">
                    <p class="text-lg font-semibold text-gray-200 mb-2">
                        Backend Status:
                        <span :class="mongoConnected ? 'text-green-400' : 'text-red-400'">
                            {{ mongoConnected ? 'Connected to MongoDB' : 'MongoDB Disconnected (Please check backend)'
                            }}
                        </span>
                    </p>
                    <p class="text-lg font-semibold text-gray-200">
                        Current Mode:
                        <span class="font-bold text-blue-400">
                            {{ appMode.toUpperCase() }}
                        </span>
                    </p>
                </div>
                <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <UButton color="secondary" variant="solid" size="lg" class="w-full justify-center"
                        :disabled="appMode === 'calibrating'" @click="setAppMode('calibrating')">
                        <span v-if="appMode === 'calibrating'">In Calibration Mode</span>
                        <span v-else>Enter Calibration Mode</span>
                    </UButton>
                    <UButton color="primary" variant="solid" size="lg" class="w-full justify-center"
                        :disabled="appMode === 'tracking'" @click="setAppMode('tracking')">
                        <span v-if="appMode === 'tracking'">In Tracking Mode</span>
                        <span v-else>Start Auto-Tracking</span>
                    </UButton>
                    <UButton color="secondary" variant="outline" size="lg" class="w-full justify-center"
                        :disabled="appMode === 'idle'" @click="setAppMode('idle')">
                        Stop All Activities
                    </UButton>
                </div>
            </div>
        </UCard>

        <!-- Calibration Mode Controls -->
        <UCard v-if="appMode === 'calibrating'" class="mb-8 bg-gray-800 text-white border-blue-600 border-2">
            <template #header>
                <div class="flex justify-between items-center w-full">
                    <h2 class="text-2xl font-semibold text-blue-300">Calibration Mode (Record Fingerprints)</h2>
                    <UModal v-model:open="isConfirmClearAllFingerprintsModalOpen">
                        <!-- Clear All Fingerprints Icon Button -->
                        <UButton icon="i-heroicons-trash-20-solid" color="red" variant="ghost" size="md" square
                            @click="isConfirmClearAllFingerprintsModalOpen = true" :disabled="!mongoConnected"
                            v-tooltip.left="'Clear All Fingerprints'" />
                        <template #content>
                            <UCard>
                                <template #header>
                                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Confirm Clear All
                                        Fingerprints</h3>
                                </template>
                                <p class="text-gray-700 dark:text-gray-300 mb-4">
                                    Are you sure you want to clear ALL recorded fingerprints? This cannot be undone.
                                </p>
                                <div class="flex justify-end gap-3">
                                    <UButton color="neutral" variant="solid"
                                        @click="isConfirmClearAllFingerprintsModalOpen = false">
                                        Cancel
                                    </UButton>
                                    <UButton color="secondary" variant="solid" @click="confirmClearAllFingerprints">
                                        Confirm Clear
                                    </UButton>
                                </div>
                            </UCard>
                        </template>
                    </UModal>

                </div>
                <p class="text-gray-300 text-sm mt-1">
                    Move to a known physical location, set its (X,Y) coordinate, and record its Wi-Fi signature. Repeat
                    for multiple points.
                </p>
            </template>
            <div class="flex flex-col md:flex-row items-center gap-4 mb-4">
                <!-- Replaced UFormGroup with div/label, retained UInput -->
                <div class="w-full md:w-1/2 text-gray-200">
                    <label for="calibrateX" class="block text-lg font-medium text-gray-200 mb-1">X Coordinate:</label>
                    <UInput id="calibrateX" v-model.number="calibrateX" type="number" placeholder="0" size="lg"
                        input-class="bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:border-blue-400 focus:ring-blue-400" />
                </div>
                <div class="w-full md:w-1/2 text-gray-200">
                    <label for="calibrateY" class="block text-lg font-medium text-gray-200 mb-1">Y Coordinate:</label>
                    <UInput id="calibrateY" v-model.number="calibrateY" type="number" placeholder="0" size="lg"
                        input-class="bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:border-blue-400 focus:ring-blue-400" />
                </div>
            </div>
            <div class="flex gap-3 mt-4">
                <UButton color="secondary" variant="solid" size="lg" @click="recordFingerprint"
                    class="w-full justify-center" :disabled="!mongoConnected">
                    Record Fingerprint at ({{ calibrateX }},{{ calibrateY }})
                </UButton>
                <!-- Removed the prominent Clear All Fingerprints button here -->
            </div>
            <p class="text-gray-400 text-xs mt-3">
                Please ensure you are physically at ({{ calibrateX }},{{ calibrateY }}) when recording.
                This will collect the current Wi-Fi environment data for this specific point.
            </p>
        </UCard>

        <!-- Tracking Mode Status -->
        <UCard v-if="appMode === 'tracking'" class="mb-8 bg-gray-800 text-white border-green-600 border-2">
            <template #header>
                <h2 class="text-2xl font-semibold text-green-300">Tracking Mode (Auto Localization)</h2>
                <p class="text-gray-300 text-sm mt-1">
                    The application is now automatically estimating your position based on Wi-Fi signals.
                    Walk around with your laptop, and the map will update your estimated (X,Y) in real-time.
                </p>
            </template>
            <div class="text-lg text-gray-200 mb-2">
                Estimated Position: <span class="font-bold text-xl text-green-400">({{ currentX }},{{ currentY
                }})</span>
            </div>
            <p class="text-sm text-gray-400">
                This position is estimated by comparing your current Wi-Fi environment to recorded fingerprints.
            </p>
        </UCard>


        <!-- Proximity Information (Always visible) -->
        <UCard class="mb-8 bg-gray-800 text-white">
            <template #header>
                <h2 class="text-2xl font-semibold text-gray-100">
                    Proximity to "{{ targetSSID || 'Target SSID' }}"
                </h2>
            </template>
            <div class="flex flex-col md:flex-row md:items-start gap-6">
                <div class="flex-1">
                    <!-- Replaced UFormGroup with div/label, retained UInput with corrected icon -->
                    <div class="flex-grow w-full text-gray-200 mb-4">
                        <label for="targetSSIDInput" class="block text-lg font-medium text-gray-200 mb-1">Target
                            SSID:</label>
                        <UInput id="targetSSIDInput" v-model="targetSSID" placeholder="e.g., VC-Staff" size="lg"
                            icon="i-heroicons-wifi" class="text-white"
                            input-class="bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:border-blue-400 focus:ring-blue-400" />
                    </div>
                    <div v-if="targetSSID && currentScanResults[targetSSID]" class="text-lg text-gray-300">
                        <p class="mb-2">
                            <span class="font-semibold">Signal Strength (RSSI):</span>
                            <span class="font-bold text-xl text-blue-400">
                                {{ targetSsidRssi !== null ? `${targetSsidRssi} dBm` : 'N/A' }}
                            </span>
                        </p>
                        <p>
                            <span class="font-semibold">Relative Proximity:</span>
                            <span class="font-bold text-xl text-blue-400">
                                {{ targetSsidProximity }}
                            </span>
                        </p>
                        <p class="text-sm text-gray-400 mt-2">
                            Higher (less negative) RSSI means stronger signal and closer proximity.
                        </p>
                    </div>
                    <p v-else class="text-lg text-gray-300">
                        No data for "{{ targetSSID }}". Please set a target SSID and ensure auto-scanning is active.
                    </p>
                </div>
            </div>
        </UCard>

        <!-- Map Display -->
        <UCard class="bg-gray-800 text-white">
            <template #header>
                <h2 class="text-2xl font-semibold text-gray-100">
                    Relative Wi-Fi Map
                </h2>
            </template>
            <div class="flex justify-center overflow-x-auto">
                <div class="space-y-1 p-2 rounded-lg bg-gray-900 border border-gray-700">
                    <div v-for="y in mapYRange.slice().reverse()" :key="`row-${y}`"
                        class="grid grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-1 auto-cols-fr">
                        <div v-for="x in mapXRange" :key="`cell-${x}-${y}`" :class="`flex flex-col items-center justify-center p-1 border border-gray-700 rounded-md text-center text-sm font-mono aspect-square min-w-[80px] min-h-[80px] bg-gray-900 shadow-sm ${x === currentX && y === currentY ? 'bg-blue-700 ring-2 ring-blue-400 shadow-lg' : ''
                            }`">
                            <template v-if="x === currentX && y === currentY">
                                <span class="font-bold text-blue-200">You ({{ currentX }},{{ currentY }})</span>
                                <span class="text-xs text-gray-300">{{ deviceMacPartial }}</span>
                                <div v-if="mapData[`${x}_${y}`] && mapData[`${x}_${y}`].ssids.length > 0"
                                    class="mt-1 space-y-0.5">
                                    <div v-for="s in mapData[`${x}_${y}`].ssids.filter(s => s.rssi !== null)"
                                        :key="`${s.name}-${s.rssi}-${x}-${y}`" class="text-xs text-white">
                                        <span class="font-semibold">{{ s.name }}</span>: {{ s.rssi }} dBm
                                    </div>
                                </div>
                            </template>
                            <template v-else-if="mapData[`${x}_${y}`] && mapData[`${x}_${y}`].ssids.length > 0">
                                <div class="space-y-0.5">
                                    <div v-for="s in mapData[`${x}_${y}`].ssids.filter(s => s.rssi !== null)"
                                        :key="`${s.name}-${s.rssi}-${x}-${y}`" class="text-xs text-white">
                                        <span class="font-semibold">{{ s.name }}</span>: {{ s.rssi }} dBm
                                    </div>
                                </div>
                            </template>
                            <template v-else>
                                <span class="text-gray-500 text-xs">Empty</span>
                            </template>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-6 p-4 bg-gray-700 rounded-lg border border-gray-600 text-gray-200">
                <h3 class="text-xl font-semibold text-gray-100 mb-2">Map Legend:</h3>
                <ul class="list-disc list-inside text-gray-300">
                    <li><span class="font-bold text-blue-200">You (X,Y)</span>: Your current simulated position on the
                        grid. It also shows your device's partial MAC address.</li>
                    <li><span class="font-semibold">SSID Name</span>: The name of the Wi-Fi network detected at that
                        location.</li>
                    <li><span class="font-semibold">RSSI</span>: The signal strength in dBm, indicating proximity.</li>
                    <li><span class="text-gray-500">Empty</span>: No SSIDs recorded at this grid cell for the latest
                        scan at that coordinate.</li>
                </ul>
                <p class="text-red-400 text-sm mt-3">
                    <span class="font-bold">Important:</span> This tool relies on a local Nuxt.js server communicating
                    with your `system_profiler` and MongoDB. Ensure MongoDB is running for full functionality.
                </p>
            </div>
        </UCard>

    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
// useToast is auto-imported by Nuxt/UI module. No direct import needed.
const toast = useToast();

// State variables
const targetSSID = ref('');
const currentScanResults = ref({});
const currentX = ref(0);
const currentY = ref(0);
const mapData = ref({});
const deviceMac = ref('N/A');
const appMode = ref('idle'); // New state: 'idle', 'calibrating', 'tracking'
const mongoConnected = ref(false);

// Calibration specific refs
const calibrateX = ref(0);
const calibrateY = ref(0);

// Modal state
const isConfirmClearAllFingerprintsModalOpen = ref(false);

const API_URL = '/api'; // Nuxt will proxy this to the server/api routes

// --- Utility Functions ---
const getProximity = (rssi) => {
    if (rssi === null) return 'N/A';
    if (rssi >= -50) return 'Excellent';
    if (rssi >= -70) return 'Good';
    if (rssi >= -80) return 'Fair';
    if (rssi >= -90) return 'Weak';
    return 'Very Weak / Out of Range';
};

const targetSsidRssi = computed(() => currentScanResults.value[targetSSID.value]?.rssi);
const targetSsidProximity = computed(() => getProximity(targetSsidRssi.value));
const deviceMacPartial = computed(() => {
    return deviceMac.value !== 'N/A' ?
        `${deviceMac.value.substring(0, 5)}...${deviceMac.value.substring(deviceMac.value.length - 5)}` : 'N/A';
});

// --- API Interactions ---

// Fetches overall app status and current position
const fetchStatusAndPosition = async () => {
    console.log('[FRONTEND] fetchStatusAndPosition: fetching status...'); // New log
    try {
        const statusResponse = await fetch(`${API_URL}/status`);
        const statusData = await statusResponse.json();
        console.log('[FRONTEND] fetchStatusAndPosition: received statusData:', statusData); // New log
        appMode.value = statusData.current_mode; // Update appMode from backend
        mongoConnected.value = statusData.mongo_connected;

        const positionResponse = await fetch(`${API_URL}/current-position`);
        const positionData = await positionResponse.json();
        console.log('[FRONTEND] fetchStatusAndPosition: received positionData:', positionData); // New log
        currentX.value = positionData.x;
        currentY.value = positionData.y;

    } catch (error) {
        console.error("Frontend: Error fetching status or position:", error);
        appMode.value = 'idle';
        mongoConnected.value = false;
        toast.add({
            title: 'Connection Error',
            description: 'Failed to connect to backend or MongoDB. Check server console.',
            icon: 'i-heroicons-exclamation-triangle',
            color: 'red'
        });
    }
};

// Sets the application mode on the backend
const setAppMode = async (mode) => {
    console.log('[FRONTEND] setAppMode: Attempting to set app mode to:', mode); // New log
    try {
        const response = await fetch(`${API_URL}/mode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: mode })
        });
        const data = await response.json();
        console.log('[FRONTEND] setAppMode: Backend response for mode change:', data); // New log
        appMode.value = data.newMode;
        toast.add({
            title: 'Mode Changed',
            description: `Application mode set to ${appMode.value.toUpperCase()}.`,
            icon: 'i-heroicons-light-bulb',
            color: 'green'
        });
        // When mode changes, immediately refresh status and map data
        fetchStatusAndPosition();
        fetchLatestScanData(); // Get latest scan based on current position
        fetchMapData(); // Refresh map with potentially new localized data
    } catch (error) {
        console.error("Frontend: Error setting mode:", error);
        toast.add({
            title: 'Mode Change Failed',
            description: `Could not set mode to ${mode}. Is the Nuxt server running and MongoDB connected?`,
            icon: 'i-heroicons-x-circle',
            color: 'red'
        });
    }
};

// Records a fingerprint at the current calibrateX, calibrateY
const recordFingerprint = async () => {
    console.log('[FRONTEND] recordFingerprint: Button clicked. Current appMode:', appMode.value, 'X:', calibrateX.value, 'Y:', calibrateY.value); // New log
    if (appMode.value !== 'calibrating') {
        toast.add({
            title: 'Wrong Mode',
            description: 'You must be in Calibration Mode to record fingerprints.',
            icon: 'i-heroicons-information-circle',
            color: 'yellow'
        });
        return;
    }
    if (!mongoConnected.value) {
        toast.add({
            title: 'MongoDB Disconnected',
            description: 'Cannot record fingerprint: MongoDB is not connected.',
            icon: 'i-heroicons-database',
            color: 'red'
        });
        return;
    }
    try {
        const response = await fetch(`${API_URL}/add-fingerprint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: calibrateX.value, y: calibrateY.value })
        });
        if (response.ok) {
            const data = await response.json();
            console.log('[FRONTEND] recordFingerprint: add-fingerprint success response:', data); // New log
            toast.add({
                title: 'Fingerprint Recorded!',
                description: data.message,
                icon: 'i-heroicons-check-circle',
                color: 'green'
            });
            fetchMapData(); // Refresh map to show new fingerprint point
        } else {
            const errorData = await response.json();
            console.error('[FRONTEND] recordFingerprint: add-fingerprint error response:', errorData); // New log
            toast.add({
                title: 'Recording Failed',
                description: `Failed to record fingerprint: ${errorData.statusMessage || response.statusText}`,
                icon: 'i-heroicons-x-circle',
                color: 'red'
            });
        }
    } catch (error) {
        console.error("Frontend: Error recording fingerprint:", error);
        toast.add({
            title: 'Network Error',
            description: 'Could not record fingerprint. Check server console for details.',
            icon: 'i-heroicons-server-stack',
            color: 'red'
        });
    }
};

// Confirmation handler for clearing all fingerprints
const confirmClearAllFingerprints = async () => {
    isConfirmClearAllFingerprintsModalOpen.value = false; // Close the modal
    try {
        const response = await fetch(`${API_URL}/clear-fingerprints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
            const data = await response.json();
            toast.add({
                title: 'Fingerprints Cleared!',
                description: data.message,
                icon: 'i-heroicons-check-circle',
                color: 'green'
            });
            fetchMapData(); // Refresh map after clearing
        } else {
            const errorData = await response.json();
            toast.add({
                title: 'Clear Failed',
                description: `Failed to clear fingerprints: ${errorData.statusMessage || response.statusText}`,
                icon: 'i-heroicons-x-circle',
                color: 'red'
            });
        }
    } catch (error) {
        console.error("Frontend: Error clearing fingerprints:", error);
        toast.add({
            title: 'Network Error',
            description: 'Could not clear fingerprints. Check server console for details.',
            icon: 'i-heroicons-server-stack',
            color: 'red'
        });
    }
};

const fetchLatestScanData = async () => {
    try {
        const response = await fetch(`${API_URL}/scan-data`);
        if (response.ok) {
            const data = await response.json();
            if (data && data.networks) {
                const parsedData = {};
                data.networks.forEach(net => {
                    parsedData[net.name] = { rssi: net.rssi };
                });
                currentScanResults.value = parsedData;
                deviceMac.value = data.device_mac || 'N/A';
            } else {
                currentScanResults.value = {};
            }
        } else {
            console.warn("Frontend: No latest scan data for current position or API error:", response.statusText);
            currentScanResults.value = {};
        }
    } catch (error) {
        console.error("Frontend: Error fetching latest scan data:", error);
        currentScanResults.value = {};
    }
};

const fetchMapData = async () => {
    try {
        const response = await fetch(`${API_URL}/map-data`);
        if (response.ok) {
            const data = await response.json();
            const newMapData = {};
            data.forEach(record => {
                const key = `${record.x}_${record.y}`;
                newMapData[key] = {
                    ssids: record.networks || [],
                    device_mac: record.device_mac || 'N/A'
                };
            });
            mapData.value = newMapData;
        } else {
            console.error("Frontend: Error fetching map data:", response.statusText);
        }
    } catch (error) {
        console.error("Frontend: Error fetching map data:", error);
    }
};


// --- Map Grid Calculation (still applies) ---
const mapXRange = computed(() => {
    let minX = currentX.value - 2;
    let maxX = currentX.value + 2;
    Object.keys(mapData.value).forEach(key => {
        const [x] = key.split('_').map(Number);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
    });
    if (Object.keys(mapData.value).length === 0) { // Default 5x5 grid if empty
        minX = -2; maxX = 2;
    }
    const range = [];
    for (let i = minX; i <= maxX; i++) {
        range.push(i);
    }
    return range;
});

const mapYRange = computed(() => {
    let minY = currentY.value - 2;
    let maxY = currentY.value + 2;
    Object.keys(mapData.value).forEach(key => {
        const [, y] = key.split('_').map(Number);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    });
    if (Object.keys(mapData.value).length === 0) { // Default 5x5 grid if empty
        minY = -2; maxY = 2;
    }
    const range = [];
    for (let i = minY; i <= maxY; i++) {
        range.push(i);
    }
    return range;
});


// --- Lifecycle Hooks ---
let pollInterval;
onMounted(() => {
    fetchStatusAndPosition(); // Fetch initial status and position
    fetchMapData();

    pollInterval = setInterval(() => {
        fetchStatusAndPosition(); // Continuously fetch status and current estimated position
        fetchLatestScanData(); // Continuously fetch latest scan results for current position
        fetchMapData(); // Continuously refresh map data
    }, 3000); // Poll every 3 seconds
});

onUnmounted(() => {
    clearInterval(pollInterval);
});

// Watch for changes in targetSSID and currentScanResults (diagnostic purpose, can be removed later)
watch(targetSSID, (newValue) => {
    console.log('Frontend: Target SSID input changed to:', newValue);
});

watch(currentScanResults, (newValue) => {
    console.log('Frontend: currentScanResults updated. New value:', newValue);
    if (targetSSID.value && newValue[targetSSID.value]) {
        console.log(`Frontend: Found RSSI for "${targetSSID.value}":`, newValue[targetSSID.value].rssi);
    } else {
        console.log(`Frontend: Still no data found for target SSID "${targetSSID.value}" in currentScanResults.`);
    }
}, { deep: true });
</script>