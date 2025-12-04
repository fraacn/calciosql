// ============================================
// db.js
// Connessione PostgreSQL per database CALCIO_SQL
// ============================================

const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'db',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'calcio_sql',
    user: process.env.DB_USER || 'calcio_user',
    password: process.env.DB_PASSWORD || 'calcio_pass',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Log connessione
pool.on('connect', () => {
    console.log('✅ Connesso a PostgreSQL (database: calcio_sql)');
});

pool.on('error', (err) => {
    console.error('❌ Errore connessione PostgreSQL (calcio_sql):', err);
});

// Funzione query
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        return res;
    } catch (error) {
        console.error('❌ Errore query CALCIO_SQL:', error);
        throw error;
    }
}

// Chiusura pool (per graceful shutdown)
async function closePool() {
    await pool.end();
    console.log('🔒 Pool PostgreSQL (calcio_sql) chiuso');
}

// ============================================
// FUNZIONI HELPER PER LE PARTITE
// ============================================

/**
 * Ottiene tutte le partite con dettagli delle squadre
 * @param {string} email - Email del presidente
 */
async function getMatches(email) {
    const result = await query(`
    SELECT
      p.*,
      s1.nome_squadra as nome_squadra_1,
      s2.nome_squadra as nome_squadra_2
    FROM partite p
    JOIN squadre_iscritte s1 ON p.id_squadra_1 = s1.id
    JOIN squadre_iscritte s2 ON p.id_squadra_2 = s2.id
    WHERE s1.email_presidente = $1 OR s2.email_presidente = $1
    ORDER BY p.data DESC
  `, [email]);

    return result.rows;
}

/**
 * Ottiene i dettagli di una partita specifica
 * @param {number} idPartita - ID della partita
 */
async function getMatchDetails(idPartita) {
    const result = await query(`
    SELECT
      p.*,
      s1.nome_squadra as nome_squadra_1,
      s2.nome_squadra as nome_squadra_2,
      s1.email_presidente as email_presidente_1,
      s2.email_presidente as email_presidente_2
    FROM partite p
    JOIN squadre_iscritte s1 ON p.id_squadra_1 = s1.id
    JOIN squadre_iscritte s2 ON p.id_squadra_2 = s2.id
    WHERE p.id_partita = $1
  `, [idPartita]);

    return result.rows[0];
}

/**
 * Ottiene la rosa di una squadra per ID squadra
 * @param {number} idSquadra - ID della squadra
 */
async function getRosaBySquadraId(idSquadra) {
    const result = await query(`
    SELECT g.id, g.nome_completo, g.ruolo, g.valore, g.ingaggiato
    FROM giocatori g
    JOIN squadra_giocatori sg ON sg.id_giocatore = g.id
    WHERE sg.id_squadra = $1
  `, [idSquadra]);

    return result.rows;
}

/**
 * Ottiene la timeline di una partita
 * @param {number} idPartita - ID della partita
 */
async function getMatchTimeline(idPartita) {
    const result = await query(`
    SELECT *
    FROM timeline_partita
    WHERE id_partita = $1
    ORDER BY minuto_azione ASC
  `, [idPartita]);

    return result.rows;
}

/**
 * Inserisce le azioni nella timeline
 * @param {number} idPartita - ID della partita
 * @param {Array} azioni - Array di azioni
 */
async function insertMatchTimeline(idPartita, azioni) {
    const values = azioni.map(a =>
        `(${idPartita}, ${a.minuto}, '${a.tipo.replace(/'/g, "''")}', '${a.descrizione.replace(/'/g, "''")}')`
    ).join(',');

    const result = await query(`
    INSERT INTO timeline_partita (id_partita, minuto_azione, tipo_azione, descrizione_azione)
    VALUES ${values}
  `);

    return result;
}

/**
 * Aggiorna il risultato della partita
 * @param {number} idPartita - ID della partita
 * @param {Object} risultato - Risultato della partita
 */
async function updateMatchResult(idPartita, risultato) {
    const result = await query(`
    UPDATE partite
    SET
      gol_squadra_1 = $1,
      gol_squadra_2 = $2,
      marcatori = $3,
      terminata = true
    WHERE id_partita = $4
  `, [risultato.gol_squadra_1, risultato.gol_squadra_2, risultato.marcatori, idPartita]);

    return result;
}

module.exports = {
    query,
    pool,
    closePool,
    getMatches,
    getMatchDetails,
    getRosaBySquadraId,
    getMatchTimeline,
    insertMatchTimeline,
    updateMatchResult
};
