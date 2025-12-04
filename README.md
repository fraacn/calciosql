# ⚽ Calcio SQL - Esercizi DML Interattivi

Applicazione web interattiva per imparare SQL attraverso la gestione di una squadra di calcio. Gli studenti possono eseguire query INSERT, DELETE e UPDATE per costruire la propria rosa di giocatori e sfidare altre squadre.

## 📋 Caratteristiche

- **Gestione Rosa**: Ingaggia e cedi giocatori usando query SQL
- **Budget Management**: Gestisci un budget di €150M per costruire la tua squadra
- **Sistema di Partite**: Crea partite contro altre squadre e simula i match
- **Cronaca Live**: Visualizza la cronaca delle partite in tempo reale
- **Simulazione AI**: Le partite possono essere simulate con OpenAI o con un motore locale
- **Terminale Interattivo**: Console SQL con cronologia comandi e validazione query
- **Trigger Database**: Vincoli e trigger PostgreSQL per validare le operazioni

## 🏗️ Architettura

```
calciosql/
├── backend/
│   ├── src/
│   │   ├── server.js           # Server Express principale
│   │   ├── db.js                # Connessione PostgreSQL e query
│   │   ├── config.js            # Configurazione OpenAI
│   │   ├── promptConfig.js      # Template prompt per simulazione
│   │   └── openaiService.js     # Servizio simulazione partite
│   ├── sql/
│   │   ├── 01_schema.sql        # Schema database
│   │   ├── 02_data.sql          # Dati iniziali (giocatori)
│   │   └── init.sql             # Script inizializzazione
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── frontend/
│   └── index.html               # Single Page Application (React)
├── docker-compose.yml
└── README.md
```

## 🚀 Quick Start

### Prerequisiti

- Docker e Docker Compose installati
- (Opzionale) Chiave API OpenAI per simulazioni avanzate

### Installazione

1. **Clona o copia il progetto**
   ```bash
   cd calciosql
   ```

2. **Configura le variabili d'ambiente** (opzionale)
   ```bash
   cd backend
   cp .env.example .env
   # Modifica .env se vuoi usare OpenAI
   ```

3. **Avvia i container**
   ```bash
   cd ..
   docker-compose up -d
   ```

4. **Verifica che i servizi siano attivi**
   ```bash
   docker-compose ps
   docker-compose logs backend
   ```

5. **Apri l'applicazione**

   Apri il browser su: http://localhost:3000

### Stop e Cleanup

```bash
# Ferma i container
docker-compose down

# Ferma e rimuovi i volumi (ATTENZIONE: cancella il database)
docker-compose down -v
```

## 🎮 Come Giocare

### 1. Crea la tua squadra

- Inserisci la tua email e il nome della squadra
- Riceverai un ID squadra e un budget di €150M

### 2. Costruisci la rosa

Usa query SQL per ingaggiare giocatori:

```sql
-- Visualizza tutti i giocatori disponibili
SELECT * FROM giocatori WHERE ingaggiato = FALSE;

-- Ingaggia un giocatore (sostituisci 1 con il tuo ID squadra)
INSERT INTO squadra_giocatori (id_squadra, id_giocatore)
VALUES (1, 5);

-- Cedi un giocatore
DELETE FROM squadra_giocatori
WHERE id_squadra = 1 AND id_giocatore = 5;

-- Visualizza la tua rosa
roster
```

### 3. Crea una partita

```sql
-- Crea una sfida contro un'altra squadra
INSERT INTO partite (id_squadra_1, id_squadra_2, data)
VALUES (1, 2, NOW());

-- Imposta la tattica
UPDATE partite
SET tattica_squadra_1 = '4-3-3'
WHERE id_partita = 100 AND id_squadra_1 = 1;

-- Dichiara che sei pronto
UPDATE partite
SET squadra1_pronta = TRUE
WHERE id_partita = 100 AND id_squadra_1 = 1;
```

### 4. Avvia la partita

Quando entrambe le squadre sono pronte, clicca su "FISCHIO D'INIZIO" per avviare la simulazione.

## 📊 Schema Database

### Tabelle Principali

**squadre_iscritte**
- `id` - ID squadra
- `email_presidente` - Email utente
- `nome_squadra` - Nome della squadra
- `budget` - Budget massimo (default: 150.00)

**giocatori**
- `id` - ID giocatore
- `nome_completo` - Nome del giocatore
- `ruolo` - Portiere, Difensore, Centrocampista, Attaccante
- `valore` - Valore in milioni di €
- `ingaggiato` - Flag se è già ingaggiato

**squadra_giocatori**
- `id` - ID relazione
- `id_squadra` - Riferimento squadra
- `id_giocatore` - Riferimento giocatore

**partite**
- `id_partita` - ID partita
- `id_squadra_1`, `id_squadra_2` - Squadre che si sfidano
- `tattica_squadra_1`, `tattica_squadra_2` - Tattiche
- `squadra1_pronta`, `squadra2_pronta` - Flag pronti
- `gol_squadra_1`, `gol_squadra_2` - Risultato
- `terminata` - Flag partita terminata

**timeline_partita**
- `id_tabellino` - ID azione
- `id_partita` - Riferimento partita
- `minuto_azione` - Minuto dell'azione
- `tipo_azione` - Tipo (Goal, Tiro, Corner, ecc.)
- `descrizione_azione` - Descrizione dettagliata

### Trigger e Vincoli

Il database implementa diversi trigger per garantire l'integrità:

- **Budget Check**: Verifica che la somma dei valori dei giocatori non superi il budget
- **Disponibilità Giocatore**: Verifica che un giocatore non sia già ingaggiato
- **Auto-update Ingaggiato**: Aggiorna automaticamente il flag `ingaggiato`

## 🔌 API Endpoints

### Squadre
- `POST /api/calcio/init` - Crea o recupera squadra
- `GET /api/calcio/rosa/:email` - Ottieni rosa squadra

### Query SQL
- `POST /api/calcio/query` - Esegui query SQL (INSERT/DELETE/UPDATE/SELECT)

### Partite
- `GET /api/calcio/partite/:email` - Lista partite
- `GET /api/calcio/partita/:id` - Dettagli partita
- `GET /api/calcio/partita/:id/timeline` - Timeline partita
- `POST /api/calcio/partita/start` - Avvia simulazione

### Health
- `GET /health` - Health check

## ⚙️ Configurazione

### Variabili d'ambiente (.env)

```env
# Database
DB_HOST=db
DB_PORT=5432
DB_NAME=calcio_sql
DB_USER=calcio_user
DB_PASSWORD=calcio_pass

# Server
PORT=3000
FRONTEND_URL=http://localhost:3000

# OpenAI (opzionale)
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4
```

### Modalità Simulazione

L'applicazione supporta due modalità di simulazione partite:

1. **OpenAI Mode** (consigliato): Simulazioni realistiche con cronache dettagliate
   - Richiede `OPENAI_API_KEY` configurata
   - Usa GPT-4 per generare partite uniche

2. **Fallback Locale**: Simulazioni semplici con eventi casuali
   - Automatico se OpenAI non è disponibile
   - Nessuna configurazione necessaria

## 🐛 Troubleshooting

### Il database non si inizializza
```bash
# Controlla i log
docker-compose logs db

# Rimuovi i volumi e ricrea
docker-compose down -v
docker-compose up -d
```

### Backend non si connette al database
```bash
# Verifica che il database sia healthy
docker-compose ps

# Controlla i log del backend
docker-compose logs backend
```

### Le partite non si avviano
- Verifica che entrambe le squadre abbiano almeno 11 giocatori
- Controlla che entrambe le squadre siano "pronte"
- Se usi OpenAI, verifica che la chiave API sia valida

## 📝 Comandi Utili

### Terminale SQL Interattivo

- `help` - Mostra lista comandi
- `team` - Info squadra
- `roster` - Mostra rosa
- `budget` - Mostra budget residuo
- `clear` - Pulisci terminale

### Docker Compose

```bash
# Avvia in background
docker-compose up -d

# Visualizza log in tempo reale
docker-compose logs -f

# Riavvia un servizio
docker-compose restart backend

# Accedi al database
docker-compose exec db psql -U calcio_user -d calcio_sql

# Backup database
docker-compose exec db pg_dump -U calcio_user calcio_sql > backup.sql
```

## 🎓 Obiettivi Didattici

Questa applicazione insegna:

- **SQL DML**: INSERT, DELETE, UPDATE, SELECT
- **Vincoli e Trigger**: Integrità referenziale, check constraints
- **Transazioni**: Operazioni atomiche
- **Query Complesse**: JOIN, aggregazioni, subquery
- **Gestione Errori**: Gestione errori SQL e validazione

## 📄 Licenza

MIT License - Libero per uso educativo e commerciale

## 🤝 Contributi

Questo è un progetto educativo. Sentiti libero di modificarlo per le tue esigenze!

## 📞 Supporto

Per problemi o domande, apri un issue nel repository o contatta il maintainer.

---

**Buon divertimento con Calcio SQL! ⚽🎮**
