import React, { useState, useEffect } from "react";
import "./App.css";
import padelIcon from "./assets/padel.png";
import pkg from "../package.json";

function generateRounds(players, courts) {
  const n = players.length;
  if (n < 4) return [];

  let allPairs = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      allPairs.push({ p1: players[i], p2: players[j] });
    }
  }

  // Mezcla inicial
  allPairs = allPairs.sort(() => Math.random() - 0.5);

  const rounds = [];
  const opponentHistory = new Map();
  players.forEach(p => opponentHistory.set(p, new Map()));

  function getOpponentCount(p1, p2, teamB) {
    let count = 0;
    [p1, p2].forEach(pA => {
      [teamB.p1, teamB.p2].forEach(pB => {
        count += (opponentHistory.get(pA).get(pB) || 0);
      });
    });
    return count;
  }

  while (allPairs.length > 0) {
    const currentRoundMatches = [];
    const playersInRound = new Set();
    let madeProgressInRound = true;

    while (madeProgressInRound && currentRoundMatches.length < courts) {
      madeProgressInRound = false;
      let bestPairAIdx = -1;
      let bestPairBIdx = -1;
      let minConflicts = Infinity;

      for (let i = 0; i < allPairs.length; i++) {
        const pairA = allPairs[i];
        // 1. Validar que la pareja A no esté jugando ya en esta ronda (otra pista)
        if (playersInRound.has(pairA.p1) || playersInRound.has(pairA.p2)) continue;

        for (let j = i + 1; j < allPairs.length; j++) {
          const pairB = allPairs[j];
          // 2. Validar que la pareja B no esté jugando ya en esta ronda
          if (playersInRound.has(pairB.p1) || playersInRound.has(pairB.p2)) continue;

          // 3. CRÍTICO: Validar que los jugadores de B no sean los mismos que los de A
          if (pairB.p1 === pairA.p1 || pairB.p1 === pairA.p2 || 
              pairB.p2 === pairA.p1 || pairB.p2 === pairA.p2) continue;

          const conflicts = getOpponentCount(pairA.p1, pairA.p2, pairB);

          if (conflicts < minConflicts) {
            minConflicts = conflicts;
            bestPairAIdx = i;
            bestPairBIdx = j;
            if (conflicts === 0) break; 
          }
        }
        if (minConflicts === 0) break;
      }

      if (bestPairAIdx !== -1 && bestPairBIdx !== -1) {
        const teamA = allPairs[bestPairAIdx];
        const teamB = allPairs[bestPairBIdx];

        // Actualizar historial de oponentes
        [teamA.p1, teamA.p2].forEach(pA => {
          [teamB.p1, teamB.p2].forEach(pB => {
            opponentHistory.get(pA).set(pB, (opponentHistory.get(pA).get(pB) || 0) + 1);
            opponentHistory.get(pB).set(pA, (opponentHistory.get(pB).get(pA) || 0) + 1);
          });
        });

        currentRoundMatches.push({
          teamA: [teamA.p1, teamA.p2],
          teamB: [teamB.p1, teamB.p2]
        });

        playersInRound.add(teamA.p1); playersInRound.add(teamA.p2);
        playersInRound.add(teamB.p1); playersInRound.add(teamB.p2);

        // Eliminar de la lista (el índice mayor primero para no alterar el menor)
        allPairs.splice(bestPairBIdx, 1);
        allPairs.splice(bestPairAIdx, 1);
        madeProgressInRound = true;
      }
    }

    if (currentRoundMatches.length > 0) {
      rounds.push(currentRoundMatches);
    } else {
      break; 
    }
  }
  return rounds;
}

export default function App() {
  const [players, setPlayers] = useState(() => {
    const saved = localStorage.getItem("players");
    return saved ? JSON.parse(saved) : [];
  });

  const [rounds, setRounds] = useState(() => {
    const saved = localStorage.getItem("rounds");
    return saved ? JSON.parse(saved) : [];
  });

  const [courts, setCourts] = useState(() => {
    const saved = localStorage.getItem("courts");
    return saved ? JSON.parse(saved) : 1;
  });

  const [input, setInput] = useState("");

  // guardar en localStorage
  useEffect(() => {
    localStorage.setItem("players", JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem("rounds", JSON.stringify(rounds));
  }, [rounds]);

  useEffect(() => {
    localStorage.setItem("courts", JSON.stringify(courts));
  }, [courts]);

  const addPlayer = () => {
    if (players.length >= 8) {
      alert("El máximo es de 8 jugadores.");
      return;
    }
    
    if (input.trim()) {
      setPlayers([...players, input.trim()]);
      setInput("");
    }
  };

  const createRounds = () => {
    if (players.length < 4) {
      alert("Se necesitan al menos 4 jugadores.");
      return;
    }
    setRounds(generateRounds(players, Number(courts)));
  };

  const updateScore = (roundIndex, matchIndex, value) => {
    const updated = [...rounds];
    updated[roundIndex][matchIndex].score = value;
    setRounds(updated);
  };

  const resetAll = () => {
    localStorage.clear();
    setPlayers([]);
    setRounds([]);
    setCourts(1);
  };

const calculatePoints = () => {
    const stats = {};
    players.forEach(p =>
      (stats[p] = { games: 0, wins: 0, gamesAgainst: 0 }) // Añadimos gamesAgainst
    );

    rounds.forEach(r => {
      r.forEach(m => {
        if (!m.score) return;
        const parts = m.score.split("-");
        // Validamos que ambos lados del score existan
        if (parts.length !== 2 || parts[0] === "" || parts[1] === "") return;
        
        const a = Number(parts[0]);
        const b = Number(parts[1]);
        if (isNaN(a) || isNaN(b)) return;

        // Sumar games a favor y en contra
        m.teamA.forEach(p => {
          stats[p].games += a;
          stats[p].gamesAgainst += b;
        });
        m.teamB.forEach(p => {
          stats[p].games += b;
          stats[p].gamesAgainst += a;
        });

        // Sumar partidos ganados
        if (a > b) {
          m.teamA.forEach(p => (stats[p].wins += 1));
        } else if (b > a) {
          m.teamB.forEach(p => (stats[p].wins += 1));
        }
      });
    });

    return stats;
  };

  const stats = calculatePoints();

  return (
    <div className="container">
<div className="header">
  <img src={padelIcon} alt="padel" className="logo" />
  <div>
    <h1>Padel Super 8</h1>
    <p className="subtitle">Gestión de partidos y ranking</p>
  </div>
</div>

      <div className="input-group">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Nombre jugador"
        />
       <button onClick={addPlayer} disabled={players.length >= 8}>
  Agregar
</button>
      </div>

      <div className="input-group">
      <label>Canchas:</label>
  <input
    type="number"
    value={courts}
    min="1"
    max="2" // Restricción visual en el input[cite: 1]
    onChange={e => {
      // Validación lógica para asegurar que esté entre 1 y 2
      const val = Math.max(1, Math.min(2, Number(e.target.value)));
      setCourts(val);
    }}
  />
        <button onClick={createRounds}>Generar</button>
        <button onClick={resetAll} style={{ background: "#dc3545" }}>
          Reset
        </button>
      </div>

      <div className="players">
        {players.map(p => (
          <span key={p} className="player-chip">{p}</span>
        ))}
      </div>

      {rounds.map((round, rIndex) => (
        <div key={rIndex} className="round">
          <h3>Ronda {rIndex + 1}</h3>

          {round.map((m, mIndex) => (
  <div key={mIndex} className="match">
    {/* Pareja 1 */}
    <div className="team team-a">
      <span className="players">{m.teamA.join(" & ")}</span>
      <input
        type="number"
        className="score-input input-a"
        value={m.score?.split("-")[0] || ""}
        onChange={e => {
          const left = e.target.value;
          const right = m.score?.split("-")[1] || "";
          updateScore(rIndex, mIndex, `${left}-${right}`);
        }}
      />
    </div>

    <span className="separator">-</span>

    {/* Pareja 2 */}
    <div className="team team-b">
      <input
        type="number"
        className="score-input input-b"
        value={m.score?.split("-")[1] || ""}
        onChange={e => {
          const left = m.score?.split("-")[0] || "";
          const right = e.target.value;
          updateScore(rIndex, mIndex, `${left}-${right}`);
        }}
      />
      <span className="players">{m.teamB.join(" & ")}</span>
    </div>
  </div>
))}
        </div>
      ))}

<div className="table">
  <h2>🏆 Tabla</h2>

  <div className="row" style={{ fontWeight: "bold" }}>
    <span>Jugador</span>
    <span>Partidos</span>
    <span>Games</span>
  </div>

{Object.entries(stats)
  .sort((a, b) => {
    // 1er Criterio: Partidos Ganados
    if (b[1].wins !== a[1].wins) return b[1].wins - a[1].wins;
    // 2do Criterio: Diferencia de Games (GD)
    const diffA = a[1].games - a[1].gamesAgainst;
    const diffB = b[1].games - b[1].gamesAgainst;
    return diffB - diffA;
  })
  .map(([p, s]) => (
    <div key={p} className="row">
      <span>{p}</span>
      <span>{s.wins}</span>
      <span>{s.games - s.gamesAgainst >= 0 ? `+${s.games - s.gamesAgainst}` : s.games - s.gamesAgainst}</span>
    </div>
  ))}
</div>

<div className="footer">
  Padel League • v{pkg.version} • by S. Ferrari (chechi)
</div>
    </div>

    
  );
}
