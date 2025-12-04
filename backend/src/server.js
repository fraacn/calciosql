require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./db');
const openaiService = require('./openaiService');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Serve frontend statico
app.use(express.static(path.join(__dirname, '../frontend')));

// ==========================================
// ROUTES - API Endpoints
// ==========================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Calcio SQL API'
  });
});

// ==========================================
// API CALCIO SQL
// ==========================================

// POST /api/calcio/init - Crea o recupera squadra
app.post('/api/calcio/init', async (req, res, next) => {
    try {
        const { email, nome } = req.body;
        if (!email) return res.status(400).json({ error: 'Email mancante' });

        let squadra = await db.query(
            'SELECT * FROM squadre_iscritte WHERE email_presidente = $1',
            [email]
        );

        if (squadra.rows.length === 0) {
            if (!nome) return res.status(400).json({ error: 'Nome squadra mancante' });
            squadra = await db.query(
                'INSERT INTO squadre_iscritte (email_presidente, nome_squadra) VALUES ($1, $2) RETURNING *',
                [email, nome]
            );
        }

        res.json(squadra.rows[0]);
    } catch (err) {
        console.error('Error in /api/calcio/init:', err);
        res.status(500).json({ error: 'Errore server', details: err.message });
    }
});

// GET /api/calcio/rosa/:email - Ottieni rosa squadra
app.get('/api/calcio/rosa/:email', async (req, res, next) => {
    try {
        const { email } = req.params;
        const data = await db.query(`
      SELECT g.id, g.nome_completo, g.ruolo, g.valore, g.ingaggiato
      FROM giocatori g
      JOIN squadra_giocatori sg ON sg.id_giocatore = g.id
      JOIN squadre_iscritte s ON s.id = sg.id_squadra
      WHERE s.email_presidente = $1
    `, [email]);
        res.json(data.rows);
    } catch (err) {
        console.error('Error in /api/calcio/rosa:', err);
        res.status(500).json({ error: 'Errore server', details: err.message });
    }
});

// POST /api/calcio/query - Gestisce query SQL per il gioco
app.post('/api/calcio/query', async (req, res, next) => {
    try {
        const { email, query } = req.body;

        if (!email || !query) {
            return res.status(400).json({ error: 'Parametri mancanti: email o query' });
        }

        const lower = query.toLowerCase().trim();

        // 1️⃣ Verifica tipo di query consentito
        if (!/^(select|insert|delete|update)/.test(lower)) {
            return res.status(400).json({
                error: 'Solo SELECT, INSERT, DELETE o UPDATE sono consentiti in questa lezione'
            });
        }

        // 2️⃣ Recupera ID squadra
        const squadra = await db.query(
            'SELECT id FROM squadre_iscritte WHERE email_presidente = $1',
            [email]
        );
        if (!squadra.rows.length) {
            return res.status(400).json({ error: 'Squadra non trovata per questa email' });
        }
        const idSquadra = squadra.rows[0].id;

        // 3️⃣ Gestione SELECT (libera)
        if (lower.startsWith('select')) {
            const result = await db.query(query);
            return res.json({
                success: true,
                rows: result.rows,
                rowCount: result.rowCount
            });
        }

        // 4️⃣ Controlli didattici base per DML
        const isInsert = lower.startsWith('insert');
        const isDelete = lower.startsWith('delete');
        const isUpdate = lower.startsWith('update');
        const isUpdateOnGiocatori = /^update\s+giocatori/.test(lower);

        // DELETE e UPDATE devono avere WHERE
        if ((isDelete || isUpdate) && !lower.includes('where')) {
            return res.status(400).json({
                error: '❌ Le query DELETE e UPDATE devono includere una clausola WHERE'
            });
        }

        // INSERT e DELETE devono riferirsi alla propria squadra
        if (!isUpdateOnGiocatori && (isInsert || isDelete)) {
            if (!query.includes(idSquadra.toString())) {
                return res.status(400).json({
                    error: `❌ L'ID della tua squadra (${idSquadra}) deve comparire nella query`
                });
            }
        }

        // 5️⃣ Esecuzione query
        const result = await db.query(query);

        res.json({
            success: true,
            rows: result.rowCount,
            message: 'Query eseguita correttamente'
        });
    } catch (err) {
        console.error('❌ Errore in /api/calcio/query:', err);

        // 6️⃣ Gestione errori provenienti dal DB (trigger e vincoli)
        const msg = err.message || '';

        if (msg.includes('Giocatore già ingaggiato')) {
            return res.status(400).json({
                error: '❌ Non puoi ingaggiare un giocatore già appartenente a un\'altra squadra.'
            });
        }

        if (msg.includes('Budget superato')) {
            return res.status(400).json({
                error: '❌ Budget superato! Il valore totale dei giocatori non può superare 150 milioni.'
            });
        }

        if (msg.includes('violates foreign key constraint')) {
            return res.status(400).json({
                error: '❌ Attenzione: il giocatore o la squadra specificata non esiste.'
            });
        }

        if (msg.includes('syntax error')) {
            return res.status(400).json({
                error: '❌ Errore di sintassi SQL. Controlla la query e riprova.'
            });
        }

        // 7️⃣ Fallback generico
        return res.status(500).json({
            error: 'Errore esecuzione query',
            details: msg
        });
    }
});

// GET /api/calcio/partite/:email - Ottieni tutte le partite
app.get('/api/calcio/partite/:email', async (req, res, next) => {
    try {
        const { email } = req.params;
        const partite = await db.getMatches(email);
        res.json(partite);
    } catch (err) {
        console.error('Error in /api/calcio/partite:', err);
        res.status(500).json({ error: 'Errore server', details: err.message });
    }
});

// GET /api/calcio/partita/:id - Ottieni dettagli partita
app.get('/api/calcio/partita/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const partita = await db.getMatchDetails(parseInt(id));

        if (!partita) {
            return res.status(404).json({ error: 'Partita non trovata' });
        }

        res.json(partita);
    } catch (err) {
        console.error('Error in /api/calcio/partita/:id:', err);
        res.status(500).json({ error: 'Errore server', details: err.message });
    }
});

// GET /api/calcio/partita/:id/timeline - Ottieni timeline partita
app.get('/api/calcio/partita/:id/timeline', async (req, res, next) => {
    try {
        const { id } = req.params;
        const timeline = await db.getMatchTimeline(parseInt(id));
        res.json(timeline);
    } catch (err) {
        console.error('Error in /api/calcio/partita/:id/timeline:', err);
        res.status(500).json({ error: 'Errore server', details: err.message });
    }
});

// POST /api/calcio/partita/start - Avvia simulazione partita
app.post('/api/calcio/partita/start', async (req, res, next) => {
    try {
        const { id_partita, email } = req.body;

        if (!id_partita || !email) {
            return res.status(400).json({ error: 'Parametri mancanti: id_partita o email' });
        }

        // 1️⃣ Recupera dettagli partita
        const partita = await db.getMatchDetails(id_partita);

        if (!partita) {
            return res.status(404).json({ error: 'Partita non trovata' });
        }

        // 2️⃣ Verifica che l'utente sia coinvolto nella partita
        if (partita.email_presidente_1 !== email && partita.email_presidente_2 !== email) {
            return res.status(403).json({ error: 'Non sei autorizzato a gestire questa partita' });
        }

        // 3️⃣ Verifica che la partita non sia già terminata
        if (partita.terminata) {
            return res.status(400).json({ error: 'La partita è già terminata' });
        }

        // 4️⃣ Verifica che entrambe le squadre siano pronte
        if (!partita.squadra1_pronta || !partita.squadra2_pronta) {
            return res.status(400).json({
                error: 'Entrambe le squadre devono essere pronte per iniziare la partita',
                squadra1_pronta: partita.squadra1_pronta,
                squadra2_pronta: partita.squadra2_pronta
            });
        }

        // 5️⃣ Recupera le rose delle due squadre
        const rosa1 = await db.getRosaBySquadraId(partita.id_squadra_1);
        const rosa2 = await db.getRosaBySquadraId(partita.id_squadra_2);

        // 6️⃣ Prepara i dati per OpenAI
        const squadra1Data = {
            id: partita.id_squadra_1,
            nome: partita.nome_squadra_1,
            rosa: rosa1
        };

        const squadra2Data = {
            id: partita.id_squadra_2,
            nome: partita.nome_squadra_2,
            rosa: rosa2
        };

        console.log(`⚽ Avvio simulazione partita ${id_partita}: ${partita.nome_squadra_1} vs ${partita.nome_squadra_2}`);

        // 7️⃣ Chiama OpenAI per simulare la partita
        const risultato = await openaiService.simulateMatch(
            squadra1Data,
            squadra2Data,
            partita.tattica_squadra_1,
            partita.tattica_squadra_2
        );

        // 8️⃣ Salva il risultato nel database
        await db.updateMatchResult(id_partita, risultato);

        // 9️⃣ Salva la timeline
        await db.insertMatchTimeline(id_partita, risultato.azioni);

        console.log(`✅ Partita ${id_partita} completata: ${risultato.gol_squadra_1}-${risultato.gol_squadra_2}`);

        // 🔟 Restituisci il risultato completo
        res.json({
            success: true,
            partita: {
                id_partita,
                gol_squadra_1: risultato.gol_squadra_1,
                gol_squadra_2: risultato.gol_squadra_2,
                marcatori: risultato.marcatori
            },
            azioni: risultato.azioni
        });

    } catch (err) {
        console.error('❌ Errore avvio partita:', err);

        if (err.message && err.message.includes('OpenAI')) {
            return res.status(503).json({
                error: 'Errore nel servizio di simulazione partita',
                details: err.message
            });
        }

        res.status(500).json({ error: 'Errore server', details: err.message });
    }
});

// ==========================================
// FALLBACK - Serve index.html per tutte le altre routes
// ==========================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ==========================================
// SERVER START
// ==========================================
const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║            CALCIO SQL - API SERVER                    ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Server in ascolto su porta ${PORT}`);
  console.log(`📡 API disponibile su: http://localhost:${PORT}/api`);
  console.log(`🔐 Database: PostgreSQL ${process.env.DB_NAME || 'calcio_sql'}`);
  console.log('');
  console.log('📋 Endpoints disponibili:');
  console.log('   GET  /health                       - Health check');
  console.log('   POST /api/calcio/init              - Init squadra');
  console.log('   GET  /api/calcio/rosa/:email       - Rosa squadra');
  console.log('   POST /api/calcio/query             - Esegui DML');
  console.log('   GET  /api/calcio/partite/:email    - Partite per utente');
  console.log('   GET  /api/calcio/partita/:id       - Dettagli partita');
  console.log('   GET  /api/calcio/partita/:id/timeline - Timeline partita');
  console.log('   POST /api/calcio/partita/start     - Avvia simulazione');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM ricevuto, chiusura graceful...');
  server.close(async () => {
    await db.closePool();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT ricevuto, chiusura graceful...');
  server.close(async () => {
    await db.closePool();
    process.exit(0);
  });
});

module.exports = app;
