// WSPR Plot Application

// DOM Elements
const container = document.getElementById('globeContainer');
const loadBtn = document.getElementById('loadBtn');
const statusEl = document.getElementById('status');
const rxCallsignEl = document.getElementById('rxCallsign');
const txCallsignEl = document.getElementById('txCallsign');
const timeWindowEl = document.getElementById('timeWindow');
const maxLinesEl = document.getElementById('maxLines');
const animateLinesEl = document.getElementById('animateLines');
const solidLinesEl = document.getElementById('solidLines');
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
        const startTime = new Date(now.getTime() - timeWindow * 60 * 1000);
        const startStr = startTime.toISOString().slice(0, 19).replace('T', ' ');

                let query = `SELECT * FROM wspr.rx WHERE time >= '${startStr}'`;
                
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
}

// Render arcs (normal mode)
function renderArcs() {
    const useTransparency = !solidLinesEl.checked;
    const useAnimation = animateLinesEl.checked;
    
    const arcs = [];
    const seen = new Set();
    
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
        
        if (useTransparency) {
            color = hexToRgba(color, 0.4);
        }
        
        arcs.push({
            startLat: txLoc.lat,
            startLng: txLoc.lng,
            endLat: rxLoc.lat,
            endLng: rxLoc.lng,
            color: color
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

    globe.pointsData([]);  // Clear points
    globe.labelsData([]);  // Clear labels
    globe.arcsData(arcs);
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

