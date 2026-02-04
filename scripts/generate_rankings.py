"""
Script to generate draft rankings from Sleeper player data.
Uses 'search_rank' as a proxy for ADP/Rank and estimates projected points based on tiers.
"""

import json
import os
import math

# Config
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
PLAYERS_FILE = os.path.join(DATA_DIR, 'sleeper_players.json')
OUTPUT_FILE = os.path.join(DATA_DIR, 'rankings.json')

# Point estimates by Tier (PPR approx)
TIER_POINTS = {
    'QB': {1: 350, 2: 320, 3: 290, 4: 260, 5: 240, 6: 220, 7: 200, 8: 180},
    'RB': {1: 300, 2: 260, 3: 220, 4: 190, 5: 160, 6: 140, 7: 120, 8: 100},
    'WR': {1: 300, 2: 260, 3: 230, 4: 200, 5: 170, 6: 150, 7: 130, 8: 110},
    'TE': {1: 220, 2: 170, 3: 140, 4: 120, 5: 100, 6: 90, 7: 80, 8: 70},
    'K': {1: 150, 2: 140, 3: 135, 4: 130, 5: 125, 6: 120, 7: 115, 8: 110},
    'DEF': {1: 160, 2: 150, 3: 140, 4: 130, 5: 120, 6: 110, 7: 105, 8: 100}
}

VALID_POSITIONS = {'QB', 'RB', 'WR', 'TE', 'K', 'DEF'}

def estimate_points(position, tier):
    table = TIER_POINTS.get(position, {})
    if tier in table:
        return table[tier]
    
    # Extrapolate
    base = table.get(8, 50)
    return max(10, base - (tier - 8) * 10)

def generate_rankings():
    print("Loading player database...")
    try:
        with open(PLAYERS_FILE, 'r') as f:
            data = json.load(f)
            players = data.get('players', {})
    except FileNotFoundError:
        print(f"Error: {PLAYERS_FILE} not found. Run update_players.py first.")
        return

    print(f"Processing {len(players)} players...")
    
    ranked_list = []
    
    for pid, p in players.items():
        # Filter logic
        if not p.get('active'):
            continue
            
        pos = p.get('position')
        if pos not in VALID_POSITIONS:
            continue
            
        # Defense handling (Sleeper treats DEF as players)
        if pos == 'DEF':
            # Keep them
            pass
            
        search_rank = p.get('search_rank')
        if search_rank is None or search_rank > 1000:
            continue

        ranked_list.append({
            'player_id': pid,
            'name': f"{p.get('first_name', '')} {p.get('last_name', '')}".strip() or p.get('full_name', 'Unknown'),
            'position': pos,
            'team': p.get('team') or 'FA',
            'search_rank': search_rank,
            'age': p.get('age'),
            'years_exp': p.get('years_exp')
        })

    # Sort by search_rank
    ranked_list.sort(key=lambda x: x['search_rank'])
    
    # Assign Rank, Tier, Points
    final_rankings = []
    
    # Track position counts for positional rank
    pos_counts = {p: 0 for p in VALID_POSITIONS}
    
    for i, p in enumerate(ranked_list):
        rank = i + 1
        pos = p['position']
        pos_counts[pos] += 1
        
        # Tier logic: Every 12 players overall approx? 
        # Or positional tiers? 
        # Let's do positional tiers for point estimation, but overall tiers for display
        # Point estimation needs POSITIONAL tier.
        
        pos_rank = pos_counts[pos]
        pos_tier = math.ceil(pos_rank / 12) # 12 team league assumption
        
        points = estimate_points(pos, pos_tier)
        
        final_rankings.append({
            'player_id': p['player_id'],
            'name': p['name'],
            'position': pos,
            'team': p['team'],
            'rank': rank,
            'tier': math.ceil(rank / 12), # Overall tier
            'projected_points': points,
            'adp': p['search_rank'] # Use search_rank as rough ADP
        })

    print(f"Generated rankings for {len(final_rankings)} players.")
    
    # Save
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(final_rankings, f, indent=2)
    print(f"Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_rankings()
