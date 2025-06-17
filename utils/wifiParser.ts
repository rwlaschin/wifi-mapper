// utils/wifiParser.ts

interface Network {
    name: string;
    rssi: number | null;
}

interface ScanData {
    device_mac: string;
    networks: Network[];
}

/**
 * Parses the raw output from `system_profiler SPAirPortDataType` into a structured object.
 * Extracts device MAC address and a list of detected Wi-Fi networks with their RSSI.
 * @param text The raw string output from system_profiler.
 * @returns An object containing the device's MAC address and an array of detected networks.
 */
export const parseWifiInfo = (text: string): ScanData => {
    const networks: { [key: string]: { rssi: number | null } } = {};
    let currentSection: 'current' | 'other' | null = null;
    let deviceMac = "N/A";

    const lines = text.split('\n');

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Extract device MAC address
        const macMatch = trimmedLine.match(/^MAC Address: ([0-9a-fA-F:]+)$/);
        if (macMatch) {
            deviceMac = macMatch[1];
            continue;
        }

        // Identify sections for parsing SSIDs
        if (trimmedLine === 'Current Network Information:') {
            currentSection = 'current';
            continue;
        } else if (trimmedLine === 'Other Local Wi-Fi Networks:') {
            currentSection = 'other';
            continue;
        }

        // Only parse if we are in a relevant network information section
        if (currentSection) {
            // Check for SSID header (e.g., "VC-Staff:")
            const ssidMatch = trimmedLine.match(/^([a-zA-Z0-9\s._-]+):$/);
            // Heuristic: Ensure it's not a sub-property like 'PHY Mode:' or 'Channel:'
            if (ssidMatch && ssidMatch[1].length > 0 &&
               !trimmedLine.startsWith('PHY Mode:') &&
               !trimmedLine.startsWith('Channel:')) {
                const ssidName = ssidMatch[1];
                if (!networks[ssidName]) {
                    networks[ssidName] = { rssi: null }; // Initialize with null for RSSI
                }
                continue;
            }

            // Check for Signal / Noise, and assign to the last identified SSID
            const signalNoiseMatch = trimmedLine.match(/^Signal \/ Noise: (-?\d+)\s*dBm \/ (-?\d+)\s*dBm$/);
            if (signalNoiseMatch) {
                const rssi = parseInt(signalNoiseMatch[1], 10);
                // Find the most recently added SSID to assign RSSI to it
                const lastSsidKey = Object.keys(networks).pop();
                if (lastSsidKey) {
                    networks[lastSsidKey].rssi = rssi;
                }
                continue;
            }
        }
    }

    // Convert networks object to an array of objects
    const networkList: Network[] = [];
    for (const name in networks) {
        networkList.push({ name: name, rssi: networks[name].rssi });
    }

    return { device_mac: deviceMac, networks: networkList };
};
