# WSPR Plot - Development Notes

## Overview
A web-based application for plotting WSPR (Weak Signal Propagation Reporter) spots on an interactive 3D globe.

## Technology Stack
- **Globe Visualization**: [globe.gl](https://github.com/vasturiano/globe.gl) - WebGL-based 3D globe library built on Three.js
- **Data Source**: [wspr.live](https://wspr.live) API - Real-time WSPR spot database
- **Frontend**: Vanilla HTML/CSS/JavaScript (no build tools required)

## Earth Texture

### Source
NASA Earth Observatory "Blue Marble" imagery:
- URL: `https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57752/land_shallow_topo_8192.tif`
- Downloaded as TIFF, converted to JPEG using macOS `sips` command
- Final file: `earth_8k.jpg` (8192x4096 pixels, ~6MB)

### Polar Artifact Fix
Equirectangular textures on spheres cause visual artifacts at the poles due to triangle convergence and mipmapping. The fix:

```javascript
.onGlobeReady(() => {
    globe.scene().traverse(obj => {
        if (obj.type === 'Mesh' && obj.material && obj.material.map) {
            const texture = obj.material.map;
            // Disable mipmapping to prevent polar artifacts when zoomed out
            texture.generateMipmaps = false;
            texture.minFilter = 1006; // THREE.LinearFilter
            texture.magFilter = 1006; // THREE.LinearFilter
            texture.needsUpdate = true;
        }
    });
});
```

**Key insight**: The polar artifacts appeared worse when zoomed out but disappeared when zoomed in, indicating a mipmapping/texture filtering issue rather than a geometry problem. Disabling mipmaps and using linear filtering resolved this.

### Other Textures Tried
- `earth2.jpg` - Lower resolution (2048px), fewer polar artifacts but blurry when zoomed
- `earth.jpg` - Blue Marble from three-globe examples, had issues loading via URL
- Canvas-generated textures - Worked but low quality

## Globe Configuration

### Atmosphere
Disabled (`showAtmosphere(false)`) because:
- It was darkening the edges of the globe excessively
- Adding emissive properties to compensate washed out the colors

### Graticules
Enabled (`showGraticules(true)`) for lat/lon grid overlay.

## WSPR Data Integration

### API
Using wspr.live ClickHouse database:
```
https://db1.wspr.live/?query=SELECT * FROM wspr.rx WHERE ... FORMAT JSON
```

### Maidenhead Grid Conversion
Converts 4 or 6 character grid squares to lat/lng:
```javascript
function gridToLatLng(grid) {
    // Handles both 4-char (e.g., "FN31") and 6-char (e.g., "FN31pr") grids
    // Returns center point of the grid square
}
```

### Arc Visualization
- **Colors**: Based on frequency band (137 kHz to 144 MHz spectrum)
- **Animation**: Dotted pattern (`arcDashLength: 0.05`, `arcDashGap: 0.03`)
- **Height**: Auto-scaled based on path length (`arcAltitudeAutoScale: 0.3`)
- **Deduplication**: Same TX-RX grid pairs only drawn once

## File Structure
```
WSPR_Plot/
├── index.html      # Main HTML structure
├── styles.css      # CSS styles
├── app.js          # JavaScript application logic
├── earth_8k.jpg    # High-res Earth texture (8192x4096)
└── agent.md        # This file
```

## Running Locally
```bash
cd WSPR_Plot
python3 -m http.server 8001
# Open http://localhost:8001
```

## Known Limitations
1. **Polar texture quality**: Still not perfect at extreme zoom-out on poles
2. **Performance**: Large numbers of arcs (50,000+) may slow rendering
3. **No persistence**: Search results are not saved between sessions

## Future Improvements
- Add frequency band filtering
- Save/load favorite searches
- Export data as CSV/KML
- Add transmitter/receiver markers
- Day/night terminator overlay

