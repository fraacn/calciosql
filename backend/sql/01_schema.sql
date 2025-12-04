-- ============================================
-- CALCIO SQL - Database Schema
-- ============================================

-- 1. Tabella squadre iscritte
CREATE TABLE IF NOT EXISTS squadre_iscritte (
    id SERIAL PRIMARY KEY,
    email_presidente VARCHAR(100) UNIQUE NOT NULL,
    nome_squadra VARCHAR(100) NOT NULL,
    budget NUMERIC(10,2) DEFAULT 150.00
);

-- 2. Tabella giocatori
CREATE TABLE IF NOT EXISTS giocatori (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(100) NOT NULL,
    ruolo VARCHAR(30) CHECK (ruolo IN ('Portiere', 'Difensore', 'Centrocampista', 'Attaccante')),
    valore NUMERIC(10,2) NOT NULL,
    ingaggiato BOOLEAN DEFAULT FALSE
);

-- 3. Tabella squadra_giocatori (relazione many-to-many)
CREATE TABLE IF NOT EXISTS squadra_giocatori (
    id SERIAL PRIMARY KEY,
    id_squadra INT REFERENCES squadre_iscritte(id) ON DELETE CASCADE,
    id_giocatore INT REFERENCES giocatori(id) ON DELETE CASCADE,
    UNIQUE(id_squadra, id_giocatore)
);

-- 4. Tabella partite
CREATE TABLE IF NOT EXISTS partite (
    id_partita SERIAL PRIMARY KEY,
    id_squadra_1 INT REFERENCES squadre_iscritte(id) ON DELETE CASCADE,
    id_squadra_2 INT REFERENCES squadre_iscritte(id) ON DELETE CASCADE,
    data TIMESTAMP DEFAULT NOW(),
    tattica_squadra_1 VARCHAR(50) DEFAULT 'equilibrata',
    tattica_squadra_2 VARCHAR(50) DEFAULT 'equilibrata',
    squadra1_pronta BOOLEAN DEFAULT FALSE,
    squadra2_pronta BOOLEAN DEFAULT FALSE,
    gol_squadra_1 INT DEFAULT 0,
    gol_squadra_2 INT DEFAULT 0,
    marcatori TEXT,
    terminata BOOLEAN DEFAULT FALSE,
    CHECK (id_squadra_1 <> id_squadra_2)
);

-- 5. Tabella timeline partita
CREATE TABLE IF NOT EXISTS timeline_partita (
    id_tabellino SERIAL PRIMARY KEY,
    id_partita INT REFERENCES partite(id_partita) ON DELETE CASCADE,
    minuto_azione INT NOT NULL CHECK (minuto_azione >= 0 AND minuto_azione <= 120),
    tipo_azione VARCHAR(50) NOT NULL,
    descrizione_azione TEXT NOT NULL
);

-- ============================================
-- TRIGGER E FUNZIONI
-- ============================================

-- Trigger: imposta ingaggiato = TRUE su insert in squadra_giocatori
CREATE OR REPLACE FUNCTION set_ingaggiato_true()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE giocatori SET ingaggiato = TRUE WHERE id = NEW.id_giocatore;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ingaggio ON squadra_giocatori;
CREATE TRIGGER trg_ingaggio
    AFTER INSERT ON squadra_giocatori
    FOR EACH ROW
    EXECUTE FUNCTION set_ingaggiato_true();

-- Trigger: imposta ingaggiato = FALSE su delete da squadra_giocatori
CREATE OR REPLACE FUNCTION set_ingaggiato_false()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE giocatori SET ingaggiato = FALSE WHERE id = OLD.id_giocatore;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cessione ON squadra_giocatori;
CREATE TRIGGER trg_cessione
    AFTER DELETE ON squadra_giocatori
    FOR EACH ROW
    EXECUTE FUNCTION set_ingaggiato_false();

-- Trigger: verifica che il giocatore non sia già ingaggiato
CREATE OR REPLACE FUNCTION check_giocatore_disponibile()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM squadra_giocatori
        WHERE id_giocatore = NEW.id_giocatore
        AND id_squadra <> NEW.id_squadra
    ) THEN
        RAISE EXCEPTION 'Giocatore già ingaggiato da un''altra squadra';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_disponibilita ON squadra_giocatori;
CREATE TRIGGER trg_check_disponibilita
    BEFORE INSERT ON squadra_giocatori
    FOR EACH ROW
    EXECUTE FUNCTION check_giocatore_disponibile();

-- Trigger: verifica budget squadra
CREATE OR REPLACE FUNCTION check_budget_squadra()
RETURNS TRIGGER AS $$
DECLARE
    totale_ingaggi NUMERIC(10,2);
    budget_max NUMERIC(10,2);
BEGIN
    SELECT budget INTO budget_max
    FROM squadre_iscritte
    WHERE id = NEW.id_squadra;

    SELECT COALESCE(SUM(g.valore), 0) INTO totale_ingaggi
    FROM giocatori g
    JOIN squadra_giocatori sg ON sg.id_giocatore = g.id
    WHERE sg.id_squadra = NEW.id_squadra;

    -- Aggiungi il valore del nuovo giocatore
    SELECT totale_ingaggi + g.valore INTO totale_ingaggi
    FROM giocatori g
    WHERE g.id = NEW.id_giocatore;

    IF totale_ingaggi > budget_max THEN
        RAISE EXCEPTION 'Budget superato: totale ingaggi (%) supera il budget massimo (%)', totale_ingaggi, budget_max;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_budget ON squadra_giocatori;
CREATE TRIGGER trg_check_budget
    BEFORE INSERT ON squadra_giocatori
    FOR EACH ROW
    EXECUTE FUNCTION check_budget_squadra();

-- Indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_squadra_giocatori_squadra ON squadra_giocatori(id_squadra);
CREATE INDEX IF NOT EXISTS idx_squadra_giocatori_giocatore ON squadra_giocatori(id_giocatore);
CREATE INDEX IF NOT EXISTS idx_giocatori_ingaggiato ON giocatori(ingaggiato);
CREATE INDEX IF NOT EXISTS idx_partite_squadre ON partite(id_squadra_1, id_squadra_2);
CREATE INDEX IF NOT EXISTS idx_partite_terminata ON partite(terminata);
CREATE INDEX IF NOT EXISTS idx_timeline_partita ON timeline_partita(id_partita);
