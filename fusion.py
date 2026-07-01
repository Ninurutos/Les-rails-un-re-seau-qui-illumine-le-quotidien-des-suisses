import pandas as pd
import json
import os
from math import radians, cos, sin, asin, sqrt

data_path = './Data ferroviaire/'

def haversine(lon1, lat1, lon2, lat2):
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    return 6371 * 2 * asin(sqrt(a))

def time_to_minutes(t):
    try:
        parts = t.strip().split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except:
        return None

# fonction améliorée et optimisée à l'aide d'IA générative
def generate_rail_data():

    routes = pd.read_csv(os.path.join(data_path, 'routes.txt'))
    train_routes = routes[routes['route_type'].isin([117, 109, 106, 103, 900, 102, 100, 400, 700 ])]
    train_routes = train_routes.dropna(subset=['route_short_name'])

    trips = pd.read_csv(os.path.join(data_path, 'trips.txt'))
    train_trips = trips[trips['route_id'].isin(train_routes['route_id'])]

    routes_info = routes[['route_id', 'route_desc', 'route_type']].copy()
    trips_with_routes = train_trips.merge(routes_info, on='route_id')

    # STOP_TIMES filtrés par trains uniquement 
    stop_times = pd.read_csv(
        os.path.join(data_path, 'stop_times.txt'),
        usecols=['trip_id', 'stop_id', 'stop_sequence', 'arrival_time', 'departure_time']
    )
    train_trip_ids = set(train_trips['trip_id'])
    stop_times = stop_times[stop_times['trip_id'].isin(train_trip_ids)]

    # STOPS filtrés uniquement sur ceux utilisés par les trains 
    stops_all = pd.read_csv(os.path.join(data_path, 'stops.txt'))
    used_stop_ids = set(stop_times['stop_id'].unique())
    stops = stops_all[stops_all['stop_id'].isin(used_stop_ids)].copy()

    # Filtre géographique Suisse
    stops = stops[
        (stops['stop_lat'] > 45) & (stops['stop_lat'] < 48) &
        (stops['stop_lon'] > 5.6)  & (stops['stop_lon'] < 10.6)
    ]

    stops['geo_key'] = (
        stops['stop_name'] + "_" + 
        (stops['stop_lat']).round(2).astype(str) + "_" + 
        (stops['stop_lon']).round(2).astype(str)
    )

    stops_dedup = (
        stops.groupby('geo_key')
        .agg(
            stop_name=('stop_name', 'first'),
            stop_lat=('stop_lat', 'median'), 
            stop_lon=('stop_lon', 'median')
        )
        .reset_index()
    )

    first_ids = stops.groupby('stop_name')['stop_id'].first().reset_index()
    stops_dedup = stops_dedup.merge(first_ids, on='stop_name')

    stop_id_to_name = dict(zip(stops['stop_id'], stops['stop_name']))
    name_to_lat     = dict(zip(stops_dedup['stop_name'], stops_dedup['stop_lat']))
    name_to_lon     = dict(zip(stops_dedup['stop_name'], stops_dedup['stop_lon']))

    stops_fixed = stops[['stop_id', 'stop_name']].copy()
    stops_fixed['stop_lat'] = stops_fixed['stop_name'].map(name_to_lat)
    stops_fixed['stop_lon'] = stops_fixed['stop_name'].map(name_to_lon)
    stops_fixed = stops_fixed.dropna(subset=['stop_lat', 'stop_lon'])

    valid_stop_ids = set(stops_fixed['stop_id'])
    stop_times = stop_times[stop_times['stop_id'].isin(valid_stop_ids)]

    # On utilise calendar.txt
    calendar = pd.read_csv(os.path.join(data_path, 'calendar.txt'))

    # Fusion des différents fichiers
    df = stop_times.merge(stops_fixed[['stop_id', 'stop_lat', 'stop_lon']], on='stop_id')
    df = df.merge(trips_with_routes[['trip_id', 'route_id', 'route_desc', 'route_type', 'service_id']], on='trip_id')
    df = df.merge(calendar, on='service_id')
    df['route_desc'] = df['route_desc'].fillna('Train')

    features = []
    print("Traitement des lignes géographiques...")
    for (route_desc, route_id), group in df.groupby(['route_desc', 'route_id']):
        # Trouver le trip le plus long 
        trip_counts = group['trip_id'].value_counts()
        longest_trip_id = trip_counts.index[0] 
    
        trip_group = group[group['trip_id'] == longest_trip_id].sort_values('stop_sequence')
    

        coords = trip_group[['stop_lon', 'stop_lat']].values.tolist()

        # Filtre distance anti-lignes parasites
        valid_coords = True
        if len(coords) > 1:
            for i in range(len(coords) - 1):
                dist = haversine(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1])
                if dist > 250:
                    valid_coords = False
                    break
        if not valid_coords or len(coords) < 2:
            continue

        # Liste ordonnée de chaque arrêt avec nom, coordonées et temps 
        # Le js peut localiser précisément un arrêt dans la séquence et extraire le sous-segment plus la durée exacte.
        stops_data = []
        seen_names = set()
        for _, row in trip_group.iterrows():
            name    = stop_id_to_name.get(row['stop_id'], "").strip()
            dep_min = time_to_minutes(str(row['departure_time']))
            arr_min = time_to_minutes(str(row['arrival_time']))
            # On garde les doublons de nom dans stops_data (important pour l'ordre),
            # mais on signale le premier nom dans city_names pour l'UI.
            stops_data.append({
                "name":    name,
                "lon":     row['stop_lon'],
                "lat":     row['stop_lat'],
                "dep_min": dep_min,   
                "arr_min": arr_min    
            })

        # Noms uniques dans l'ordre (pour l'autocomplétion et l'affichage)
        city_names = []
        for s in stops_data:
            if s['name'] and s['name'] not in seen_names:
                seen_names.add(s['name'])
                city_names.append(s['name'])

        # Durée totale de la ligne (le premier départ à la dernière arrivée)
        dep0    = stops_data[0]['dep_min']
        arr_end = stops_data[-1]['arr_min']
        if dep0 is not None and arr_end is not None and arr_end >= dep0:
            duration_minutes = arr_end - dep0
        else:
            duration_minutes = None

        # Fréquences mensuelles
        start_date     = str(group['start_date'].iloc[0])
        end_date       = str(group['end_date'].iloc[0])
        lat_moyenne    = trip_group['stop_lat'].mean()
        base_intensity = len(trip_group)

        frequencies = []
        for month in range(1, 13):
            month_str = f"2026{month:02d}"
            if start_date[:6] <= month_str <= end_date[:6]:
                intensity = float(base_intensity)
                if lat_moyenne < 46.6:
                    if 6 <= month <= 8:
                        intensity *= 1.8
                    elif month <= 3:
                        intensity *= 0.4
                frequencies.append(round(intensity, 1))
            else:
                frequencies.append(0)

        features.append({
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": coords},
            "properties": {
                "route_id":     str(route_id),
                "route_type":   str(group['route_type'].iloc[0]),
                "route_desc":   str(route_desc).strip(),
                "cities":       city_names,       
                "stops_data":   stops_data,       
                "duration_min": duration_minutes, 
                "months":       frequencies
            }
        })

    output = {"type": "FeatureCollection", "features": features}
    with open('rails_suisse.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False)

    print(f"Terminé ! {len(features)} segments générés.")

if __name__ == "__main__":
    generate_rail_data()