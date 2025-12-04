# ⚡ Quick Start - Calcio SQL

## 🚀 Avvio Rapido (3 passi)

### 1. Avvia l'applicazione

**Windows:**
```cmd
start.bat
```

**Linux/Mac:**
```bash
./start.sh
```

**Oppure con Docker Compose:**
```bash
docker-compose up -d
```

### 2. Apri il browser

Vai su: **http://localhost:3000**

### 3. Inizia a giocare!

1. Inserisci email e nome squadra
2. Scrivi `help` nel terminale per vedere i comandi
3. Usa query SQL per costruire la tua squadra

---

## 📝 Prime Query da Provare

### Vedi i giocatori disponibili
```sql
SELECT * FROM giocatori WHERE ingaggiato = FALSE;
```

### Ingaggia un giocatore (cambia gli ID)
```sql
INSERT INTO squadra_giocatori (id_squadra, id_giocatore)
VALUES (1, 5);
```

### Vedi la tua rosa
```sql
roster
```

### Crea una partita contro un'altra squadra
```sql
INSERT INTO partite (id_squadra_1, id_squadra_2, data)
VALUES (1, 2, NOW());
```

### Imposta tattica e dichiarati pronto
```sql
-- Imposta tattica
UPDATE partite
SET tattica_squadra_1 = '4-3-3'
WHERE id_partita = 1 AND id_squadra_1 = 1;

-- Dichiara pronto
UPDATE partite
SET squadra1_pronta = TRUE
WHERE id_partita = 1 AND id_squadra_1 = 1;
```

---

## 🛑 Stop Applicazione

```bash
docker-compose down
```

---

## 🔧 Risoluzione Problemi

### L'applicazione non parte
1. Verifica che Docker sia avviato
2. Controlla che le porte 3000 e 5433 siano libere
3. Guarda i log: `docker-compose logs`

### Reset completo
```bash
docker-compose down -v
docker-compose up -d
```

---

## 📚 Documentazione Completa

Vedi **README.md** per la documentazione completa.

---

**Buon divertimento! ⚽**
