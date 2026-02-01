# Sleeper API Reference

This document summarizes the Sleeper Fantasy Football API endpoints used in this project. All requests are `GET` and use the base URL: `https://api.sleeper.app/v1`.

## 1. User Endpoints

### Get User
Returns user metadata including `user_id`.
- **URL**: `/user/<username_or_id>`
- **Usage**: Getting the unique `user_id` required for all other requests.

### Get User Leagues
Returns all leagues a user is in for a specific sport and season.
- **URL**: `/user/<user_id>/leagues/<sport>/<season>`
- **Example**: `/user/5870352423.../leagues/nfl/2025`

## 2. League Endpoints

### Get League
Returns league settings, scoring, and roster positions.
- **URL**: `/league/<league_id>`

### Get Rosters
Returns all rosters in a league (players owned, wins/losses, owner_id).
- **URL**: `/league/<league_id>/rosters`
- **Note**: This is the core endpoint for calculating ownership and records.

### Get Users
Returns display names and avatars for all members of a league.
- **URL**: `/league/<league_id>/users`

### Get Matchups
Returns matchups for a specific week, including points and player IDs used.
- **URL**: `/league/<league_id>/matchups/<week>`
- **Usage**: Used for "Expected Wins" and "Historical Portfolio".

## 3. Playoff & Bracket Endpoints

### Winners Bracket
Returns the playoff bracket for the championship.
- **URL**: `/league/<league_id>/winners_bracket`
- **Key Fields**: `p` (final place), `w` (winner roster_id), `l` (loser roster_id).

### Losers Bracket
Returns the consolation or toilet bowl bracket.
- **URL**: `/league/<league_id>/losers_bracket`

## 4. Player & Stats Endpoints

### Get All Players
Returns a massive JSON object (~5MB) of every NFL player.
- **URL**: `/players/nfl`
- **Note**: Should be fetched once daily. Our `scripts/update_players.py` handles this.

### Get Stats
Returns regular season stats for a specific year.
- **URL**: `/stats/nfl/regular/<year>`
- **Usage**: Used to populate fantasy points in the Player Database.

## 5. Helpful External Links
- **Sleeper Official Docs**: [https://docs.sleeper.com/](https://docs.sleeper.com/)
- **Sleeper Avatars**: `https://sleepercdn.com/avatars/<avatar_id>`
- **Sleeper League Web Link**: `https://sleeper.com/leagues/<league_id>`
