// WSPR Globe Application

// Sidebar toggle functionality
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarClose = document.getElementById('sidebarClose');

// Update header and footer position based on sidebar state
function updateHeaderFooterPosition() {
    const header = document.querySelector('.site-header');
    const footer = document.querySelector('.site-footer');
    if (!header || !footer) return;
    
    const isCollapsed = sidebar.classList.contains('collapsed');
    const isAccordionOpen = sidebar.classList.contains('accordion-open');
    
    if (isCollapsed) {
        // When collapsed, leave space for hamburger button (60px = 10px margin + 40px button + 10px margin)
        // Use a larger offset on mobile to ensure button is never covered
        const isMobile = window.innerWidth <= 768;
        header.style.left = isMobile ? '70px' : '60px';
        footer.style.left = '0';
    } else {
        // Sidebar is 280px normally, 560px when accordion is open
        const sidebarWidth = isAccordionOpen ? '560px' : '280px';
        header.style.left = sidebarWidth;
        footer.style.left = sidebarWidth;
    }
}

function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    sidebarToggle.classList.toggle('visible', sidebar.classList.contains('collapsed'));
    
    // Add/remove body class for CSS targeting on mobile
    if (sidebar.classList.contains('collapsed')) {
        document.body.classList.add('sidebar-collapsed');
    } else {
        document.body.classList.remove('sidebar-collapsed');
    }
    
    // Update header and footer position
    updateHeaderFooterPosition();
    
    // Trigger resize after animation
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 300);
}

sidebarToggle.addEventListener('click', toggleSidebar);
sidebarClose.addEventListener('click', toggleSidebar);

// Auto-collapse sidebar on mobile (only on initial load, not on resize)
let isInitialLoad = true;
function checkMobile() {
    if (window.innerWidth <= 768) {
        // Only auto-collapse on initial load, not when user has manually opened it
        if (isInitialLoad) {
            sidebar.classList.add('collapsed');
            sidebarToggle.classList.add('visible');
            document.body.classList.add('sidebar-collapsed');
        }
    } else {
        // On larger screens, ensure sidebar is open
        sidebar.classList.remove('collapsed');
        sidebarToggle.classList.remove('visible');
        document.body.classList.remove('sidebar-collapsed');
    }
    // Update header and footer position
    updateHeaderFooterPosition();
}
checkMobile();
isInitialLoad = false; // Mark initial load as complete after first check

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
        // Update header and footer position when accordion toggles
        updateHeaderFooterPosition();
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
    
    // Parse time as UTC (database returns UTC timestamps)
    let timeStr = spot.time;
    if (typeof timeStr === 'string' && !timeStr.includes('Z') && !timeStr.includes('+') && !timeStr.includes('-', 10)) {
        // Format like "2025-01-15 12:00:00" - append Z to indicate UTC
        timeStr = timeStr.replace(' ', 'T') + 'Z';
    }
    const time = new Date(timeStr);
    const timeStrDisplay = time.toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
    
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
            <span class="detail-value">${timeStrDisplay}</span>
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
    
    const baseSpots = filterSpotsByCallsignPrefix(currentSpots);
    const filteredSpots = baseSpots.filter(spot => {
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
const shareBtn = document.getElementById('shareBtn');
const statusEl = document.getElementById('status');
const rxCallsignEl = document.getElementById('rxCallsign');
const txCallsignEl = document.getElementById('txCallsign');
const timeWindowEl = document.getElementById('timeWindow');
const daysAgoEl = document.getElementById('daysAgo');
const hoursAgoEl = document.getElementById('hoursAgo');
const maxLinesToDisplayEl = document.getElementById('maxLinesToDisplay');
const maxLinesEl = document.getElementById('maxLines');
const animateLinesEl = document.getElementById('animateLines');
const solidLinesEl = document.getElementById('solidLines');
const showMarkersEl = document.getElementById('showMarkers');
const heatmapModeEl = document.getElementById('heatmapMode');
const showTerminatorEl = document.getElementById('showTerminator');
const excludeWeirdCallsignsEl = document.getElementById('excludeWeirdCallsigns');
const timeWindowDisplayEl = document.getElementById('timeWindowDisplay');

const beaconModeEl = document.getElementById('beaconMode');
const arcOptionsEl = document.getElementById('arcOptions');

// URL Parameter handling for sharing links
function parseURLParameters() {
    const params = new URLSearchParams(window.location.search);
    const urlParams = {};
    
    // Parse all parameters
    for (const [key, value] of params.entries()) {
        urlParams[key] = value;
    }
    
    return urlParams;
}

function applyURLParameters() {
    const params = parseURLParameters();
    if (Object.keys(params).length === 0) return false; // No URL parameters
    
    let hasParams = false;
    
    // Set call signs
    if (params.rx) {
        rxCallsignEl.value = params.rx.toUpperCase();
        hasParams = true;
    }
    if (params.tx) {
        txCallsignEl.value = params.tx.toUpperCase();
        hasParams = true;
    }
    
    // Set time window
    if (params.window) {
        timeWindowEl.value = params.window;
        hasParams = true;
    }
    
    // Set time offsets
    if (params.days) {
        daysAgoEl.value = params.days;
        hasParams = true;
    }
    if (params.hours) {
        hoursAgoEl.value = params.hours;
        hasParams = true;
    }
    
    // Set max spots to download (validate against allowed values)
    if (params.maxSpots) {
        const validValues = ['100', '500', '1000', '5000', '10000', '25000', '50000', '100000'];
        if (validValues.includes(params.maxSpots)) {
            maxLinesEl.value = params.maxSpots;
            hasParams = true;
        } else {
            console.warn(`Invalid maxSpots value: ${params.maxSpots}. Valid values are: ${validValues.join(', ')}`);
        }
    }
    
    // Set max lines to display (validate against allowed values)
    if (params.maxLines) {
        const validValues = ['all', '200', '500', '1000', '2000', '5000'];
        if (validValues.includes(params.maxLines)) {
            maxLinesToDisplayEl.value = params.maxLines;
            hasParams = true;
        } else {
            console.warn(`Invalid maxLines value: ${params.maxLines}. Valid values are: ${validValues.join(', ')}`);
        }
    }
    
    // Set frequency bands (comma-separated list)
    if (params.bands) {
        const selectedBands = params.bands.split(',');
        const bandCheckboxes = document.querySelectorAll('input[data-band]');
        bandCheckboxes.forEach(cb => {
            const bandValue = cb.getAttribute('data-band');
            cb.checked = selectedBands.includes(bandValue);
        });
        hasParams = true;
    }
    
    // Set display options
    if (params.animateLines !== undefined) {
        animateLinesEl.checked = params.animateLines === 'true' || params.animateLines === '1';
        hasParams = true;
    }
    if (params.solidLines !== undefined) {
        solidLinesEl.checked = params.solidLines === 'true' || params.solidLines === '1';
        hasParams = true;
    }
    if (params.showMarkers !== undefined) {
        showMarkersEl.checked = params.showMarkers === 'true' || params.showMarkers === '1';
        hasParams = true;
    }
    if (params.heatmap !== undefined) {
        heatmapModeEl.checked = params.heatmap === 'true' || params.heatmap === '1';
        hasParams = true;
    }
    if (params.beacon !== undefined) {
        beaconModeEl.checked = params.beacon === 'true' || params.beacon === '1';
        hasParams = true;
    }

    // Callsign prefix exclusion (default ON)
    if (params.allowWeird !== undefined && excludeWeirdCallsignsEl) {
        // allowWeird=1 means do NOT exclude; allowWeird=0 means exclude
        excludeWeirdCallsignsEl.checked = !(params.allowWeird === 'true' || params.allowWeird === '1');
        hasParams = true;
    }
    
    // Set time-lapse options
    if (params.timelapse !== undefined) {
        timelapseModeEl.checked = params.timelapse === 'true' || params.timelapse === '1';
        hasParams = true;
    }
    if (params.timelapseWindow) {
        timelapseWindowEl.value = params.timelapseWindow;
        hasParams = true;
    }
    if (params.timelapseSpeed) {
        timelapseSpeedEl.value = params.timelapseSpeed;
        hasParams = true;
    }
    
    return hasParams;
}

function generateShareURL() {
    const params = new URLSearchParams();
    
    // Add call signs if set
    if (rxCallsignEl.value) params.set('rx', rxCallsignEl.value);
    if (txCallsignEl.value) params.set('tx', txCallsignEl.value);
    
    // Add time settings
    if (timeWindowEl.value !== '15') params.set('window', timeWindowEl.value);
    if (daysAgoEl.value !== '0') params.set('days', daysAgoEl.value);
    if (hoursAgoEl.value !== '0') params.set('hours', hoursAgoEl.value);
    
    // Add max spots and lines
    if (maxLinesEl.value !== '1000') params.set('maxSpots', maxLinesEl.value);
    if (maxLinesToDisplayEl.value !== 'all') params.set('maxLines', maxLinesToDisplayEl.value);
    
    // Add selected bands
    const selectedBands = Array.from(document.querySelectorAll('input[data-band]:checked'))
        .map(cb => cb.getAttribute('data-band'));
    if (selectedBands.length > 0 && selectedBands.length < 12) {
        params.set('bands', selectedBands.join(','));
    }
    
    // Add display options (only if not default)
    if (animateLinesEl.checked) params.set('animateLines', '1');
    if (solidLinesEl.checked) params.set('solidLines', '1');
    if (!showMarkersEl.checked) params.set('showMarkers', '0');
    if (heatmapModeEl.checked) params.set('heatmap', '1');
    if (beaconModeEl.checked) params.set('beacon', '1');

    // Callsign prefix exclusion: default is ON, so only include param when turning it off
    if (excludeWeirdCallsignsEl && !excludeWeirdCallsignsEl.checked) {
        params.set('allowWeird', '1');
    }
    
    // Add time-lapse options
    if (timelapseModeEl.checked) {
        params.set('timelapse', '1');
        if (timelapseWindowEl.value !== '10') params.set('timelapseWindow', timelapseWindowEl.value);
        if (timelapseSpeedEl.value !== '2000') params.set('timelapseSpeed', timelapseSpeedEl.value);
    }
    
    return window.location.origin + window.location.pathname + '?' + params.toString();
}

const frequencyLegendEl = document.getElementById('frequencyLegend');
const beaconLegendEl = document.getElementById('beaconLegend');

// Time-lapse elements
const timelapseModeEl = document.getElementById('timelapseMode');
const timelapseControlsEl = document.getElementById('timelapseControls');
const timelapsePlayPauseEl = document.getElementById('timelapsePlayPause');
const timelapseResetEl = document.getElementById('timelapseReset');
const timelapseSpeedEl = document.getElementById('timelapseSpeed');
const timelapseWindowEl = document.getElementById('timelapseWindow');
const timelapseTimeDisplayEl = document.getElementById('timelapseTimeDisplay');
const timelapseProgressEl = document.getElementById('timelapseProgress');

// Time-lapse state
let timelapseAnimation = null;
let timelapseIsPlaying = false;
let timelapseStartTime = null;
let timelapseDataMinTime = null;
let timelapseDataMaxTime = null;
let timelapseCurrentWindowStart = null;
let timelapseAllSpots = [];
let heatmapRenderFrames = 0; // Count frames since heatmap was set
let heatmapRenderWaitFrames = 5; // Wait 5 frames for heatmap to render
let currentHeatmapData = []; // Store current heatmap data to keep it visible during computation
let pendingHeatmapData = null; // Store next heatmap data before swapping

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
    
    // Disable time-lapse if beacon mode is enabled
    if (isBeacon && timelapseModeEl.checked) {
        timelapseModeEl.checked = false;
        toggleTimelapseMode();
    }
    
    // Re-render if we have data
    if (currentSpots) {
        rerenderData();
    }
}

beaconModeEl.addEventListener('change', toggleBeaconMode);

// Time-lapse functionality
function toggleTimelapseMode() {
    const isTimelapse = timelapseModeEl.checked;
    timelapseControlsEl.style.display = isTimelapse ? 'block' : 'none';
    
    // Disable beacon mode if time-lapse is enabled
    if (isTimelapse && beaconModeEl.checked) {
        beaconModeEl.checked = false;
        toggleBeaconMode();
    }
    
    // Disable and uncheck "animate lines" when time-lapse is enabled
    if (isTimelapse) {
        animateLinesEl.disabled = true;
        animateLinesEl.checked = false;
        animateLinesEl.parentElement.classList.add('disabled');
    } else {
        animateLinesEl.disabled = false;
        animateLinesEl.parentElement.classList.remove('disabled');
    }
    
    if (isTimelapse) {
        // Initialize time-lapse if we have data
        if (currentSpots && currentSpots.length > 0) {
            initializeTimelapse();
        }
    } else {
        // Stop animation and show all arcs
        stopTimelapse();
        if (currentSpots) {
            rerenderData();
        }
    }
    
    // Trigger resize after showing/hiding controls
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
}

function initializeTimelapse() {
    if (!currentSpots || currentSpots.length === 0) return;
    
    // Store all spots with their timestamps
    // Ensure we parse UTC timestamps correctly (database returns UTC)
    timelapseAllSpots = currentSpots.map(spot => {
        // If time string doesn't have timezone, assume it's UTC
        let timeStr = spot.time;
        if (typeof timeStr === 'string' && !timeStr.includes('Z') && !timeStr.includes('+') && !timeStr.includes('-', 10)) {
            // Format like "2025-01-15 12:00:00" - append Z to indicate UTC
            timeStr = timeStr.replace(' ', 'T') + 'Z';
        }
        return {
            ...spot,
            timeMs: new Date(timeStr).getTime()
        };
    });
    
    // Find time range of all data
    const times = timelapseAllSpots.map(s => s.timeMs);
    timelapseDataMinTime = Math.min(...times);
    timelapseDataMaxTime = Math.max(...times);
    
    // Reset to start
    timelapseCurrentWindowStart = timelapseDataMinTime;
    timelapseProgressEl.value = 0;
    updateTimelapseDisplay();
    renderTimelapseWindow();
}

function renderTimelapseWindow() {
    if (!timelapseModeEl.checked || timelapseAllSpots.length === 0) return;
    if (!timelapseCurrentWindowStart || !timelapseDataMinTime || !timelapseDataMaxTime) return;
    
    const windowSizeMinutes = parseInt(timelapseWindowEl.value) || 10;
    const windowSizeMs = windowSizeMinutes * 60 * 1000;
    const windowEnd = timelapseCurrentWindowStart + windowSizeMs;
    
    // Filter spots within current window
    const windowSpots = timelapseAllSpots.filter(spot => 
        spot.timeMs >= timelapseCurrentWindowStart && spot.timeMs < windowEnd
    );
    
    // Build arcs from spots in this window (same logic as renderArcs)
    const arcs = [];
    const seen = new Set();
    const txLocations = new Map();
    const rxLocations = new Map();
    
    for (const spot of windowSpots) {
        const freqMHz = spot.frequency / 1000000;
        if (!isFrequencySelected(freqMHz)) continue;
        
        const txLoc = gridToLatLng(spot.tx_loc);
        const rxLoc = gridToLatLng(spot.rx_loc);
        if (!txLoc || !rxLoc) continue;
        if (spot.tx_loc === spot.rx_loc) continue;
        
        // Deduplicate by path (bidirectional)
        const locs = [spot.tx_loc, spot.rx_loc].sort();
        const pathKey = `${locs[0]}-${locs[1]}`;
        if (seen.has(pathKey)) continue;
        seen.add(pathKey);
        
        let color = getBandColor(freqMHz);
        if (!solidLinesEl.checked) {
            color = hexToRgba(color, 0.4);
        }
        
        // Track TX location
        if (!txLocations.has(spot.tx_loc)) {
            txLocations.set(spot.tx_loc, {
                lat: txLoc.lat,
                lng: txLoc.lng,
                color: getBandColor(freqMHz),
                spot: spot
            });
        }
        
        // Track RX location
        if (!rxLocations.has(spot.rx_loc)) {
            rxLocations.set(spot.rx_loc, {
                lat: rxLoc.lat,
                lng: rxLoc.lng,
                spot: spot
            });
        }
        
        arcs.push({
            startLat: txLoc.lat,
            startLng: txLoc.lng,
            endLat: rxLoc.lat,
            endLng: rxLoc.lng,
            color: color,
            spot: spot
        });
    }
    
    // Apply max lines to display limit (randomly sample if needed)
    const maxLinesToDisplay = maxLinesToDisplayEl.value;
    if (maxLinesToDisplay !== 'all' && arcs.length > parseInt(maxLinesToDisplay)) {
        // Randomly shuffle and take first N
        for (let i = arcs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arcs[i], arcs[j]] = [arcs[j], arcs[i]];
        }
        arcs.splice(parseInt(maxLinesToDisplay));
        
        // Also filter txLocations and rxLocations to only include those in sampled arcs
        const sampledTxLocs = new Set();
        const sampledRxLocs = new Set();
        arcs.forEach(arc => {
            sampledTxLocs.add(arc.spot.tx_loc);
            sampledRxLocs.add(arc.spot.rx_loc);
        });
        
        // Filter location maps
        const filteredTxLocations = new Map();
        const filteredRxLocations = new Map();
        txLocations.forEach((loc, key) => {
            if (sampledTxLocs.has(key)) filteredTxLocations.set(key, loc);
        });
        rxLocations.forEach((loc, key) => {
            if (sampledRxLocs.has(key)) filteredRxLocations.set(key, loc);
        });
        
        // Update references
        txLocations.clear();
        rxLocations.clear();
        filteredTxLocations.forEach((v, k) => txLocations.set(k, v));
        filteredRxLocations.forEach((v, k) => rxLocations.set(k, v));
    }
    
    // Update animation settings - disable path animation during time-lapse
    // (it looks jerky when time windows change quickly)
    globe.arcDashLength(1).arcDashGap(0).arcDashAnimateTime(0);
    
    globe.arcStroke(0.3);
    globe.arcAltitudeAutoScale(0.3);
    
    // Show markers if enabled
    let allPoints = [];
    if (showMarkersEl.checked) {
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
        
        rxLocations.forEach((loc, key) => {
            if (!txLocations.has(key)) {
                allPoints.push({
                    lat: loc.lat,
                    lng: loc.lng,
                    color: 'rgba(255, 255, 255, 0.6)',
                    size: 0.12,
                    type: 'rx',
                    spot: loc.spot,
                    label: loc.spot ? loc.spot.rx_sign : ''
                });
            }
        });
    }
    
    globe.pointRadius(d => d.size);
    globe.pointColor(d => d.color);
    globe.pointAltitude(0.005);
    globe.labelsData([]);
    globe.ringsData([]);
    
    // Check if heatmap mode is enabled
    const showHeatmap = heatmapModeEl && heatmapModeEl.checked;
    
    // Set data based on mode
    if (showHeatmap) {
        // Heatmap mode - show only heatmap, hide arcs and points
        globe.pointsData([]);
        globe.arcsData([]);
        
        // Build heatmap data from spots in current window
        const locationCounts = new Map();
        
        // Use coarser grid during animation (2 degrees) for faster computation
        const gridSize = timelapseIsPlaying ? 2 : 1;
        
        // If max lines to display is set, only use spots from sampled arcs
        const maxLinesToDisplay = maxLinesToDisplayEl.value;
        let spotsToUse = windowSpots;
        if (maxLinesToDisplay !== 'all' && arcs.length > 0) {
            // Use only spots that match the sampled arcs
            const sampledPaths = new Set();
            arcs.forEach(arc => {
                const locs = [arc.spot.tx_loc, arc.spot.rx_loc].sort();
                sampledPaths.add(`${locs[0]}-${locs[1]}`);
            });
            spotsToUse = windowSpots.filter(spot => {
                const locs = [spot.tx_loc, spot.rx_loc].sort();
                return sampledPaths.has(`${locs[0]}-${locs[1]}`);
            });
        }
        
        // Count spots at each location
        for (const spot of spotsToUse) {
            const freqMHz = spot.frequency / 1000000;
            if (!isFrequencySelected(freqMHz)) continue;
            
            const txLoc = gridToLatLng(spot.tx_loc);
            const rxLoc = gridToLatLng(spot.rx_loc);
            
            if (txLoc) {
                const key = `${Math.round(txLoc.lat / gridSize) * gridSize},${Math.round(txLoc.lng / gridSize) * gridSize}`;
                locationCounts.set(key, (locationCounts.get(key) || 0) + 1);
            }
            if (rxLoc) {
                const key = `${Math.round(rxLoc.lat / gridSize) * gridSize},${Math.round(rxLoc.lng / gridSize) * gridSize}`;
                locationCounts.set(key, (locationCounts.get(key) || 0) + 1);
            }
        }
        
        // Convert to heatmap points - limit to top 150 during animation, 200 when paused
        const maxPoints = timelapseIsPlaying ? 150 : 200;
        const sortedLocations = Array.from(locationCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxPoints);
        
        const heatmapData = [];
        sortedLocations.forEach(([key, count]) => {
            const [lat, lng] = key.split(',').map(Number);
            heatmapData.push({
                lat: lat,
                lng: lng,
                weight: Math.sqrt(count)
            });
        });
        
        // Always keep previous heatmap visible until new one is ready
        // If we're still waiting for previous render, queue the new data
        if (currentHeatmapData.length > 0 && heatmapRenderFrames < heatmapRenderWaitFrames) {
            // Still waiting for previous heatmap to fully render, queue this one
            pendingHeatmapData = heatmapData;
            // Explicitly keep current heatmap visible (don't clear it)
            if (globe.heatmapsData().length === 0 || globe.heatmapsData()[0].length === 0) {
                // If somehow it got cleared, restore it
                globe.heatmapsData([currentHeatmapData]);
            }
        } else {
            // Previous heatmap has been rendered, safe to swap
            currentHeatmapData = heatmapData;
            pendingHeatmapData = null;
            globe.heatmapsData([heatmapData]);
            // Reset frame counter - we'll wait for it to render
            heatmapRenderFrames = 0;
        }
    } else {
        // Normal mode - show arcs and optionally points
        globe.pointsData(showMarkersEl.checked ? allPoints : []);
        globe.arcsData(arcs);
        globe.heatmapsData([]);
        currentHeatmapData = [];
        pendingHeatmapData = null;
        heatmapRenderFrames = heatmapRenderWaitFrames; // Skip wait when not using heatmap
    }
    
    // Update time window display - use spots in current window
    updateTimeWindowDisplay(windowSpots);
}

function updateTimelapseDisplay() {
    if (!timelapseCurrentWindowStart || !timelapseDataMinTime || !timelapseDataMaxTime) {
        timelapseTimeDisplayEl.textContent = '--:--';
        return;
    }
    
    const windowSizeMinutes = parseInt(timelapseWindowEl.value) || 10;
    const windowSizeMs = windowSizeMinutes * 60 * 1000;
    const windowEnd = timelapseCurrentWindowStart + windowSizeMs;
    
    const startDate = new Date(timelapseCurrentWindowStart);
    const endDate = new Date(windowEnd);
    const startStr = startDate.toISOString().slice(0, 16).replace('T', ' ');
    const endStr = endDate.toISOString().slice(0, 16).replace('T', ' ');
    timelapseTimeDisplayEl.textContent = `${startStr} - ${endStr} UTC`;
    
    // Update progress slider only if not being dragged
    if (!isDraggingProgress) {
        const totalRange = timelapseDataMaxTime - timelapseDataMinTime;
        const progress = ((timelapseCurrentWindowStart - timelapseDataMinTime) / totalRange) * 100;
        timelapseProgressEl.value = Math.min(100, Math.max(0, progress));
    }
}

function playTimelapse() {
    if (timelapseIsPlaying || !timelapseModeEl.checked) return;
    if (!timelapseAllSpots.length || !timelapseDataMinTime || !timelapseDataMaxTime) return;
    
    timelapseIsPlaying = true;
    timelapseStartTime = Date.now();
    const startWindowStart = timelapseCurrentWindowStart;
    const windowSizeMinutes = parseInt(timelapseWindowEl.value) || 10;
    const windowSizeMs = windowSizeMinutes * 60 * 1000;
    
    timelapsePlayPauseEl.textContent = '⏸ Pause';
    
    // Track last rendered window to avoid unnecessary re-renders
    // Initialize to current window (rounded to nearest second)
    let lastRenderedWindowStart = Math.floor(timelapseCurrentWindowStart / 1000) * 1000;
    
    function animate() {
        if (!timelapseIsPlaying) return;
        
        const showHeatmap = heatmapModeEl && heatmapModeEl.checked;
        
        // If heatmap mode is on, wait for heatmap to render before advancing
        if (showHeatmap && heatmapRenderFrames < heatmapRenderWaitFrames) {
            // Increment frame counter and wait
            heatmapRenderFrames++;
            
            // If we have pending heatmap data and we've waited enough, swap it in
            if (pendingHeatmapData && heatmapRenderFrames >= heatmapRenderWaitFrames) {
                currentHeatmapData = pendingHeatmapData;
                pendingHeatmapData = null;
                globe.heatmapsData([currentHeatmapData]);
                heatmapRenderFrames = 0; // Reset counter for new heatmap
            }
            
            timelapseAnimation = requestAnimationFrame(animate);
            return;
        }
        
        const speed = parseFloat(timelapseSpeedEl.value);
        const elapsed = (Date.now() - timelapseStartTime) * speed;
        // Move window forward: each millisecond of animation time = 1ms of real time
        const newWindowStart = startWindowStart + elapsed;
        
        // Calculate max window start (when window would extend past data)
        const maxWindowStart = timelapseDataMaxTime - windowSizeMs;
        
        if (newWindowStart >= maxWindowStart) {
            // Reached end
            timelapseCurrentWindowStart = maxWindowStart;
            stopTimelapse();
            updateTimelapseDisplay();
            // Only render if window actually changed
            if (lastRenderedWindowStart !== maxWindowStart) {
                renderTimelapseWindow();
                lastRenderedWindowStart = maxWindowStart;
            }
        } else {
            // Only update and render if the window has actually changed
            // Round to nearest second to avoid micro-updates
            const roundedWindowStart = Math.floor(newWindowStart / 1000) * 1000;
            
            if (lastRenderedWindowStart !== roundedWindowStart) {
                timelapseCurrentWindowStart = roundedWindowStart;
                updateTimelapseDisplay();
                renderTimelapseWindow();
                lastRenderedWindowStart = roundedWindowStart;
            }
            
            // Continue animation - will wait for heatmap if needed
            timelapseAnimation = requestAnimationFrame(animate);
        }
    }
    
    timelapseAnimation = requestAnimationFrame(animate);
}

function pauseTimelapse() {
    timelapseIsPlaying = false;
    if (timelapseAnimation) {
        cancelAnimationFrame(timelapseAnimation);
        timelapseAnimation = null;
    }
    timelapsePlayPauseEl.textContent = '▶ Play';
}

function stopTimelapse() {
    pauseTimelapse();
}

function resetTimelapse() {
    stopTimelapse();
    if (timelapseDataMinTime) {
        timelapseCurrentWindowStart = timelapseDataMinTime;
        updateTimelapseDisplay();
        renderTimelapseWindow();
    }
}

// Event listeners for time-lapse
timelapseModeEl.addEventListener('change', toggleTimelapseMode);
timelapsePlayPauseEl.addEventListener('click', () => {
    if (timelapseIsPlaying) {
        pauseTimelapse();
    } else {
        playTimelapse();
    }
});
timelapseResetEl.addEventListener('click', resetTimelapse);
timelapseSpeedEl.addEventListener('change', () => {
    // Restart animation with new speed if playing
    if (timelapseIsPlaying) {
        pauseTimelapse();
        playTimelapse();
    }
});

timelapseWindowEl.addEventListener('change', () => {
    // Reinitialize if we have data
    if (timelapseModeEl.checked && currentSpots && currentSpots.length > 0) {
        initializeTimelapse();
    }
});

let wasPlayingBeforeDrag = false;
let isDraggingProgress = false;

timelapseProgressEl.addEventListener('mousedown', () => {
    wasPlayingBeforeDrag = timelapseIsPlaying;
    isDraggingProgress = true;
    if (timelapseIsPlaying) pauseTimelapse();
});

timelapseProgressEl.addEventListener('input', (e) => {
    if (!timelapseDataMinTime || !timelapseDataMaxTime) return;
    
    const windowSizeMinutes = parseInt(timelapseWindowEl.value) || 10;
    const windowSizeMs = windowSizeMinutes * 60 * 1000;
    const totalRange = timelapseDataMaxTime - timelapseDataMinTime;
    const maxWindowStart = timelapseDataMaxTime - windowSizeMs;
    
    const progress = parseFloat(e.target.value) / 100;
    timelapseCurrentWindowStart = timelapseDataMinTime + (maxWindowStart - timelapseDataMinTime) * progress;
    
    // Don't update display during drag to avoid slider jumping
    if (!isDraggingProgress) {
        updateTimelapseDisplay();
    } else {
        // Just update time display, not slider
        const windowEnd = timelapseCurrentWindowStart + windowSizeMs;
        const startDate = new Date(timelapseCurrentWindowStart);
        const endDate = new Date(windowEnd);
        const startStr = startDate.toISOString().slice(0, 16).replace('T', ' ');
        const endStr = endDate.toISOString().slice(0, 16).replace('T', ' ');
        timelapseTimeDisplayEl.textContent = `${startStr} - ${endStr} UTC`;
    }
    renderTimelapseWindow();
});

timelapseProgressEl.addEventListener('mouseup', () => {
    isDraggingProgress = false;
    if (wasPlayingBeforeDrag) {
        setTimeout(() => playTimelapse(), 100);
    }
    wasPlayingBeforeDrag = false;
});

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

function shouldExcludeCallsign(sign) {
    if (!sign) return false;
    const s = String(sign).trim().toUpperCase();
    if (s.length === 0) return false;
    const c0 = s[0];
    return c0 === '0' || c0 === '1' || c0 === 'Q';
}

function isWeirdCallsignFilterEnabled() {
    return !!(excludeWeirdCallsignsEl && excludeWeirdCallsignsEl.checked);
}

function filterSpotsByCallsignPrefix(spots) {
    if (!isWeirdCallsignFilterEnabled()) return spots;
    return spots.filter(s => !shouldExcludeCallsign(s.tx_sign) && !shouldExcludeCallsign(s.rx_sign));
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
        // Identify the Earth mesh (the mesh with a texture map) so we can patch its shader later.
        // We intentionally avoid relying on window.THREE because globe.gl may bundle Three internally.
        globe.scene().traverse(obj => {
            if (!earthMeshForTerminator && obj && obj.type === 'Mesh' && obj.material && obj.material.map) {
                earthMeshForTerminator = obj;
            }
        });

        globe.scene().traverse(obj => {
            if (obj.type === 'Mesh' && obj.material && obj.material.map) {
                const texture = obj.material.map;
                texture.generateMipmaps = false;
                texture.minFilter = 1006;
                texture.magFilter = 1006;
                texture.needsUpdate = true;
            }
        });

        // If terminator is enabled on load (e.g., via future URL params), initialize it
        if (showTerminatorEl && showTerminatorEl.checked) {
            enableDayNightTerminator(true);
        }
    });

// --- Day/Night terminator (start with a simple line; shading later) ---
let earthMeshForTerminator = null;
let terminatorIntervalId = null;
let terminatorShadeMesh = null;
let terminatorShadeUniforms = null; // { uSunDir, uTwilight, uMaxAlpha, uTint }
let terminatorShadeHasCompiled = false;
// Debug flag for diagnosing terminator issues. Keep false for normal use.
const TERMINATOR_DEBUG = false;

function normalizeLng180(deg) {
    let x = deg % 360;
    if (x > 180) x -= 360;
    if (x < -180) x += 360;
    return x;
}

function getSubsolarPoint(date = new Date()) {
    // Approx solar position (good visual accuracy): returns { lat, lng } in degrees (lng east-positive)
    const JD = date.getTime() / 86400000 + 2440587.5;
    const n = JD - 2451545.0; // days since J2000

    const deg2rad = Math.PI / 180;
    const rad2deg = 180 / Math.PI;

    // Mean longitude & anomaly
    let L = (280.460 + 0.9856474 * n) % 360;
    let g = (357.528 + 0.9856003 * n) % 360;
    if (L < 0) L += 360;
    if (g < 0) g += 360;

    const gRad = g * deg2rad;
    const lambda = (L + 1.915 * Math.sin(gRad) + 0.020 * Math.sin(2 * gRad)) * deg2rad; // ecliptic longitude
    const epsilon = (23.439 - 0.0000004 * n) * deg2rad; // obliquity

    // Declination
    const sinDecl = Math.sin(epsilon) * Math.sin(lambda);
    const decl = Math.asin(sinDecl);

    // Right ascension
    const y = Math.cos(epsilon) * Math.sin(lambda);
    const x = Math.cos(lambda);
    let ra = Math.atan2(y, x) * rad2deg; // degrees
    if (ra < 0) ra += 360;

    // Greenwich Mean Sidereal Time (deg)
    let GMST = (280.46061837 + 360.98564736629 * n) % 360;
    if (GMST < 0) GMST += 360;

    // Subsolar longitude = RA - GMST (east-positive), normalized
    const subsolarLng = normalizeLng180(ra - GMST);
    const subsolarLat = decl * rad2deg;

    return { lat: subsolarLat, lng: subsolarLng };
}

function latLngToVector3(latDeg, lngDeg, radius = 1) {
    const lat = (latDeg * Math.PI) / 180;
    const lng = (lngDeg * Math.PI) / 180;
    const cosLat = Math.cos(lat);
    return {
        x: radius * cosLat * Math.cos(lng),
        y: radius * Math.sin(lat),
        z: radius * cosLat * Math.sin(lng)
    };
}

function getSunDirUnitVector(date = new Date()) {
    const sun = getSubsolarPoint(date);
    const v = latLngToVector3(sun.lat, sun.lng, 1);
    const len = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / len, y: v.y / len, z: v.z / len };
}

// The terminator line uses lat/lng (globe.gl's own mapping), and it appears correct.
// The shading overlay, however, needs to match globe.gl's internal sphere orientation.
// Empirically, globe.gl's lon=0 axis is rotated 90° vs our simple x=cos(lon), z=sin(lon) convention.
// So we rotate the sun direction around +Y by +90°: (x, z) -> (z, -x).
function getSunDirUnitVectorForShading(date = new Date()) {
    // Best: use globe.gl's own coordinate conversion so the shading matches the rendered globe exactly.
    // This avoids any constant longitude/yaw offset ("~1 hour lag") caused by coordinate-frame mismatch.
    try {
        if (globe && typeof globe.getCoords === 'function') {
            const sun = getSubsolarPoint(date);
            const v = globe.getCoords(sun.lat, sun.lng);
            // v can be {x,y,z} or an array-like; handle both
            const [x, y, z] = Array.isArray(v)
                ? v
                : (() => {
                    const { x, y, z } = v || {};
                    return [x, y, z];
                })();
            const len = Math.hypot(x, y, z) || 1;
            return { x: x / len, y: y / len, z: z / len };
        }
    } catch (_) {
        // Fall back below
    }

    // Fallback (older builds): empirical +90° yaw correction.
    // If you ever see a consistent east/west lag, tweak this offset.
    const SHADE_LON_OFFSET_DEG = 0;
    const { x: sx, y: sy, z: sz } = getSunDirUnitVector(date);
    // yaw +90
    let x = sz;
    let y = sy;
    let z = -sx;
    if (SHADE_LON_OFFSET_DEG !== 0) {
        const a = (SHADE_LON_OFFSET_DEG * Math.PI) / 180;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const x2 = x * ca + z * sa;
        const z2 = -x * sa + z * ca;
        x = x2;
        z = z2;
    }
    const len = Math.hypot(x, y, z) || 1;
    return { x: x / len, y: y / len, z: z / len };
}

function ensureTerminatorShadeOverlay() {
    if (!earthMeshForTerminator || !earthMeshForTerminator.geometry || !earthMeshForTerminator.material) return null;
    if (terminatorShadeMesh) return terminatorShadeMesh;

    // Use constructors from globe.gl internal THREE via existing objects
    const MeshCtor = earthMeshForTerminator.constructor;
    const Vec3Ctor = earthMeshForTerminator.position && earthMeshForTerminator.position.constructor;
    // Some materials don't expose `.color` (or the globe mesh may use an array of materials),
    // so we avoid depending on THREE.Color here. We'll use Vec3 for tint instead.
    if (!MeshCtor || !Vec3Ctor) {
        if (TERMINATOR_DEBUG) {
            console.warn('[terminator] cannot build overlay: missing constructors', {
                MeshCtor: !!MeshCtor,
                Vec3Ctor: !!Vec3Ctor,
                materialIsArray: Array.isArray(earthMeshForTerminator.material)
            });
        }
        return null;
    }

    const geom = earthMeshForTerminator.geometry.clone();
    const baseMat = Array.isArray(earthMeshForTerminator.material)
        ? earthMeshForTerminator.material[0]
        : earthMeshForTerminator.material;

    // IMPORTANT: Do NOT clone the earth material. Some globe.gl/three bundles have materials
    // where `color` (or similar) can be null, and internal `.clone()` then crashes (reading `.r`).
    // Instead, create a fresh material instance from the internal THREE constructor (safe defaults).
    const BaseMatCtor = baseMat && baseMat.constructor ? baseMat.constructor : null;
    if (!BaseMatCtor) {
        if (TERMINATOR_DEBUG) {
            console.warn('[terminator] cannot build overlay: missing base material constructor', {
                hasBaseMat: !!baseMat,
                materialIsArray: Array.isArray(earthMeshForTerminator.material)
            });
        }
        return null;
    }

    let mat;
    try {
        mat = new BaseMatCtor({});
    } catch (e) {
        if (TERMINATOR_DEBUG) {
            console.warn('[terminator] cannot build overlay: failed to instantiate base material ctor', e);
        }
        return null;
    }

    // Make it a transparent overlay.
    // IMPORTANT: keep depthTest ON so the far side of the overlay does not project onto the near side.
    // Keep depthWrite OFF so we don't interfere with arcs/points.
    mat.transparent = true;
    mat.depthTest = true;
    mat.depthWrite = false;
    mat.opacity = 1;
    // Render only front faces to avoid "double" shading from backfaces.
    // (FrontSide = 0 in three.js)
    mat.side = 0;
    // Remove texture influences (we'll output our own color)
    if ('map' in mat) mat.map = null;
    if ('emissiveMap' in mat) mat.emissiveMap = null;
    if ('specularMap' in mat) mat.specularMap = null;
    if ('bumpMap' in mat) mat.bumpMap = null;
    if ('normalMap' in mat) mat.normalMap = null;

    mat.onBeforeCompile = (shader) => {
        const sunDir = getSunDirUnitVectorForShading(new Date());
        shader.uniforms.uSunDir = { value: new Vec3Ctor(sunDir.x, sunDir.y, sunDir.z) };
        shader.uniforms.uTwilight = { value: 0.10 }; // edge softness (slightly wider for smoother transition)
        shader.uniforms.uMaxAlpha = { value: 0.70 }; // night darkness (more visible)
        // vec3 tint: night-side tint color
        shader.uniforms.uTint = {
            // Pure black night tint (no blue cast)
            value: new Vec3Ctor(0.0, 0.0, 0.0)
        };
        terminatorShadeUniforms = shader.uniforms;

        // Fully override shaders for robustness (no dependency on three.js chunk includes)
        shader.vertexShader = `
          varying vec3 vWorldNormal;
          void main() {
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `;

        shader.fragmentShader = `
          precision highp float;
          varying vec3 vWorldNormal;
          uniform vec3 uSunDir;
          uniform float uTwilight;
          uniform float uMaxAlpha;
          uniform vec3 uTint;
          void main() {
            vec3 n = normalize(vWorldNormal);
            float d = dot(n, normalize(uSunDir));
            float day = smoothstep(-uTwilight, uTwilight, d);
            float nightAlpha = (1.0 - day) * uMaxAlpha;
            gl_FragColor = vec4(uTint, nightAlpha);
          }
        `;

        terminatorShadeHasCompiled = true;
        if (TERMINATOR_DEBUG) {
            console.log('[terminator] overlay shader compiled');
        }
    };

    // Force unique program
    mat.customProgramCacheKey = () => 'wspr-terminator-shade-v1';

    terminatorShadeMesh = new MeshCtor(geom, mat);
    terminatorShadeMesh.renderOrder = 3;
    terminatorShadeMesh.frustumCulled = false;
    if (terminatorShadeMesh.scale && terminatorShadeMesh.scale.setScalar) {
        // Slightly above the globe to avoid z-fighting while still respecting depth.
        terminatorShadeMesh.scale.setScalar(1.012);
    }

    // Match Earth transform (rotation/position) so shading aligns with texture orientation
    if (terminatorShadeMesh.position && earthMeshForTerminator.position && terminatorShadeMesh.position.copy) {
        terminatorShadeMesh.position.copy(earthMeshForTerminator.position);
    }
    if (terminatorShadeMesh.quaternion && earthMeshForTerminator.quaternion && terminatorShadeMesh.quaternion.copy) {
        terminatorShadeMesh.quaternion.copy(earthMeshForTerminator.quaternion);
    }

    // Force shader compilation with our onBeforeCompile changes
    mat.needsUpdate = true;
    return terminatorShadeMesh;
}

function updateTerminatorShade() {
    if (!terminatorShadeUniforms || !terminatorShadeUniforms.uSunDir || !terminatorShadeUniforms.uSunDir.value) return;
    const sunDir = getSunDirUnitVectorForShading(new Date());
    terminatorShadeUniforms.uSunDir.value.set(sunDir.x, sunDir.y, sunDir.z);
}

function updateTerminatorVisuals() {
    updateTerminatorShade();
}

function enableDayNightTerminator(enabled) {
    if (!globe || !globe.scene) return;

    if (terminatorIntervalId) {
        clearInterval(terminatorIntervalId);
        terminatorIntervalId = null;
    }

    if (!enabled) {
        // Clear any legacy terminator line if present
        if (typeof globe.pathsData === 'function') globe.pathsData([]);
        if (terminatorShadeMesh) {
            globe.scene().remove(terminatorShadeMesh);
        }
        return;
    }

    // Add shading overlay mesh
    const shade = ensureTerminatorShadeOverlay();
    if (shade && globe.scene && !globe.scene().children.includes(shade)) {
        globe.scene().add(shade);
    }
    if (terminatorShadeMesh && terminatorShadeMesh.material) {
        // Force recompile on enable (useful after hot reloads / toggles)
        terminatorShadeMesh.material.needsUpdate = true;
    }

    // Ensure no sharp terminator line is displayed
    if (typeof globe.pathsData === 'function') globe.pathsData([]);

    updateTerminatorVisuals();
    terminatorIntervalId = setInterval(updateTerminatorVisuals, 60000);
}

if (showTerminatorEl) {
    showTerminatorEl.addEventListener('change', () => {
        enableDayNightTerminator(showTerminatorEl.checked);
    });
}

// Handle resize
function resize() {
    globe.width(container.clientWidth);
    globe.height(container.clientHeight);
    // Update header/footer position on resize
    checkMobile();
}
window.addEventListener('resize', resize);
resize();

// Update status
function setStatus(message, type = '') {
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
}

// Update time window display on globe
function updateTimeWindowDisplay(spots) {
    if (!timeWindowDisplayEl) {
        console.error('timeWindowDisplayEl not found!');
        return;
    }
    
    if (!spots || spots.length === 0) {
        timeWindowDisplayEl.classList.remove('visible');
        return;
    }
    
    // Get time range from spots
    const times = spots.map(spot => {
        let timeStr = spot.time;
        if (typeof timeStr === 'string' && !timeStr.includes('Z') && !timeStr.includes('+') && !timeStr.includes('-', 10)) {
            timeStr = timeStr.replace(' ', 'T') + 'Z';
        }
        return new Date(timeStr).getTime();
    }).filter(t => !isNaN(t));
    
    if (times.length === 0) {
        timeWindowDisplayEl.classList.remove('visible');
        return;
    }
    
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    const startDate = new Date(minTime);
    const endDate = new Date(maxTime);
    const startStr = startDate.toISOString().slice(0, 16).replace('T', ' ');
    const endStr = endDate.toISOString().slice(0, 16).replace('T', ' ');
    
    timeWindowDisplayEl.textContent = `${startStr} - ${endStr} UTC`;
    timeWindowDisplayEl.classList.add('visible');
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

                // Exclude callsigns starting with 0, 1, or Q (TX and RX)
                if (isWeirdCallsignFilterEnabled()) {
                    // Prefer LIKE for maximum SQL dialect compatibility (callsigns are typically stored uppercase).
                    query += ` AND NOT (rx_sign LIKE '0%' OR rx_sign LIKE '1%' OR rx_sign LIKE 'Q%' OR tx_sign LIKE '0%' OR tx_sign LIKE '1%' OR tx_sign LIKE 'Q%')`;
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
            timeWindowDisplayEl.classList.remove('visible');
            loadBtn.disabled = false;
            return;
        }

        // Store spots for re-rendering (apply client-side safety filter too)
        currentSpots = filterSpotsByCallsignPrefix(data.data);

        // Render the data
        rerenderData();
        
        // Initialize time-lapse if enabled
        if (timelapseModeEl.checked && !beaconModeEl.checked) {
            initializeTimelapse();
        }
        
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
    const isTimelapse = timelapseModeEl.checked;
    
    // Time-lapse mode overrides normal rendering
    if (isTimelapse && !isBeaconMode) {
        // Don't initialize here if already initialized - just render current window
        if (timelapseAllSpots.length === 0) {
            initializeTimelapse();
        } else {
            renderTimelapseWindow();
        }
        const windowSize = parseInt(timelapseWindowEl.value) || 10;
        setStatus(`Time-lapse ready: ${currentSpots.length} spots, ${windowSize}-minute windows`, 'success');
        return;
    }
    
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
    
    const spots = filterSpotsByCallsignPrefix(currentSpots);
    for (const spot of spots) {
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

    // Apply max lines to display limit (randomly sample if needed)
    const maxLinesToDisplay = maxLinesToDisplayEl.value;
    if (maxLinesToDisplay !== 'all' && arcs.length > parseInt(maxLinesToDisplay)) {
        // Randomly shuffle and take first N
        for (let i = arcs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arcs[i], arcs[j]] = [arcs[j], arcs[i]];
        }
        arcs.splice(parseInt(maxLinesToDisplay));
        
        // Also filter txLocations and rxLocations to only include those in sampled arcs
        const sampledTxLocs = new Set();
        const sampledRxLocs = new Set();
        arcs.forEach(arc => {
            sampledTxLocs.add(arc.spot.tx_loc);
            sampledRxLocs.add(arc.spot.rx_loc);
        });
        
        // Filter location maps
        const filteredTxLocations = new Map();
        const filteredRxLocations = new Map();
        txLocations.forEach((loc, key) => {
            if (sampledTxLocs.has(key)) filteredTxLocations.set(key, loc);
        });
        rxLocations.forEach((loc, key) => {
            if (sampledRxLocs.has(key)) filteredRxLocations.set(key, loc);
        });
        
        // Update references
        txLocations.clear();
        rxLocations.clear();
        filteredTxLocations.forEach((v, k) => txLocations.set(k, v));
        filteredRxLocations.forEach((v, k) => rxLocations.set(k, v));
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
        
        // If max lines to display is set, only use spots from sampled arcs
        const maxLinesToDisplay = maxLinesToDisplayEl.value;
        let spotsToUse = filterSpotsByCallsignPrefix(currentSpots);
        if (maxLinesToDisplay !== 'all' && arcs.length > 0) {
            // Use only spots that match the sampled arcs
            const sampledPaths = new Set();
            arcs.forEach(arc => {
                const locs = [arc.spot.tx_loc, arc.spot.rx_loc].sort();
                sampledPaths.add(`${locs[0]}-${locs[1]}`);
            });
            spotsToUse = spotsToUse.filter(spot => {
                const locs = [spot.tx_loc, spot.rx_loc].sort();
                return sampledPaths.has(`${locs[0]}-${locs[1]}`);
            });
        }
        
        // Count spots at each location - use coarser grid (1 degree) for performance
        for (const spot of spotsToUse) {
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
    
    // Update time window display - use filtered spots for accurate time range
    if (currentSpots && currentSpots.length > 0) {
        const baseSpots = filterSpotsByCallsignPrefix(currentSpots);
        const filteredSpots = showHeatmap ? baseSpots : baseSpots.filter(spot => {
            const freqMHz = spot.frequency / 1000000;
            return isFrequencySelected(freqMHz);
        });
        updateTimeWindowDisplay(filteredSpots);
    } else {
        updateTimeWindowDisplay([]);
    }
}

// Render beacon points (beacon mode)
function renderBeaconPoints() {
    const points = [];
    const pathArcs = [];
    const seen = new Set();
    
    // Sort spots by time (oldest first)
    const sortedSpots = [...filterSpotsByCallsignPrefix(currentSpots)].sort((a, b) => 
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
    
    // Update time window display for beacon mode
    updateTimeWindowDisplay(sortedSpots);
}

// Alias for backward compatibility
function rerenderArcs() {
    rerenderData();
}

// Event listeners
loadBtn.addEventListener('click', loadWSPRData);

// Share button - generate and copy URL to clipboard
shareBtn.addEventListener('click', async () => {
    const shareURL = generateShareURL();
    
    try {
        // Try to copy to clipboard
        await navigator.clipboard.writeText(shareURL);
        setStatus('Share link copied to clipboard!', 'success');
        
        // Show the URL in an alert or prompt so user can see it
        setTimeout(() => {
            const userConfirmed = confirm(`Share link copied to clipboard!\n\n${shareURL}\n\nClick OK to open in new tab, or Cancel to close.`);
            if (userConfirmed) {
                window.open(shareURL, '_blank');
            }
        }, 100);
    } catch (err) {
        // Fallback if clipboard API fails - show in prompt
        const shareText = `Share this link:\n\n${shareURL}`;
        prompt('Copy this link:', shareURL);
        setStatus('Share link generated (see prompt)', 'success');
    }
});
animateLinesEl.addEventListener('change', () => {
    if (timelapseModeEl.checked) {
        renderTimelapseWindow();
    } else {
        rerenderArcs();
    }
});
solidLinesEl.addEventListener('change', () => {
    if (timelapseModeEl.checked) {
        renderTimelapseWindow();
    } else {
        rerenderArcs();
    }
});
showMarkersEl.addEventListener('change', () => {
    if (timelapseModeEl.checked) {
        renderTimelapseWindow();
    } else {
        rerenderArcs();
    }
});
heatmapModeEl.addEventListener('change', () => {
    if (timelapseModeEl.checked) {
        renderTimelapseWindow();
    } else {
        rerenderArcs();
    }
});

if (excludeWeirdCallsignsEl) {
    excludeWeirdCallsignsEl.addEventListener('change', () => {
        if (timelapseModeEl.checked) {
            renderTimelapseWindow();
        } else {
            rerenderArcs();
        }
    });
}

// Auto-update display when Max Lines to Display changes
maxLinesToDisplayEl.addEventListener('change', () => {
    if (currentSpots && currentSpots.length > 0) {
        if (timelapseModeEl.checked) {
            renderTimelapseWindow();
        } else {
            rerenderData();
        }
    }
});

// Apply URL parameters on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const hasParams = applyURLParameters();
        
        // Auto-load if 'autoLoad' parameter is set or if any parameters are present
        const params = parseURLParameters();
        if (params.autoLoad === 'true' || params.autoLoad === '1' || (hasParams && params.autoLoad !== 'false')) {
            // Small delay to ensure all fields are set
            setTimeout(() => {
                loadBtn.click();
            }, 100);
        }
    });
} else {
    // DOM already loaded, apply immediately
    const hasParams = applyURLParameters();
    const params = parseURLParameters();
    if (params.autoLoad === 'true' || params.autoLoad === '1' || (hasParams && params.autoLoad !== 'false')) {
        setTimeout(() => {
            loadBtn.click();
        }, 100);
    }
}

