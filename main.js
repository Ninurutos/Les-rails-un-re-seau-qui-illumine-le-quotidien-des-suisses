const width  = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", "#05050a")
    .style("overflow", "visible");

// tooltip
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "rgba(0,0,0,0.95)")
    .style("color", "#00f2ff")
    .style("padding", "10px 14px")
    .style("border", "1px solid #00f2ff")
    .style("border-radius", "6px")
    .style("pointer-events", "none")
    .style("font-family", "monospace")
    .style("font-size", "12px")
    .style("z-index", "2000");

// légendes des fréquences
const legend = d3.select("body").append("div")
    .style("position", "fixed")
    .style("bottom", "30px")
    .style("right", "30px")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("border", "1px solid #00f2ff44")
    .style("padding", "12px")
    .style("border-radius", "8px")
    .style("color", "#00f2ff")
    .style("font-family", "monospace")
    .style("font-size", "11px");

legend.append("div").style("margin-bottom", "8px").text("TRAFIC FERROVIAIRE");
legend.append("div")
    .style("width", "150px")
    .style("height", "8px")
    .style("background", "linear-gradient(to right, #440154, #3b528b, #21918c, #5ec962, #fde725)")
    .style("border-radius", "2px");
const labels = legend.append("div")
    .style("display", "flex")
    .style("justify-content", "space-between")
    .style("margin-top", "4px");
labels.append("span").text("Faible");
labels.append("span").text("Intense");

// panneau de recherche 
const panel = d3.select("body").append("div")
    .attr("id", "search-panel")
    .style("position", "fixed")
    .style("top", "20px")
    .style("left", "20px")
    .style("background", "rgba(0,0,0,0.9)")
    .style("border", "1px solid #00f2ff")
    .style("border-radius", "8px")
    .style("padding", "16px")
    .style("color", "#00f2ff")
    .style("font-family", "monospace")
    .style("z-index", "1000")
    .style("width", "280px");

panel.append("div")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .style("margin-bottom", "15px")
    .text("🔍 ITINÉRAIRE");

const createInput = (label, id, placeholder) => {
    panel.append("label").text(label).style("font-size", "10px").style("opacity", "0.6");
    const input = panel.append("input")
        .attr("id", id)
        .attr("type", "text")
        .attr("placeholder", placeholder)
        .style("display", "block")
        .style("width", "100%")
        .style("margin", "4px 0 12px")
        .style("background", "#0a0a1a")
        .style("color", "#00f2ff")
        .style("border", "1px solid #00f2ff44")
        .style("padding", "6px")
        .style("font-family", "monospace")
        .style("box-sizing", "border-box");
    return input;
};

const originInput = createInput("DÉPART", "origin-input", "ex: Chur");
const destInput = createInput("ARRIVÉE", "dest-input", "ex: Schaffhausen");
panel.append("datalist").attr("id", "cities-list");
originInput.attr("list", "cities-list");
destInput.attr("list", "cities-list");

const searchBtn = panel.append("button")
    .attr("id", "search-btn")
    .text("TROUVER LE TRAJET")
    .style("background", "#00f2ff22")
    .style("color", "#00f2ff")
    .style("border", "1px solid #00f2ff")
    .style("width", "100%")
    .style("padding", "8px")
    .style("cursor", "pointer")
    .style("font-family", "monospace");

const resetBtn = panel.append("button")
    .text("EFFACER")
    .style("background", "none")
    .style("color", "#ff4466")
    .style("border", "none")
    .style("width", "100%")
    .style("margin-top", "8px")
    .style("cursor", "pointer")
    .style("font-family", "monospace")
    .style("display", "none");

const resultBox = panel.append("div")
    .style("margin-top", "15px")
    .style("font-size", "11px");

// projections et fonctions utilitaires
const projection = d3.geoMercator()
    .center([8.2275, 46.8])
    .scale(13000)
    .translate([(width / 2) + 350, height / 2]);

const geoPath = d3.geoPath().projection(projection);

const descLabels = {"TGV":"TGV Lyria", "IC":"InterCity", "IR":"InterRegio", "RE":"RegioExpress", "S":"S-Bahn", "R":"Regio"};
const ROUTE_COLORS = ["#ff3355", "#ffaa00", "#00ff99"];

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    // ajustement de la formule de Haversine pour calculer la distance entre deux points géographiques (aide IA générative)
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
// Cette fonction et la suivante ont été optimisées par IA générative
function normCity(str) {
    return str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").trim() : "";
}

function cityMatches(a, b) {
    if (!a || !b) return false;
    const wordsA = a.split(/\s+/), wordsB = b.split(/\s+/);
    return wordsB.some(wb => wordsA.some(wa => wa === wb || (wa.startsWith(wb) && wb.length >= 5)));
}

function buildResultHTML(options) {
    if (!options.length) return '<span style="color:#ff4466">❌ Aucun trajet trouvé</span>';

    let html = `<div style="color:#00f2ff; font-weight:bold; margin-bottom:12px; border-bottom:1px solid #00f2ff44; padding-bottom:5px;">OPTIONS DISPONIBLES</div>`;

    options.forEach((opt, idx) => {
        const color = ROUTE_COLORS[idx] || "#fff";
        const duration = `${Math.floor(opt.totalDuration/60)}h${String(opt.totalDuration%60).padStart(2,'0')}`;

        html += `<div style="margin-bottom:20px; border-left:3px solid ${color}; padding-left:10px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <b style="color:${color}; font-size:12px;">${opt.type}</b>
                <span style="color:#fff; opacity:0.7;">${duration}</span>
            </div>`;

        opt.segments.forEach((seg, i) => {
            const p = seg.feature.properties;
            const typeLabel = descLabels[p.route_desc] || p.route_desc;
            const stops = p.stops_data;
            const from = stops[seg.oIdx].name;
            const to = stops[seg.dIdx].name;

            html += `<div style="margin-left:5px; border-left:1px dashed #444; padding-left:10px; position:relative; margin-top:5px; padding-bottom:5px;">
                        <div style="position:absolute; left:-4px; top:0; width:7px; height:7px; background:${color}; border-radius:50%;"></div>
                        <div style="color:#fff; font-size:11px;">${typeLabel} <b style="color:#00f2ff;">${p.route_id}</b></div>
                        <div style="color:#888; font-size:10px;">${from} → ${to}</div>
                     </div>`;

            if (opt.transferCities[i]) {
                html += `<div style="margin:5px 0 10px 15px; color:#ffaa00; font-size:10px; font-weight:bold;">
                            🔄 Changement : ${opt.transferCities[i]}
                         </div>`;
            }
        });

        html += `</div>`;
    });

    return html;
}

// Charge en parallèle les données géographiques de la Suisse
Promise.all([
    d3.json("https://raw.githubusercontent.com/ZHB/switzerland-geojson/master/country/switzerland.geojson"),
    d3.json("rails_suisse.json")
]).then(([switzerlandData, data]) => {

    // Échelle de couleur
    const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, 45]);

    const mapGroup = svg.append("g").attr("class", "map-group");
    const backgroundGroup = mapGroup.append("g").attr("class", "background-group");
    const railGroup = mapGroup.append("g").attr("class", "rail-group");
    const highlightGroup = mapGroup.append("g").attr("class", "highlight-group");
    let isSearchActive = false;
    let highlightedFeatureIds = new Set();

    // Zoom + drag sur l'ensemble de la carte
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
            mapGroup.attr("transform", event.transform);
        });

    svg.call(zoom);

    // Surface invisible pour capter le drag/zoom partout
    svg.append("rect")
        .attr("class", "zoom-catcher")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "transparent")
        .style("pointer-events", "all")
        .lower();

    // Dessin de la Suisse
    backgroundGroup.selectAll("path")
        .data(switzerlandData.features)
        .enter().append("path")
        .attr("d", geoPath)
        .style("fill", "#0a0a1a")
        .style("stroke", "#00f2ff22");

    // Lignes ferroviaires visibles
    const railLines = railGroup.selectAll(".rail")
        .data(data.features).enter().append("path")
        .attr("class", "rail")
        .attr("d", geoPath)
        .attr("fill", "none")
        .attr("stroke", d => colorScale(d.properties.months?.[5] || 5))
        .attr("stroke-width", d => (d.properties.months?.[5] > 20 ? 1.2 : 0.6))
        .attr("opacity", 0.4)
        .style("mix-blend-mode", "screen")
        .style("cursor", "pointer");

    // Couche invisible plus large pour faciliter le survol à la souris
    const hoverLines = railGroup.selectAll(".hover-rail")
        .data(data.features).enter().append("path")
        .attr("class", "hover-rail")
        .attr("d", geoPath)
        .attr("fill", "none")
        .attr("stroke", "transparent")
        .attr("stroke-width", 8)
        .style("pointer-events", "stroke");

    // Récupère toutes les villes présentes dans les données pour remplir la liste déroulante
    const allCities = new Set();
    data.features.forEach(f => (f.properties.cities || []).forEach(c => allCities.add(c)));
    d3.select("#cities-list").selectAll("option").data(Array.from(allCities).sort()).enter()
        .append("option").attr("value", d => d);

    const stopIndex = [];
    data.features.forEach(f => {
        (f.properties.stops_data || []).forEach((s, i) => {
            stopIndex.push({ name: normCity(s.name), lat: s.lat, lon: s.lon, feature: f, idx: i });
        });
    });

    // Recherche d’itinéraires entre une ville de départ et une ville d’arrivée
    // Fonction réalisée à l'aide d'IA générative
    function findRoutes(orig, dest) {
        const results = [];
        const MAX_DIST = 1.5;

        // Recherche d’itinéraires directs
        data.features.forEach(f => {
            const sd = f.properties.stops_data || [];
            const oIdx = sd.findIndex(s => cityMatches(normCity(s.name), orig));
            if (oIdx === -1) return;
            const dIdx = sd.findIndex((s, i) => i > oIdx && cityMatches(normCity(s.name), dest));
            if (dIdx !== -1) {
                const dur = sd[dIdx].arr_min - sd[oIdx].dep_min;
                results.push({
                    type: "DIRECT",
                    segments: [{ feature: f, oIdx, dIdx, duration: dur }],
                    totalDuration: dur,
                    transferCities: []
                });
            }
        });

        // Si peu de résultats directs, recherche d’un trajet avec correspondance
        if (results.length < 3) {
            const fromOrigin = stopIndex.filter(s => cityMatches(s.name, orig));
            const toDest = stopIndex.filter(s => cityMatches(s.name, dest));

            fromOrigin.forEach(ol => {
                const olSD = ol.feature.properties.stops_data;
                toDest.forEach(dl => {
                    if (ol.feature === dl.feature) return;
                    const dlSD = dl.feature.properties.stops_data;
                    // Cherche un arrêt intermédiaire commun entre les deux lignes
                    for (let i = ol.idx + 1; i < olSD.length; i++) {
                        const stopA = olSD[i];
                        for (let j = 0; j < dl.idx; j++) {
                            const stopB = dlSD[j];
                            if (cityMatches(normCity(stopA.name), normCity(stopB.name))) {
                                if (getDistance(stopA.lat, stopA.lon, stopB.lat, stopB.lon) < MAX_DIST) {
                                    const d1 = stopA.arr_min - olSD[ol.idx].dep_min;
                                    const d2 = dlSD[dl.idx].arr_min - stopB.dep_min;
                                    if (d1 > 0 && d2 > 0) {
                                        results.push({
                                            type: "CORRESPONDANCE",
                                            totalDuration: d1 + d2,
                                            transferCities: [stopA.name],
                                            segments: [
                                                { feature: ol.feature, oIdx: ol.idx, dIdx: i, duration: d1 },
                                                { feature: dl.feature, oIdx: j, dIdx: dl.idx, duration: d2 }
                                            ]
                                        });
                                    }
                                }
                            }
                        }
                    }
                });
            });
        }
        // Trie les trajets par durée et garde les 3 meilleurs
        return results.sort((a, b) => a.totalDuration - b.totalDuration).slice(0, 3);
    }

    // Affiche le contenu du tooltip lors du survol d’une ligne
    function showTooltip(event, d) {
        const p = d.properties;
        const cities = (p.cities || []).join(" → ");
        const desc = descLabels[p.route_desc] || p.route_desc || "";

        tooltip
            .html(`
                <div style="font-weight:bold; color:#00f2ff; margin-bottom:4px;">
                    ${p.route_id || "Ligne inconnue"}
                </div>
                <div style="color:#fff; margin-bottom:3px;">
                    ${desc}
                </div>
                <div style="color:#888;">
                    ${cities || "Aucune ville renseignée"}
                </div>
            `)
            .style("visibility", "visible");

        moveTooltip(event);
    }

    function moveTooltip(event) {
        tooltip
            .style("left", (event.pageX + 12) + "px")
            .style("top", (event.pageY + 12) + "px");
    }

    function hideTooltip() {
        tooltip.style("visibility", "hidden");
    }

    // Gestion du survol sur les lignes invisibles mais interactives
    hoverLines
    .on("mouseenter", function(event, d) {
        if (isSearchActive && !highlightedFeatureIds.has(d.properties.route_id)) return;

        if (!isSearchActive) {
            railLines.attr("opacity", 0.4);
        }

        d3.select(this).attr("stroke", "rgba(0,0,0,0)");
        showTooltip(event, d);
    })
    .on("mousemove", function(event, d) {
        if (isSearchActive && !highlightedFeatureIds.has(d.properties.route_id)) return;
        moveTooltip(event);
    })
    .on("mouseleave", function(d) {
        hideTooltip();
    })

    function resetZoom() {
        svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
    }

    searchBtn.on("click", () => {
        const orig = normCity(originInput.node().value);
        const dest = normCity(destInput.node().value);
        if (!orig || !dest) return;

        const routes = findRoutes(orig, dest);
        isSearchActive = true;
        highlightedFeatureIds = new Set(routes.flatMap(route =>
        route.segments.map(seg => seg.feature.properties.route_id)
        ));
        highlightGroup.selectAll("*").remove();
        railLines
        .attr("opacity", d => highlightedFeatureIds.has(d.properties.route_id) ? 0.35 : 0.1)
        hoverLines
        .attr("stroke-width", 12)
        .style("pointer-events", "stroke");
        // Affiche les résultats textuels
        resultBox.html(buildResultHTML(routes));

        if (routes.length > 0) {
            routes.forEach((route, rIdx) => {
                const color = ROUTE_COLORS[rIdx] || "#fff";
                const mainOpacity = rIdx === 0 ? 0.95 : 0.6;
                const mainWidth = rIdx === 0 ? 5.2 : 4.2;
                route.segments.forEach(seg => {
                    const sd = seg.feature.properties.stops_data;
                    const points = sd.slice(seg.oIdx, seg.dIdx + 1).map(s => projection([s.lon, s.lat]));
                    const lineGen = d3.line();
                    const pathD = lineGen(points);

                    highlightGroup.append("path")
                    .attr("d", pathD)
                    .attr("fill", "none")
                    .attr("stroke", "transparent")
                    .attr("stroke-width", 16)
                    .style("pointer-events", "stroke")
                    .on("mouseenter", function(event) {
                        showTooltip(event, seg.feature);
                    })
                    .on("mousemove", function(event) {
                        moveTooltip(event);
                    })
                    .on("mouseleave", function() {
                        hideTooltip();
                    });

                    highlightGroup.append("path")
                    .attr("d", pathD)
                    .attr("fill", "none")
                    .attr("stroke", color)
                    .attr("stroke-width", mainWidth)
                    .attr("opacity", mainOpacity)
                    .style("pointer-events", "none");
                });
            });
            resetBtn.style("display", "block");
        } else {
            resetBtn.style("display", "none");
        }
    });

    // Réinitialise l’affichage
    resetBtn.on("click", () => {
        isSearchActive = false;
        highlightedFeatureIds = new Set();
        railLines
        .attr("opacity", 0.4)
        .style("pointer-events", "stroke");
        hideTooltip();
        highlightGroup.selectAll("*").remove();
        railLines.attr("opacity", 0.4);
        resultBox.html("");
        resetBtn.style("display", "none");
        resetZoom();
    });
});