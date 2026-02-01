"""
Script to fetch the full player database AND 2025 stats from Sleeper API and save it to a JSON file.
This is designed to be run by GitHub Actions daily.
"""

import requests
import json
import os
from datetime import datetime

# Configuration
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
OUTPUT_FILE = os.path.join(DATA_DIR, 'sleeper_players.json')
SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl"
SLEEPER_STATS_URL = "https://api.sleeper.app/v1/stats/nfl/regular/2025"

def fetch_json(url, description):
    print(f"Fetching {description} from {url}...")
    try:
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        data = response.json()
        print(f"Successfully fetched {len(data)} records for {description}.")
        return data
    except Exception as e:
        print(f"Error fetching {description}: {e}")
        return None

def process_data(players, stats):
    print("Merging stats into player database...")
    
    # Process stats into a lookup dict for faster access
    # Stats structure from Sleeper is usually a list or dict keyed by player_id
    # If it's a list, we convert to dict. If dict, use as is.
    stats_map = {}
    if isinstance(stats, list): # Should not happen for this endpoint usually, but safety first
        for s in stats:
            stats_map[s.get('player_id')] = s
    else:
        stats_map = stats

    count_enriched = 0
    for pid, p_data in players.items():
        # Get stats for this player
        p_stats = stats_map.get(pid)
        
        if p_stats:
            # We only keep key fantasy stats to keep file size reasonable
            # Sleeper stats keys: "pts_half_ppr", "pass_yd", etc.
            p_data['stats'] = {
                'pts_std': p_stats.get('pts_std', 0),
                'pts_half_ppr': p_stats.get('pts_half_ppr', 0),
                'pts_ppr': p_stats.get('pts_ppr', 0),
                'gp': p_stats.get('gp', 0),
                'pass_yd': p_stats.get('pass_yd', 0),
                'pass_td': p_stats.get('pass_td', 0),
                'rush_yd': p_stats.get('rush_yd', 0),
                'rush_td': p_stats.get('rush_td', 0),
                'rec_yd': p_stats.get('rec_yd', 0),
                'rec_td': p_stats.get('rec_td', 0)
            }
            count_enriched += 1
        else:
            p_data['stats'] = None

    print(f"Enriched {count_enriched} players with stats.")

    return {
        "updated_at": datetime.now().isoformat(),
        "season": "2025",
        "players": players
    }

if __name__ == "__main__":
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        
    raw_players = fetch_json(SLEEPER_PLAYERS_URL, "Players")
    raw_stats = fetch_json(SLEEPER_STATS_URL, "2025 Stats")
    
    if raw_players and raw_stats:
        final_data = process_data(raw_players, raw_stats)
        
        print(f"Saving to {OUTPUT_FILE}...")
        with open(OUTPUT_FILE, 'w') as f:
            json.dump(final_data, f, indent=2)
        
        print("Done!")
    else:
        print("Failed to update database (missing players or stats).")
        exit(1)
