"""
Script to fetch the full player database from Sleeper API and save it to a JSON file.
This is designed to be run by GitHub Actions daily.
"""

import requests
import json
import os
from datetime import datetime

# Configuration
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
OUTPUT_FILE = os.path.join(DATA_DIR, 'sleeper_players.json')
SLEEPER_API_URL = "https://api.sleeper.app/v1/players/nfl"

def fetch_sleeper_players():
    print(f"Fetching players from {SLEEPER_API_URL}...")
    try:
        response = requests.get(SLEEPER_API_URL, timeout=60)
        response.raise_for_status()
        data = response.json()
        
        print(f"Successfully fetched {len(data)} players.")
        return data
    except Exception as e:
        print(f"Error fetching players: {e}")
        return None

def process_players(raw_data):
    """
    Optional: Clean up or filter the data if needed. 
    For now, we keep everything but maybe add a timestamp.
    """
    return {
        "updated_at": datetime.now().isoformat(),
        "players": raw_data
    }

if __name__ == "__main__":
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        
    raw_players = fetch_sleeper_players()
    
    if raw_players:
        processed_data = process_players(raw_players)
        
        print(f"Saving to {OUTPUT_FILE}...")
        with open(OUTPUT_FILE, 'w') as f:
            json.dump(processed_data, f, indent=2)
        
        print("Done!")
    else:
        print("Failed to update player database.")
        exit(1)
