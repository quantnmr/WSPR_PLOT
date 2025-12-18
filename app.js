// WSPR Globe Application

// Sidebar toggle functionality
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarClose = document.getElementById('sidebarClose');

function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    sidebarToggle.classList.toggle('visible', sidebar.classList.contains('collapsed'));
    // Trigger resize after animation
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 300);
}

sidebarToggle.addEventListener('click', toggleSidebar);
sidebarClose.addEventListener('click', toggleSidebar);

// Auto-collapse sidebar on mobile
function checkMobile() {
    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
        sidebarToggle.classList.add('visible');
    }
}
checkMobile();

// Close sidebar on mobile after loading (so user can see results)
function closeSidebarOnMobile() {
    if (window.innerWidth <= 768 && !sidebar.classList.contains('collapsed')) {
        toggleSidebar();
    }
}

// Accordion functionality
function initAccordion() {
    const howToUseToggle = document.getElementById('howToUseToggle');
    if (!howToUseToggle) return;
    
    const accordion = howToUseToggle.closest('.accordion');
    if (!accordion) return;
    
    const sidebarEl = document.getElementById('sidebar');
    if (!sidebarEl) return;
    
    // Ensure it starts closed
    accordion.classList.remove('active');
    
    howToUseToggle.addEventListener('click', () => {
        const isActive = accordion.classList.toggle('active');
        // Widen sidebar when accordion opens (only if not collapsed)
        if (!sidebarEl.classList.contains('collapsed')) {
            if (isActive) {
                sidebarEl.classList.add('accordion-open');
            } else {
                sidebarEl.classList.remove('accordion-open');
            }
        }
        // Trigger resize after animation
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 350);
    });
}

// Initialize accordion when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccordion);
} else {
    initAccordion();
}

// Popup elements
const spotPopup = document.getElementById('spotPopup');
const popupContent = document.getElementById('popupContent');
const popupClose = document.getElementById('popupClose');

// Close popup handler
popupClose.addEventListener('click', () => {
    spotPopup.classList.remove('visible');
});

// Close popup when clicking outside
document.addEventListener('click', (e) => {
    if (spotPopup.classList.contains('visible') && 
        !spotPopup.contains(e.target) && 
        !e.target.closest('canvas')) {
        spotPopup.classList.remove('visible');
    }
});

// Calculate distance between two lat/lng points (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
}

// Format frequency for display
function formatFrequency(freqHz) {
    const freqMHz = freqHz / 1000000;
    if (freqMHz < 1) {
        return (freqHz / 1000).toFixed(1) + ' kHz';
    }
    return freqMHz.toFixed(3) + ' MHz';
}

// Show spot details popup
function showSpotDetails(spot) {
    const txLoc = gridToLatLng(spot.tx_loc);
    const rxLoc = gridToLatLng(spot.rx_loc);
    const distance = txLoc && rxLoc ? calculateDistance(txLoc.lat, txLoc.lng, rxLoc.lat, rxLoc.lng) : 'N/A';
    
    const time = new Date(spot.time);
    const timeStr = time.toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
    
    popupContent.innerHTML = `
        <h3>Spot Details</h3>
        <div class="detail-row">
            <span class="detail-label">Transmitter</span>
            <span class="detail-value highlight">${spot.tx_sign || 'Unknown'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">TX Grid</span>
            <span class="detail-value">${spot.tx_loc || 'Unknown'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Receiver</span>
            <span class="detail-value highlight">${spot.rx_sign || 'Unknown'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">RX Grid</span>
            <span class="detail-value">${spot.rx_loc || 'Unknown'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Distance</span>
            <span class="detail-value">${distance.toLocaleString()} km</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Frequency</span>
            <span class="detail-value">${formatFrequency(spot.frequency)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">SNR</span>
            <span class="detail-value">${spot.snr} dB</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">TX Power</span>
            <span class="detail-value">${spot.power} dBm</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Drift</span>
            <span class="detail-value">${spot.drift} Hz</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Time</span>
            <span class="detail-value">${timeStr}</span>
        </div>
    `;
    
    spotPopup.classList.add('visible');
}

// Stats panel elements
const statsPanel = document.getElementById('statsPanel');
const statTotalSpots = document.getElementById('statTotalSpots');
const statUniquePaths = document.getElementById('statUniquePaths');
const statFurthest = document.getElementById('statFurthest');
const statActiveBand = document.getElementById('statActiveBand');
const statAvgSNR = document.getElementById('statAvgSNR');
const statBestSNR = document.getElementById('statBestSNR');

// Calculate and display statistics
function updateStats() {
    if (!currentSpots || currentSpots.length === 0) {
        statsPanel.style.display = 'none';
        return;
    }
    
    statsPanel.style.display = 'block';
    
    const selectedBands = getSelectedBands();
    const filteredSpots = currentSpots.filter(spot => {
        const freqMHz = spot.frequency / 1000000;
        return isFrequencySelected(freqMHz);
    });
    
    // Total spots
    statTotalSpots.textContent = filteredSpots.length.toLocaleString();
    
    // Unique paths
    const uniquePaths = new Set();
    filteredSpots.forEach(spot => {
        const locs = [spot.tx_loc, spot.rx_loc].sort();
        uniquePaths.add(`${locs[0]}-${locs[1]}`);
    });
    statUniquePaths.textContent = uniquePaths.size.toLocaleString();
    
    // Furthest contact
    let maxDistance = 0;
    let furthestSpot = null;
    filteredSpots.forEach(spot => {
        const txLoc = gridToLatLng(spot.tx_loc);
        const rxLoc = gridToLatLng(spot.rx_loc);
        if (txLoc && rxLoc) {
            const dist = calculateDistance(txLoc.lat, txLoc.lng, rxLoc.lat, rxLoc.lng);
            if (dist > maxDistance) {
                maxDistance = dist;
                furthestSpot = spot;
            }
        }
    });
    if (furthestSpot) {
        statFurthest.textContent = `${maxDistance.toLocaleString()} km`;
        statFurthest.title = `${furthestSpot.tx_sign} → ${furthestSpot.rx_sign}`;
    } else {
        statFurthest.textContent = '-';
    }
    
    // Most active band
    const bandCounts = {};
    filteredSpots.forEach(spot => {
        const freqMHz = spot.frequency / 1000000;
        let bandName = 'Unknown';
        
        // Find closest band
        let minDiff = Infinity;
        for (const band of Object.keys(bandColors)) {
            const diff = Math.abs(freqMHz - parseFloat(band));
            if (diff < minDiff) {
                minDiff = diff;
                bandName = parseFloat(band) < 1 ? `${(parseFloat(band) * 1000).toFixed(0)} kHz` : `${band} MHz`;
            }
        }
        bandCounts[bandName] = (bandCounts[bandName] || 0) + 1;
    });
    
    let mostActiveBand = '-';
    let maxCount = 0;
    for (const [band, count] of Object.entries(bandCounts)) {
        if (count > maxCount) {
            maxCount = count;
            mostActiveBand = `${band} (${count})`;
        }
    }
    statActiveBand.textContent = mostActiveBand;
    
    // Average SNR
    const snrValues = filteredSpots.map(s => s.snr).filter(s => s !== undefined);
    if (snrValues.length > 0) {
        const avgSNR = snrValues.reduce((a, b) => a + b, 0) / snrValues.length;
        statAvgSNR.textContent = `${avgSNR.toFixed(1)} dB`;
    } else {
        statAvgSNR.textContent = '-';
    }
    
    // Best SNR
    const bestSNR = Math.max(...snrValues);
    if (isFinite(bestSNR)) {
        const bestSpot = filteredSpots.find(s => s.snr === bestSNR);
        statBestSNR.textContent = `${bestSNR} dB`;
        if (bestSpot) {
            statBestSNR.title = `${bestSpot.tx_sign} → ${bestSpot.rx_sign}`;
        }
    } else {
        statBestSNR.textContent = '-';
    }
}

// DOM Elements
const container = document.getElementById('globeContainer');
const loadBtn = document.getElementById('loadBtn');
const statusEl = document.getElementById('status');
const rxCallsignEl = document.getElementById('rxCallsign');
const txCallsignEl = document.getElementById('txCallsign');
const timeWindowEl = document.getElementById('timeWindow');
const daysAgoEl = document.getElementById('daysAgo');
const hoursAgoEl = document.getElementById('hoursAgo');
const maxLinesEl = document.getElementById('maxLines');
const animateLinesEl = document.getElementById('animateLines');
const solidLinesEl = document.getElementById('solidLines');
const showMarkersEl = document.getElementById('showMarkers');
const heatmapModeEl = document.getElementById('heatmapMode');

const beaconModeEl = document.getElementById('beaconMode');
const arcOptionsEl = document.getElementById('arcOptions');
const frequencyLegendEl = document.getElementById('frequencyLegend');
const beaconLegendEl = document.getElementById('beaconLegend');

// Band filter elements
const bandCheckboxes = document.querySelectorAll('.band-checkbox input[type="checkbox"]');
const selectAllBandsBtn = document.getElementById('selectAllBands');
const selectNoBandsBtn = document.getElementById('selectNoBands');

// Auto-uppercase call signs
rxCallsignEl.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());
txCallsignEl.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());

// Get selected bands
function getSelectedBands() {
    const selected = [];
    bandCheckboxes.forEach(cb => {
        if (cb.checked) {
            selected.push(parseFloat(cb.dataset.band));
        }
    });
    return selected;
}

// Check if frequency is in selected bands
function isFrequencySelected(freqMHz) {
    const selectedBands = getSelectedBands();
    if (selectedBands.length === 0) return false;
    
    // Find closest band and check if it's selected
    let closestBand = null;
    let minDiff = Infinity;
    
    for (const band of Object.keys(bandColors)) {
        const diff = Math.abs(freqMHz - parseFloat(band));
        if (diff < minDiff) {
            minDiff = diff;
            closestBand = parseFloat(band);
        }
    }
    
    return selectedBands.includes(closestBand);
}

// Band filter event listeners
selectAllBandsBtn.addEventListener('click', () => {
    bandCheckboxes.forEach(cb => cb.checked = true);
    if (currentSpots) rerenderData();
});

selectNoBandsBtn.addEventListener('click', () => {
    bandCheckboxes.forEach(cb => cb.checked = false);
    if (currentSpots) rerenderData();
});

bandCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
        if (currentSpots) rerenderData();
    });
});

// Convert hex color to rgba
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Get color based on time position (0 = oldest, 1 = newest)
function getTimeColor(t) {
    // Gradient: blue -> cyan -> green -> yellow -> orange -> red
    const colors = [
        [0, 102, 255],   // blue (oldest)
        [0, 255, 255],   // cyan
        [0, 255, 0],     // green
        [255, 255, 0],   // yellow
        [255, 102, 0],   // orange
        [255, 0, 0]      // red (newest)
    ];
    
    const idx = t * (colors.length - 1);
    const i = Math.floor(idx);
    const f = idx - i;
    
    if (i >= colors.length - 1) return `rgb(${colors[colors.length-1].join(',')})`;
    
    const c1 = colors[i];
    const c2 = colors[i + 1];
    const r = Math.round(c1[0] + (c2[0] - c1[0]) * f);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * f);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * f);
    
    return `rgb(${r}, ${g}, ${b})`;
}

// Toggle beacon mode UI
function toggleBeaconMode() {
    const isBeacon = beaconModeEl.checked;
    arcOptionsEl.classList.toggle('hidden', isBeacon);
    frequencyLegendEl.style.display = isBeacon ? 'none' : 'block';
    beaconLegendEl.style.display = isBeacon ? 'block' : 'none';
    
    // Re-render if we have data
    if (currentSpots) {
        rerenderData();
    }
}

beaconModeEl.addEventListener('change', toggleBeaconMode);

// Band colors by frequency (MHz)
const bandColors = {
    0.137: '#ff0000',
    0.475: '#ff6600',
    1.8: '#ffcc00',
    3.5: '#99ff00',
    5.3: '#66ff00',
    7: '#00ff00',
    10: '#00ff99',
    14: '#00ffff',
    18: '#0099ff',
    21: '#0000ff',
    24: '#6600ff',
    28: '#9900ff',
    50: '#ff00ff',
    144: '#ff0099'
};

// Band frequency ranges in Hz (for SQL queries)
// Each band has a center frequency and we query ±100kHz
const bandRanges = {
    0.137: { min: 136000, max: 138000 },
    0.475: { min: 474000, max: 480000 },
    1.8: { min: 1800000, max: 1900000 },
    3.5: { min: 3500000, max: 3600000 },
    5.3: { min: 5200000, max: 5500000 },
    7: { min: 7000000, max: 7100000 },
    10: { min: 10100000, max: 10200000 },
    14: { min: 14000000, max: 14200000 },
    18: { min: 18000000, max: 18200000 },
    21: { min: 21000000, max: 21200000 },
    24: { min: 24800000, max: 25000000 },
    28: { min: 28000000, max: 28300000 },
    50: { min: 50000000, max: 50500000 },
    144: { min: 144000000, max: 145000000 }
};

// Build SQL frequency filter clause
function buildBandFilterSQL() {
    const selectedBands = getSelectedBands();
    if (selectedBands.length === 0) return null;
    if (selectedBands.length === Object.keys(bandRanges).length) return null; // All bands selected, no filter needed
    
    const conditions = selectedBands.map(band => {
        const range = bandRanges[band];
        if (!range) return null;
        return `(frequency >= ${range.min} AND frequency <= ${range.max})`;
    }).filter(c => c !== null);
    
    if (conditions.length === 0) return null;
    return `(${conditions.join(' OR ')})`;
}

function getBandColor(freqMHz) {
    // Find closest band
    let closest = 14;
    let minDiff = Infinity;
    for (const band of Object.keys(bandColors)) {
        const diff = Math.abs(freqMHz - parseFloat(band));
        if (diff < minDiff) {
            minDiff = diff;
            closest = band;
        }
    }
    return bandColors[closest];
}

// Maidenhead grid to lat/lng conversion
function gridToLatLng(grid) {
    if (!grid || grid.length < 4) return null;
    grid = grid.toUpperCase();
    
    const lon = (grid.charCodeAt(0) - 65) * 20 - 180;
    const lat = (grid.charCodeAt(1) - 65) * 10 - 90;
    const lon2 = parseInt(grid[2]) * 2;
    const lat2 = parseInt(grid[3]);
    
    let finalLon = lon + lon2 + 1;
    let finalLat = lat + lat2 + 0.5;
    
    if (grid.length >= 6) {
        const lon3 = (grid.charCodeAt(4) - 65) * (2/24);
        const lat3 = (grid.charCodeAt(5) - 65) * (1/24);
        finalLon = lon + lon2 + lon3 + (1/24);
        finalLat = lat + lat2 + lat3 + (0.5/24);
    }
    
    return { lat: finalLat, lng: finalLon };
}

// Initialize globe
const globe = Globe()(container)
    .globeImageUrl('./earth_8k.jpg')
    .backgroundColor('#000011')
    .showAtmosphere(false)
    .showGraticules(true)
    .enablePointerInteraction(true)
    .pointOfView({ lat: 20, lng: 0, altitude: 2.5 })
    .arcColor('color')
    .arcStroke(0.3)
    .arcAltitudeAutoScale(0.3)
    .arcDashLength(0.05)
    .arcDashGap(0.03)
    .arcDashAnimateTime(4000)
    .arcsTransitionDuration(0)
    // Point configuration for beacon mode
    .pointColor('color')
    .pointAltitude(0.01)
    .pointRadius(0.3)
    .pointsTransitionDuration(0)
    // Label configuration for beacon endpoints
    .labelColor('color')
    .labelSize(1.5)
    .labelAltitude(0.015)
    .labelDotRadius(0.3)
    .labelText('text')
    .labelsTransitionDuration(0)
    // Click handler for arcs
    .onArcClick((arc) => {
        if (arc && arc.spot) {
            showSpotDetails(arc.spot);
        }
    })
    // Click handler for points
    .onPointClick((point) => {
        if (point && point.spot) {
            showSpotDetails(point.spot);
        }
    })
    // Hover labels
    .arcLabel(d => d.spot ? `${d.spot.tx_sign} → ${d.spot.rx_sign}` : '')
    .pointLabel(d => d.label || '')
    // Heatmap configuration
    .heatmapsData([])
    .heatmapPointLat('lat')
    .heatmapPointLng('lng')
    .heatmapPointWeight('weight')
    .heatmapTopAltitude(0.02)
    .heatmapBandwidth(2)
    .heatmapColorSaturation(1.8)
    .onGlobeReady(() => {
        globe.scene().traverse(obj => {
            if (obj.type === 'Mesh' && obj.material && obj.material.map) {
                const texture = obj.material.map;
                texture.generateMipmaps = false;
                texture.minFilter = 1006;
                texture.magFilter = 1006;
                texture.needsUpdate = true;
            }
        });
    });

// Handle resize
function resize() {
    globe.width(container.clientWidth);
    globe.height(container.clientHeight);
}
window.addEventListener('resize', resize);
resize();

// Update status
function setStatus(message, type = '') {
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
}

// Load WSPR data
async function loadWSPRData() {
    const rxCall = rxCallsignEl.value.trim();
    const txCall = txCallsignEl.value.trim();
    const timeWindow = parseInt(timeWindowEl.value);
    const maxLines = parseInt(maxLinesEl.value);

            // Check if any bands are selected
            const selectedBands = getSelectedBands();
            if (selectedBands.length === 0) {
                setStatus('Please select at least one frequency band', 'error');
                return;
            }

            setStatus('Loading WSPR spots...', 'loading');
            loadBtn.disabled = true;

            try {
        // Build query for wspr.live API
        const now = new Date();
        const daysAgo = parseInt(daysAgoEl.value) || 0;
        const hoursAgo = parseInt(hoursAgoEl.value) || 0;
        // Calculate start time: subtract days and hours, then subtract the time window
        const baseTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000);
        const startTime = new Date(baseTime.getTime() - timeWindow * 60 * 1000);
        const endTime = baseTime; // End time is the base time (now minus days and hours ago)
        const startStr = startTime.toISOString().slice(0, 19).replace('T', ' ');
        const endStr = endTime.toISOString().slice(0, 19).replace('T', ' ');

                let query = `SELECT * FROM wspr.rx WHERE time >= '${startStr}' AND time <= '${endStr}'`;
                
                if (rxCall) {
                    query += ` AND rx_sign = '${rxCall}'`;
                }
                if (txCall) {
                    query += ` AND tx_sign = '${txCall}'`;
                }
                
                // Add band filter to query
                const bandFilter = buildBandFilterSQL();
                if (bandFilter) {
                    query += ` AND ${bandFilter}`;
                }
                
                query += ` ORDER BY time DESC LIMIT ${maxLines}`;

        const url = `https://db1.wspr.live/?query=${encodeURIComponent(query)} FORMAT JSON`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('API request failed');
        
        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            setStatus('No spots found', 'error');
            globe.arcsData([]);
            currentSpots = null;
            loadBtn.disabled = false;
            return;
        }

        // Store spots for re-rendering
        currentSpots = data.data;

        // Render the data
        rerenderData();
        
        // Update status
        const isBeaconMode = beaconModeEl.checked;
        if (isBeaconMode) {
            const pointCount = globe.pointsData().length;
            setStatus(`Loaded ${pointCount} beacon positions from ${data.data.length} spots`, 'success');
        } else {
            const arcCount = globe.arcsData().length;
            setStatus(`Loaded ${arcCount} unique paths from ${data.data.length} spots`, 'success');
        }

        // Close sidebar on mobile so user can see results
        closeSidebarOnMobile();

    } catch (error) {
        console.error('Error loading WSPR data:', error);
        setStatus('Error: ' + error.message, 'error');
    }

    loadBtn.disabled = false;
}

// Store current arc data for re-rendering
let currentSpots = null;

// Re-render data with current settings (arcs or points)
function rerenderData() {
    if (!currentSpots || currentSpots.length === 0) return;
    
    const isBeaconMode = beaconModeEl.checked;
    
    if (isBeaconMode) {
        renderBeaconPoints();
        const pointCount = globe.pointsData().length;
        setStatus(`Showing ${pointCount} beacon positions (filtered from ${currentSpots.length} spots)`, 'success');
    } else {
        renderArcs();
        const arcCount = globe.arcsData().length;
        setStatus(`Showing ${arcCount} unique paths (filtered from ${currentSpots.length} spots)`, 'success');
    }
    
    // Update statistics
    updateStats();
}

// Render arcs (normal mode)
function renderArcs() {
    const useTransparency = !solidLinesEl.checked;
    const useAnimation = animateLinesEl.checked;
    
    const arcs = [];
    const seen = new Set();
    const txLocations = new Map(); // Track unique TX locations
    const rxLocations = new Map(); // Track unique RX locations
    
    for (const spot of currentSpots) {
        const freqMHz = spot.frequency / 1000000;
        
        // Filter by selected bands
        if (!isFrequencySelected(freqMHz)) continue;
        
        const txLoc = gridToLatLng(spot.tx_loc);
        const rxLoc = gridToLatLng(spot.rx_loc);
        
        if (!txLoc || !rxLoc) continue;
        
        // Skip if same location
        if (spot.tx_loc === spot.rx_loc) continue;
        
        // Deduplicate by path (bidirectional)
        const locs = [spot.tx_loc, spot.rx_loc].sort();
        const pathKey = `${locs[0]}-${locs[1]}`;
        if (seen.has(pathKey)) continue;
        seen.add(pathKey);

        let color = getBandColor(freqMHz);
        
        // Track TX location (store first spot for this location)
        if (!txLocations.has(spot.tx_loc)) {
            txLocations.set(spot.tx_loc, {
                lat: txLoc.lat,
                lng: txLoc.lng,
                color: color,
                type: 'tx',
                spot: spot
            });
        }
        
        // Track RX location (store first spot for this location)
        if (!rxLocations.has(spot.rx_loc)) {
            rxLocations.set(spot.rx_loc, {
                lat: rxLoc.lat,
                lng: rxLoc.lng,
                color: color,
                type: 'rx',
                spot: spot
            });
        }
        
        if (useTransparency) {
            color = hexToRgba(color, 0.4);
        }
        
        arcs.push({
            startLat: txLoc.lat,
            startLng: txLoc.lng,
            endLat: rxLoc.lat,
            endLng: rxLoc.lng,
            color: color,
            spot: spot  // Store spot data for click handler
        });
    }

    // Update animation settings
    if (useAnimation) {
        globe.arcDashLength(0.05).arcDashGap(0.03).arcDashAnimateTime(4000);
    } else {
        globe.arcDashLength(1).arcDashGap(0).arcDashAnimateTime(0);
    }
    
    // Reset arc settings for normal mode
    globe.arcStroke(0.3);
    globe.arcAltitudeAutoScale(0.3);

    // Check if markers should be shown
    const showMarkers = showMarkersEl.checked;
    
    let allPoints = [];
    
    if (showMarkers) {
        // Create solid points for TX locations (colored by band)
        txLocations.forEach(loc => {
            allPoints.push({
                lat: loc.lat,
                lng: loc.lng,
                color: loc.color,
                size: 0.18,
                type: 'tx',
                spot: loc.spot,
                label: loc.spot ? loc.spot.tx_sign : ''
            });
        });
        
        // Create points for RX locations (white, smaller)
        rxLocations.forEach((loc, key) => {
            // Skip if it's also a TX location
            if (!txLocations.has(key)) {
                allPoints.push({
                    lat: loc.lat,
                    lng: loc.lng,
                    color: 'rgba(255, 255, 255, 0.6)',
                    size: 0.12,  // Smaller than TX
                    type: 'rx',
                    spot: loc.spot,
                    label: loc.spot ? loc.spot.rx_sign : ''
                });
            }
        });
    }
    
    // Configure points
    globe.pointRadius(d => d.size);
    globe.pointColor(d => d.color);
    globe.pointAltitude(0.005);

    // Check if heatmap mode is enabled
    const showHeatmap = heatmapModeEl.checked;
    
    // Build heatmap data from all TX and RX locations
    let heatmapData = [];
    if (showHeatmap) {
        const locationCounts = new Map();
        
        // Count spots at each location - use coarser grid (1 degree) for performance
        for (const spot of currentSpots) {
            const freqMHz = spot.frequency / 1000000;
            if (!isFrequencySelected(freqMHz)) continue;
            
            const txLoc = gridToLatLng(spot.tx_loc);
            const rxLoc = gridToLatLng(spot.rx_loc);
            
            if (txLoc) {
                const key = `${Math.round(txLoc.lat)},${Math.round(txLoc.lng)}`;
                locationCounts.set(key, (locationCounts.get(key) || 0) + 1);
            }
            if (rxLoc) {
                const key = `${Math.round(rxLoc.lat)},${Math.round(rxLoc.lng)}`;
                locationCounts.set(key, (locationCounts.get(key) || 0) + 1);
            }
        }
        
        // Convert to heatmap points - limit to top 200 for performance
        const sortedLocations = Array.from(locationCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 200);
        
        sortedLocations.forEach(([key, count]) => {
            const [lat, lng] = key.split(',').map(Number);
            heatmapData.push({
                lat: lat,
                lng: lng,
                weight: Math.sqrt(count)
            });
        });
    }

    // Clear and set data
    globe.labelsData([]);
    globe.ringsData([]);  // Clear any rings
    globe.pointsData(showHeatmap ? [] : allPoints);  // Hide points in heatmap mode
    globe.arcsData(showHeatmap ? [] : arcs);  // Hide arcs in heatmap mode
    globe.heatmapsData(showHeatmap ? [heatmapData] : []);
}

// Render beacon points (beacon mode)
function renderBeaconPoints() {
    const points = [];
    const pathArcs = [];
    const seen = new Set();
    
    // Sort spots by time (oldest first)
    const sortedSpots = [...currentSpots].sort((a, b) => 
        new Date(a.time) - new Date(b.time)
    );
    
    // Find time range for color gradient
    const times = sortedSpots.map(s => new Date(s.time).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeRange = maxTime - minTime || 1;
    
    let prevPoint = null;
    
    for (const spot of sortedSpots) {
        const freqMHz = spot.frequency / 1000000;
        
        // Filter by selected bands
        if (!isFrequencySelected(freqMHz)) continue;
        
        const txLoc = gridToLatLng(spot.tx_loc);
        if (!txLoc) continue;
        
        // Round time to 2-minute intervals for deduplication
        const spotTime = new Date(spot.time).getTime();
        const interval = Math.floor(spotTime / (2 * 60 * 1000));
        const timeKey = `${spot.tx_loc}-${interval}`;
        
        if (seen.has(timeKey)) continue;
        seen.add(timeKey);
        
        // Calculate time position (0 = oldest, 1 = newest)
        const t = (spotTime - minTime) / timeRange;
        
        const point = {
            lat: txLoc.lat,
            lng: txLoc.lng,
            color: getTimeColor(t),
            time: spot.time,
            callsign: spot.tx_sign
        };
        
        points.push(point);
        
        // Draw line from previous point to this one
        if (prevPoint) {
            pathArcs.push({
                startLat: prevPoint.lat,
                startLng: prevPoint.lng,
                endLat: point.lat,
                endLng: point.lng,
                color: getTimeColor(t)
            });
        }
        
        prevPoint = point;
    }

    // Configure arcs for beacon path (no animation, thin lines)
    globe.arcDashLength(1).arcDashGap(0).arcDashAnimateTime(0);
    globe.arcStroke(0.2);
    globe.arcAltitudeAutoScale(0.1);
    
    // Create labels for start and end points
    const labels = [];
    if (points.length > 0) {
        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];
        
        // Format date/time
        const formatTime = (timeStr) => {
            const d = new Date(timeStr);
            return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
        };
        
        labels.push({
            lat: firstPoint.lat,
            lng: firstPoint.lng,
            text: `START: ${firstPoint.callsign}\n${formatTime(firstPoint.time)}`,
            color: 'rgba(100, 180, 255, 0.9)'
        });
        
        if (points.length > 1) {
            labels.push({
                lat: lastPoint.lat,
                lng: lastPoint.lng,
                text: `END: ${lastPoint.callsign}\n${formatTime(lastPoint.time)}`,
                color: 'rgba(255, 100, 100, 0.9)'
            });
        }
    }
    
    globe.ringsData([]);  // Clear rings in beacon mode
    globe.arcsData(pathArcs);
    globe.pointsData(points);
    globe.labelsData(labels);
}

// Alias for backward compatibility
function rerenderArcs() {
    rerenderData();
}

// Event listeners
loadBtn.addEventListener('click', loadWSPRData);
animateLinesEl.addEventListener('change', rerenderArcs);
solidLinesEl.addEventListener('change', rerenderArcs);
showMarkersEl.addEventListener('change', rerenderArcs);
heatmapModeEl.addEventListener('change', rerenderArcs);

