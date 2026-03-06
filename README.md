# 🔫 Mafia Game - Interactive Party Game

A fully interactive, browser-based Mafia party game application with real-time multiplayer support using WebSockets.

## Features

✅ **Match Room System**
- Create rooms with unique 6-character codes
- Support for up to 20 players per room
- Real-time player lobby with host controls

✅ **Role Assignment**
- Automatic and balanced role distribution
- 10 different unique roles with special abilities
- Private role briefing before game starts

✅ **Complete Game Loop**
- Night Phase: Players with abilities take secret actions
- Day Phase: Discussion and chat
- Voting Phase: Community votes to eliminate suspects
- Results Phase: Role reveal and elimination announcement

✅ **Roles & Abilities**
- Mafia / Godfather: Eliminate players at night
- Detective: Investigate players
- Doctor: Protect players from kills
- Bodyguard: Guard and intercept kills
- Vigilante: One-time night kill
- Role Blocker: Block player abilities
- Jester: Win condition by getting voted off
- Mayor: Double vote count
- Villagers: No special abilities

✅ **Win Conditions**
- Town wins when all Mafia are eliminated
- Mafia wins when they equal/outnumber Town
- Jester wins alone if voted off

✅ **Real-Time Features**
- Live player status updates
- In-game chat (day phase visible to all, night phase private for Mafia)
- Phase transitions with announcements
- Vote counting and results

## Tech Stack

- **Frontend**: React + Next.js
- **Backend**: Next.js API routes + Socket.io
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Real-time**: Socket.io (WebSockets)

## Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the development server**
   ```bash
   npm run dev
   ```

3. **Open in browser**
   ```
   http://localhost:3000
   ```

## How to Play

### Creating a Game
1. Click "Create Room" on the home page
2. Enter your display name
3. Share the room code with other players
4. Wait for players to join (minimum 3 players)
5. Click "Start Game" when ready

### Joining a Game
1. Click "Join Room"
2. Enter the room code and your display name
3. Wait in the lobby for the game to start

### During the Game
- **Briefing Phase**: Review your role and abilities (10 seconds)
- **Night Phase**: Players with night actions select targets secretly
- **Day Phase**: Discuss and debate with all players (2 minutes)
- **Voting Phase**: Vote to eliminate a suspect (1 minute)
- **Results Phase**: See who was eliminated and their role (5 seconds)

## Game Mechanics

### Role Distribution

**For 3-10 Players:**
- 2 Mafia
- 1 Detective
- 1 Doctor
- Remaining: Villagers

**For 11-20 Players:**
- 5 Mafia (including 1 Godfather)
- 1 Detective
- 1 Doctor
- 1 Bodyguard
- 1 Vigilante
- 1 Role Blocker
- 1 Jester
- 1 Mayor
- Remaining: Villagers

### Win Conditions
- **Town Victory**: All Mafia eliminated
- **Mafia Victory**: Mafia equal or outnumber Town
- **Jester Victory**: Voted off by Town (wins alone)

## Configuration

All game timings are configurable in `utils/gameManager.ts`:
- `NIGHT_PHASE_DURATION`: 45000ms (45 seconds)
- `DISCUSSION_PHASE_DURATION`: 120000ms (2 minutes)
- `VOTING_PHASE_DURATION`: 60000ms (1 minute)
- `BRIEFING_PHASE_DURATION`: 10000ms (10 seconds)

## Deployment

### Build for Production
```bash
npm run build
npm start
```

### Recommended Hosting
- Vercel (auto-deploys from GitHub)
- Railway
- Heroku
- AWS

## Future Enhancements

- [ ] Sound effects and voice announcements
- [ ] Advanced statistics and player profiles
- [ ] Custom game modes and difficulty settings
- [ ] Spectator mode
- [ ] Replay system
- [ ] Mobile app (React Native)
- [ ] Discord bot integration
- [ ] Streaming-friendly UI overlay

## License

MIT License - Feel free to use and modify for your own projects

## Support

For issues or feature requests, please open an issue on GitHub.

---

**Made with 💀 and coffee**
