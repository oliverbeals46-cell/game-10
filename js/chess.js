// CHESS — the Level 90 boss "The Living Board". Regular chess rules; you (White) must CHECKMATE to move on.
// Includes castling, en passant, promotion (you choose), check / checkmate / stalemate / draw detection.
// Helpers like chess sites have: legal-move dots, last-move + check highlights, captured pieces, move list,
// a Hint button, Takeback, and Restart. The opponent is very easy on purpose.
const Chess = (() => {
  const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const isW = (pc) => pc && pc === pc.toUpperCase();
  const colorOf = (pc) => (pc ? (isW(pc) ? 'w' : 'b') : null);
  const rc = (sq) => [Math.floor(sq / 8), sq % 8];
  const sqName = (sq) => 'abcdefgh'[sq % 8] + (8 - Math.floor(sq / 8));

  function newState() {
    const rows = ['rnbqkbnr', 'pppppppp', '........', '........', '........', '........', 'PPPPPPPP', 'RNBQKBNR'];
    const board = [];
    for (const row of rows) for (const ch of row) board.push(ch === '.' ? null : ch);
    return { board, turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0, history: [], sans: [], captured: { w: [], b: [] } };
  }

  function attacked(board, sq, by) {
    const [r, c] = rc(sq);
    const at = (rr, cc) => (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 ? board[rr * 8 + cc] : undefined);
    const mine = (pc, type) => pc && colorOf(pc) === by && pc.toLowerCase() === type;
    // pawns
    const pr = by === 'w' ? r + 1 : r - 1;
    if (mine(at(pr, c - 1), 'p') || mine(at(pr, c + 1), 'p')) return true;
    // knights
    for (const [dr, dc] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) if (mine(at(r + dr, c + dc), 'n')) return true;
    // king
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && mine(at(r + dr, c + dc), 'k')) return true;
    // sliders
    const ray = (dr, dc, types) => {
      let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const pc = board[rr * 8 + cc];
        if (pc) return colorOf(pc) === by && types.includes(pc.toLowerCase());
        rr += dr; cc += dc;
      }
      return false;
    };
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (ray(dr, dc, 'rq')) return true;
    for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) if (ray(dr, dc, 'bq')) return true;
    return false;
  }

  const kingSq = (board, color) => board.findIndex((pc) => pc === (color === 'w' ? 'K' : 'k'));
  const inCheck = (st, color = st.turn) => attacked(st.board, kingSq(st.board, color), color === 'w' ? 'b' : 'w');

  function pseudoMoves(st) {
    const { board, turn } = st, out = [];
    const add = (from, to, extra = {}) => out.push(Object.assign({ from, to, piece: board[from], capture: board[to] }, extra));
    for (let sq = 0; sq < 64; sq++) {
      const pc = board[sq];
      if (!pc || colorOf(pc) !== turn) continue;
      const [r, c] = rc(sq), t = pc.toLowerCase();
      const empty = (rr, cc) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && !board[rr * 8 + cc];
      const enemy = (rr, cc) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && board[rr * 8 + cc] && colorOf(board[rr * 8 + cc]) !== turn;
      if (t === 'p') {
        const dir = turn === 'w' ? -1 : 1, start = turn === 'w' ? 6 : 1, last = turn === 'w' ? 0 : 7;
        const push = (to) => { if (Math.floor(to / 8) === last) for (const p of 'qrbn') add(sq, to, { promo: p }); else add(sq, to); };
        if (empty(r + dir, c)) { push((r + dir) * 8 + c); if (r === start && empty(r + 2 * dir, c)) add(sq, (r + 2 * dir) * 8 + c, { double: true }); }
        for (const dc of [-1, 1]) {
          if (enemy(r + dir, c + dc)) push((r + dir) * 8 + c + dc);
          if (c + dc >= 0 && c + dc < 8 && st.ep === (r + dir) * 8 + c + dc) add(sq, st.ep, { enpassant: true, capture: turn === 'w' ? 'p' : 'P' });
        }
      } else if (t === 'n' || t === 'k') {
        const steps = t === 'n' ? [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
        for (const [dr, dc] of steps) if (empty(r + dr, c + dc) || enemy(r + dr, c + dc)) add(sq, (r + dr) * 8 + c + dc);
        if (t === 'k') {
          const opp = turn === 'w' ? 'b' : 'w', home = turn === 'w' ? 60 : 4;
          const [KS, QS] = turn === 'w' ? ['K', 'Q'] : ['k', 'q'];
          if (sq === home && !attacked(board, home, opp)) {
            if (st.castle[KS] && !board[home + 1] && !board[home + 2] && !attacked(board, home + 1, opp) && !attacked(board, home + 2, opp)) add(sq, home + 2, { castle: 'K' });
            if (st.castle[QS] && !board[home - 1] && !board[home - 2] && !board[home - 3] && !attacked(board, home - 1, opp) && !attacked(board, home - 2, opp)) add(sq, home - 2, { castle: 'Q' });
          }
        }
      } else {
        const dirs = t === 'r' ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : t === 'b' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
        for (const [dr, dc] of dirs) {
          let rr = r + dr, cc = c + dc;
          while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
            const target = board[rr * 8 + cc];
            if (!target) add(sq, rr * 8 + cc);
            else { if (colorOf(target) !== turn) add(sq, rr * 8 + cc); break; }
            rr += dr; cc += dc;
          }
        }
      }
    }
    return out;
  }

  function apply(st, m) {
    const b = st.board;
    st.history.push({ board: b.slice(), turn: st.turn, castle: Object.assign({}, st.castle), ep: st.ep, half: st.half, captured: { w: st.captured.w.slice(), b: st.captured.b.slice() }, sanLen: st.sans.length });
    const pc = b[m.from];
    if (m.capture) st.captured[st.turn].push(m.capture.toLowerCase());
    b[m.to] = m.promo ? (st.turn === 'w' ? m.promo.toUpperCase() : m.promo) : pc;
    b[m.from] = null;
    if (m.enpassant) b[m.to + (st.turn === 'w' ? 8 : -8)] = null;
    if (m.castle) {
      const home = st.turn === 'w' ? 60 : 4;
      if (m.castle === 'K') { b[home + 1] = b[home + 3]; b[home + 3] = null; } else { b[home - 1] = b[home - 4]; b[home - 4] = null; }
    }
    // castling rights
    if (pc === 'K') st.castle.K = st.castle.Q = false;
    if (pc === 'k') st.castle.k = st.castle.q = false;
    for (const [sq, key] of [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']]) if (m.from === sq || m.to === sq) st.castle[key] = false;
    st.ep = m.double ? (m.from + m.to) / 2 : -1;
    st.half = pc.toLowerCase() === 'p' || m.capture ? 0 : st.half + 1;
    st.turn = st.turn === 'w' ? 'b' : 'w';
  }
  function undo(st) {
    const h = st.history.pop(); if (!h) return;
    st.board = h.board; st.turn = h.turn; st.castle = h.castle; st.ep = h.ep; st.half = h.half; st.captured = h.captured; st.sans.length = h.sanLen;
  }

  function legalMoves(st) {
    const me = st.turn;
    return pseudoMoves(st).filter((m) => { apply(st, m); const ok = !inCheck(st, me); undo(st); return ok; });
  }

  function san(st, m, legal) {
    let s;
    if (m.castle) s = m.castle === 'K' ? 'O-O' : 'O-O-O';
    else {
      const t = m.piece.toLowerCase();
      const cap = m.capture ? 'x' : '';
      if (t === 'p') s = (cap ? 'abcdefgh'[m.from % 8] : '') + cap + sqName(m.to) + (m.promo ? '=' + m.promo.toUpperCase() : '');
      else {
        const twins = legal.filter((o) => o.to === m.to && o.piece === m.piece && o.from !== m.from);
        let dis = '';
        if (twins.length) dis = twins.some((o) => o.from % 8 === m.from % 8) ? sqName(m.from)[1] : sqName(m.from)[0];
        s = t.toUpperCase() + dis + cap + sqName(m.to);
      }
    }
    apply(st, m);
    const replies = legalMoves(st);
    if (inCheck(st)) s += replies.length ? '+' : '#';
    undo(st);
    return s;
  }

  function status(st) {
    const moves = legalMoves(st);
    if (!moves.length) return inCheck(st) ? (st.turn === 'w' ? 'lost' : 'won') : 'stalemate';
    const rest = st.board.filter((p) => p && p.toLowerCase() !== 'k').map((p) => p.toLowerCase());
    if (!rest.length || (rest.length === 1 && 'bn'.includes(rest[0]))) return 'draw';
    if (st.half >= 100) return 'draw';
    return 'playing';
  }

  const material = (b) => b.reduce((s, p) => s + (p ? VAL[p.toLowerCase()] * (isW(p) ? 1 : -1) : 0), 0);

  // Very easy opponent: mostly random moves, sometimes grabs a piece.
  function aiMove(st) {
    const moves = legalMoves(st);
    const caps = moves.filter((m) => m.capture).sort((a, b) => VAL[b.capture.toLowerCase()] - VAL[a.capture.toLowerCase()]);
    if (caps.length && Math.random() < 0.45) return caps[0];
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Hint for the player: looks 2 moves ahead (your move, their best reply) and loves checkmate.
  function hint(st) {
    const moves = legalMoves(st);
    let best = null, bestScore = -1e9;
    for (const m of moves) {
      apply(st, m);
      let score;
      const replies = legalMoves(st);
      if (!replies.length) score = inCheck(st) ? 1e6 : -50; // checkmate is best, stalemate is bad
      else {
        let worst = 1e9;
        for (const r of replies) { apply(st, r); worst = Math.min(worst, material(st.board) - (legalMoves(st).length ? 0 : (inCheck(st) ? 1e6 : 0))); undo(st); }
        score = worst + (inCheck(st) ? 0.3 : 0) + Math.random() * 0.05;
      }
      undo(st);
      if (score > bestScore) { bestScore = score; best = m; }
    }
    return best;
  }

  return { newState, legalMoves, apply, undo, san, status, aiMove, hint, inCheck, kingSq, GLYPH, sqName, VAL, colorOf };
})();

// ---------------- the chess screen ----------------
const ChessUI = {
  st: null, sel: -1, last: null, hintMove: null, busy: false, onWin: null,

  open(onWin) {
    this.onWin = onWin;
    this.st = Chess.newState(); this.sel = -1; this.last = null; this.hintMove = null; this.busy = false;
    UI.show('chess');
    this.build();
    this.render();
    this.say('Your move! You are White. Checkmate the Living Board to move on.');
  },

  build() {
    const el = document.getElementById('chess-board');
    if (el.dataset.built) return;
    el.dataset.built = '1';
    for (let sq = 0; sq < 64; sq++) {
      const d = document.createElement('div');
      const r = Math.floor(sq / 8), c = sq % 8;
      d.className = 'csq ' + ((r + c) % 2 ? 'dark' : 'light');
      d.dataset.sq = sq;
      if (c === 0) { const s = document.createElement('span'); s.className = 'crank'; s.textContent = 8 - r; d.appendChild(s); }
      if (r === 7) { const s = document.createElement('span'); s.className = 'cfile'; s.textContent = 'abcdefgh'[c]; d.appendChild(s); }
      const p = document.createElement('span'); p.className = 'cpiece'; d.appendChild(p);
      d.addEventListener('click', () => this.click(sq));
      el.appendChild(d);
    }
    document.getElementById('chess-hint').onclick = () => this.showHint();
    document.getElementById('chess-undo').onclick = () => this.takeback();
    document.getElementById('chess-restart').onclick = () => { Sfx.play('click'); this.open(this.onWin); };
    document.getElementById('chess-leave').onclick = () => { Sfx.play('click'); Game.exitToLevels(); };
  },

  say(t) { document.getElementById('chess-status').textContent = t; },

  render() {
    const st = this.st, legal = this.sel >= 0 ? Chess.legalMoves(st).filter((m) => m.from === this.sel) : [];
    const checkSq = Chess.inCheck(st) ? Chess.kingSq(st.board, st.turn) : -1;
    document.querySelectorAll('#chess-board .csq').forEach((d) => {
      const sq = +d.dataset.sq, pc = st.board[sq];
      const p = d.querySelector('.cpiece');
      p.textContent = pc ? Chess.GLYPH[pc.toLowerCase()] : '';
      p.className = 'cpiece ' + (pc ? (Chess.colorOf(pc) === 'w' ? 'white' : 'black') : '');
      d.classList.toggle('sel', sq === this.sel);
      d.classList.toggle('last', !!this.last && (sq === this.last.from || sq === this.last.to));
      d.classList.toggle('check', sq === checkSq);
      d.classList.toggle('hint', !!this.hintMove && (sq === this.hintMove.from || sq === this.hintMove.to));
      const mv = legal.find((m) => m.to === sq);
      d.classList.toggle('dot', !!mv && !mv.capture);
      d.classList.toggle('ring', !!mv && !!mv.capture);
    });
    const cap = (list) => list.sort((a, b) => Chess.VAL[b] - Chess.VAL[a]).map((t) => Chess.GLYPH[t]).join('');
    document.getElementById('chess-cap-w').textContent = cap(st.captured.w.slice());
    document.getElementById('chess-cap-b').textContent = cap(st.captured.b.slice());
    const ml = document.getElementById('chess-moves');
    let html = '';
    for (let i = 0; i < st.sans.length; i += 2) html += `<div><span>${i / 2 + 1}.</span> ${st.sans[i]} ${st.sans[i + 1] || ''}</div>`;
    ml.innerHTML = html; ml.scrollTop = ml.scrollHeight;
  },

  click(sq) {
    if (this.busy || this.st.turn !== 'w' || this.ended) return;
    const st = this.st, pc = st.board[sq];
    if (this.sel >= 0) {
      const opts = Chess.legalMoves(st).filter((m) => m.from === this.sel && m.to === sq);
      if (opts.length) {
        if (opts[0].promo) return this.askPromo(opts);
        return this.play(opts[0]);
      }
    }
    this.sel = pc && Chess.colorOf(pc) === 'w' ? sq : -1;
    if (this.sel >= 0) Sfx.play('click');
    this.render();
  },

  askPromo(opts) {
    const box = document.getElementById('chess-promo');
    box.innerHTML = '';
    for (const p of ['q', 'r', 'b', 'n']) {
      const b = document.createElement('button'); b.textContent = Chess.GLYPH[p]; b.className = 'cpiece white';
      b.onclick = () => { box.classList.add('hidden'); this.play(opts.find((m) => m.promo === p)); };
      box.appendChild(b);
    }
    box.classList.remove('hidden');
  },

  play(m) {
    const st = this.st;
    const s = Chess.san(st, m, Chess.legalMoves(st));
    Chess.apply(st, m); st.sans.push(s);
    this.last = m; this.sel = -1; this.hintMove = null;
    Sfx.play(m.capture ? 'hit' : 'step');
    if (Chess.inCheck(st)) Sfx.play('checkmate_tick');
    this.render();
    if (this.checkEnd()) return;
    if (st.turn === 'b') {
      this.busy = true; this.say('The Living Board is thinking...');
      setTimeout(() => {
        const r = Chess.aiMove(st);
        const s2 = Chess.san(st, r, Chess.legalMoves(st));
        Chess.apply(st, r); st.sans.push(s2); this.last = r; this.busy = false;
        Sfx.play(r.capture ? 'hit' : 'step');
        this.render();
        if (!this.checkEnd()) this.say(Chess.inCheck(st) ? 'CHECK! Your king is under attack. Move it to safety, block, or capture the attacker.' : 'Your move.');
      }, 650);
    }
  },

  checkEnd() {
    const s = Chess.status(this.st);
    this.ended = s !== 'playing';
    if (s === 'won') { this.say('CHECKMATE! You beat the Living Board!'); Sfx.play('victory'); setTimeout(() => this.onWin && this.onWin(), 1600); return true; }
    if (s === 'lost') { this.say('Checkmate... the Living Board won this time. Press Restart to try again!'); Sfx.play('die'); return true; }
    if (s === 'stalemate') { this.say('Stalemate! That is a draw, but you need a CHECKMATE to move on. Press Restart.'); return true; }
    if (s === 'draw') { this.say('Draw! You need a CHECKMATE to move on. Press Restart.'); return true; }
    if (Chess.inCheck(this.st) && this.st.turn === 'b') this.say('Check!');
    return false;
  },

  showHint() {
    if (this.busy || this.st.turn !== 'w' || this.ended) return;
    this.hintMove = Chess.hint(this.st);
    this.say('Hint: try moving the highlighted piece to the highlighted square.');
    this.render();
  },

  takeback() {
    if (this.busy || this.st.history.length < 1) return;
    Chess.undo(this.st);
    if (this.st.turn === 'b' && this.st.history.length) Chess.undo(this.st); // undo the AI reply and your move
    this.ended = false; this.last = null; this.sel = -1; this.hintMove = null;
    this.say('Move taken back. Your move.');
    this.render();
  },
};
